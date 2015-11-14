define([
	'jquery',
	'knockout',
	'classes/LevelableAbility',
	'classes/DataCollection',
	'classes/CombatEffect',

	'json!data/skills.json',
	'Utils'
], function($, ko, LevelableAbility, DataCollection, CombatEffect, skillDataFile, Utils){

	function CombatAbility(data){

		var self = this;

		LevelableAbility.call(this, data);

		this.init = function(data){

			self.skillDataCollection = new DataCollection(skillDataFile);

			self.className = data.className;
			self.buttonLabel = data.buttonLabel || self.name;
			self.numAttempts = data.numAttempts || 1;
			/*self.chanceToHit = data.chanceToHit || undefined;
			self.chanceToCrit = data.chanceToCrit || undefined;*/
			self.dmg = data.dmg || undefined;
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

		}

		this.init(data);

		this.onHit = function(combatData){
			//Can be overridden by child
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
					dmgObject.dmgDealt += attacker.hasWeapon() ? attacker.getEquippedWeapon().extraDamage() : 0 ;

					if( defender.hasActiveCombatEffect("cracked") ){
						dmgObject.dmgDealt = Math.round(dmgObject.dmgDealt * 1.2);
					}

					//Calculate the actual damage done to the target, applying any armor/other mitigation effects
					actualDmg = defender.calculateActualDmg(dmgObject.dmgDealt, game.level().levelNum());

				}else{
					hitType = "miss";
				}

				abilityResults = {
					attemptedDmg : dmgObject.dmgDealt,
					actualDmg : actualDmg,
					hitType : hitType,
					attackType : self.name,
				};

				//Apply our actual damage amount to the defender (if any damage should be received)
				if(actualDmg > 0){
					defender.takeDmg(actualDmg);
				}

				//Set the ability on cooldown if applicable
				self.cooldown(self.baseCooldown);

				//Register the attack
				game.registerAttack(attacker, defender, abilityResults);

				if(hitType == "hit"){
					combatEffectToApply = self.applyCombatEffectOnHit;
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

	}

	CombatAbility.prototype = Object.create(LevelableAbility.prototype);
	CombatAbility.prototype.constructor = CombatAbility;

	return CombatAbility;
});