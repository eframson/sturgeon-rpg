define([
	'jquery',
	'knockout',
	'classes/UsableAbility',
	'classes/DataCollection',
	'classes/CombatEffect',

	'json!data/skills.json',
	'Utils'
], function($, ko, UsableAbility, DataCollection, CombatEffect, skillDataFile, Utils){

	function CombatAbility(data){

		var self = this;

		UsableAbility.call(this, data);

		this.noExportProps.push("skillDataCollection");

		this.init = function(data){

			self.skillDataCollection = new DataCollection(skillDataFile);

			self.className = data.className;
			self.buttonLabel = data.buttonLabel || self.name;
			self.numAttempts = data.numAttempts || 1;
			/*self.chanceToHit = data.chanceToHit || undefined;
			self.chanceToCrit = data.chanceToCrit || undefined;*/
			self.dmg = data.dmg || undefined;
			self.staggerDmg = data.staggerDmg || 0.0;
			self.ultCharge = data.ultCharge || 0;
			self.pctHPDmg = data.pctHPDmg || (1 - self.staggerDmg);
			self.dmgCoefficient = data.dmgCoefficient !== undefined ? data.dmgCoefficient : 1;
			self.chanceToHitCoefficient = data.chanceToHitCoefficient || 1;
			self.chanceToCritCoefficient = data.chanceToCritCoefficient || 1;
			self.baseCooldown = data.baseCooldown || 0;
			self.cooldown = ko.observable(data.cooldown || 0);
			self.applyCombatEffectOnHit = data.applyCombatEffectOnHit || undefined;
			self.applyCombatEffectOnCrit = data.applyCombatEffectOnCrit || undefined;
			self.applyCombatEffectOnMiss = data.applyCombatEffectOnMiss || undefined;
			self.sortOrder = data.sortOrder;
			self.showLevelInformation = ko.observable(data.showLevelInformation !== undefined ? data.showLevelInformation : 1);
			self.attackType = data.attackType;

		}

		this.init(data);

		this.onHit = function(combatData){
			//Can be overridden by child
			return true;
		}

		this.doAfterHit = function(attacker, defender){
			return true;
		}

		this.doAbility = function(attacker, defender, game){

			var i;
			for(i = 0; i < self.numAttempts; i++){

				var abilityResults = {};
				var dmgObject = {
					dmgDealt : 0,
					didCrit : 0,
					dmgCoefficient : self.dmgCoefficient,
				};
				var hitType = "hit";
				var actualDmg = 0;
				var didCrit = 0;
				var combatEffectToApply = undefined;

				var hitRoll = Math.round(Utils.doRand(1, 101) * self.chanceToHitCoefficient);
				var critRoll = Math.round(Utils.doRand(1, 101) * self.chanceToCritCoefficient);
				var didHit = (hitRoll <= attacker.chanceToHit()) ? true : false ;

				if(didHit){

					//See if we crit
					didCrit = (critRoll <= attacker.chanceToCrit()) ? true : false ;

					if(didCrit){
						//If a crit, do max damage
						dmgObject.dmgDealt = attacker.maxDmg();
						hitType = "crit";
					}else{
						//No crit, so just roll for dmg between min and max values
						dmgObject.dmgDealt = Utils.doRand( attacker.minDmg(), (attacker.maxDmg() + 1) );
					}

					//Multiply our damage value by the attacker's damage coefficient
					dmgObject.dmgDealt = dmgObject.dmgDealt * attacker.dmgCoefficient();

					//Pass the damage object to the ability's on hit function so it can fiddle with damage if it wants
					self.onHit(dmgObject);

					//Multiply the damage value by the ability's damage coefficient
					dmgObject.dmgDealt = dmgObject.dmgDealt * dmgObject.dmgCoefficient;

					//Always round the damage value up
					dmgObject.dmgDealt = Math.ceil(dmgObject.dmgDealt);

					//Add any +x damage from the attacker's equipped weapon
					//@TODO get rid of the "extra damage" concept, unfortunately
					dmgObject.dmgDealt += attacker.hasWeapon() ? attacker.getEquippedWeapon().extraDamage() : 0 ;

					//As we introduce staggering mechanics, keep it simple for now
					/*if( defender.hasActiveCombatEffect("cracked") ){
						dmgObject.dmgDealt = Math.round(dmgObject.dmgDealt * 1.2);
					}*/

					//Calculate the actual damage done to the target, applying any armor/other mitigation effects
					//This is where the player has damage reduced
					actualDmg = defender.calculateActualDmg(dmgObject.dmgDealt, game.level().levelNum(), self.attackType);

				}else{
					hitType = "miss";
				}

				abilityResults = {
					attemptedDmg : dmgObject.dmgDealt,
					actualDmg : actualDmg,
					hitType : hitType,
					attackType : self.name,
				};

				//For now let's just forget about armor...
				//Attempted HP dmg = attempted dmg * pct of HP dmg done by ability (rounded)
				//Attempted stagger dmg = attempted dmg * pct of stagger dmg done by ability (rounded)
				//If monster is staggered, monster takes full HP dmg (or more than full???)
				//If monster is not staggered, monster takes less HP dmg (varies by monster?)

				//Apply our actual damage amount to the defender (if any damage should be received)
				var staggerEffect;
				if(actualDmg > 0){
					var hpDmg = Math.round(self.pctHPDmg * actualDmg);
					var staggerDmg = Math.round(self.staggerDmg * actualDmg);
					//This is where monsters have damage reduced
					staggerEffect = defender.takeDmg(hpDmg, staggerDmg);
				}
				if(staggerEffect){
					//An enemy was just hit, and it was staggered
					game.registerCombatEffectApplication(attacker, defender, staggerEffect);
				}
				//@TODO This is pretty screwy, we should fix it...
				if(staggerEffect || staggerEffect == false){
					abilityResults.attemptedDmg = actualDmg;
					abilityResults.actualDmg = hpDmg;
				}

				//Set the ability on cooldown if applicable
				self.cooldown(self.baseCooldown);

				//Register the attack
				game.registerAttack(attacker, defender, abilityResults);

				if(hitType == "hit"){
					combatEffectToApply = self.applyCombatEffectOnHit;
					self.doAfterHit(attacker, defender);
				}else if(hitType == "crit"){
					combatEffectToApply = self.applyCombatEffectOnCrit;
				}else{
					combatEffectToApply = self.applyCombatEffectOnMiss;
				}

				if(combatEffectToApply){
					combatEffectToApply = new CombatEffect(self.skillDataCollection.getNode(["combat_effects", combatEffectToApply]));
					defender.applyCombatEffect(combatEffectToApply);
					game.registerCombatEffectApplication(attacker, defender, combatEffectToApply);
				}
			}
		}

		this.isHeavyAttack = function(){
			return (self.attackType == "heavy") ? true : false ;
		}

		this.isLightAttack = function(){
			return (self.attackType == "light") ? true : false ;
		}

		this.isBasicAttackType = function(){
			return (self.attackType == undefined) ? true : false ;
		}

	}

	CombatAbility.prototype = Object.create(UsableAbility.prototype);
	CombatAbility.prototype.constructor = CombatAbility;

	return CombatAbility;
});