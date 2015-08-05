define([
	'jquery',
	'knockout',

	'Utils',
], function($, ko, Utils){

	function Entity(data){

		//Init
		var self = this;
		data = data || {};

		this.init = function(data){

			self.nextRoundAction = ko.observable(undefined);
			self.nextRoundActionType = ko.observable(undefined);

			self.maxHp = ko.observable(data.maxHp || 5);
			self.hp = ko.observable(data.hp || 5);
			self.armor = ko.observable(data.armor || 0);
			self.speed = ko.observable(data.speed || 1);
			self.minDmg = ko.observable(data.minDmg || 1);
			self.maxDmg = ko.observable(data.maxDmg || 2);

			self.activeEffects = ko.observable({

			});

			self.passiveEffects = ko.observableArray(data.passiveEffects || []);

			self.isDead = ko.computed(function(){
				return self.hp() < 1;
			});

		}

		this.attacks = {

			basic : {
				numAttacks : 1,
				chanceToHit : 1,
				chanceToCrit : 0,
				dmgModifier : 1,
				onHitEffect : {

				},
				onMissEffect : {

				},
				baseCooldown : 0
			},
			flurry : {
				numAttacks : 3,
				chanceToHit : 1,
				chanceToCrit : 0,
				dmgModifier : 0.3,
				onHitEffect : function(hitData){

				},
				onMissEffect : {

				},
				baseCooldown : 2
			},
			/*flurry_improved : {
				numAttacks : 3,
				chanceToHit : 0.3,
				chanceToCrit : 0,
				dmgModifier : 2.0,
				onHitEffect : {

				},
				onMissEffect : {

				},
				baseCooldown : 0
			},*/
			mighty : {
				numAttacks : 1,
				chanceToHit : 0.5,
				chanceToCrit : 0,
				dmgModifier : 3.0,
				onHitEffect : {

				},
				onMissEffect : {

				},
				baseCooldown : 2
			},
			stun : {
				numAttacks : 1,
				chanceToHit : 0.5,
				chanceToCrit : 0,
				dmgModifier : 0.5,
				onHitEffect : {

				},
				onMissEffect : {

				},
				baseCooldown : 3
			}

		}

		this.calculateActualDmg = function(dmg){

			var coefficientOfDmgToTake,
				dmgTaken;

			//What % of our AC is the DMG?
			var percentOfArmorDmgIs = Math.round((dmg / self.armor()) * 100);

			if( percentOfArmorDmgIs < 100 ){

				if( percentOfArmorDmgIs <= 25 ){
					coefficientOfDmgToTake = 0;
				}else{
					coefficientOfDmgToTake = (50 - (((100 - percentOfArmorDmgIs) * 0.66))) / 100;
				}

			}else if( percentOfArmorDmgIs > 100 ){

				if(percentOfArmorDmgIs >= 200){
					coefficientOfDmgToTake = 1;
				}else{
					coefficientOfDmgToTake = 1 + (((100 - percentOfArmorDmgIs) * 0.5) / 100)
				}

			}else {
				coefficientOfDmgToTake = 0.5;
			}

			dmgTaken = Math.round(dmg * coefficientOfDmgToTake);

			return dmgTaken;
		}

		this.takeCombatAction = function(action, target, game){

			var actionType = action.actionType;

			if(actionType == 'attack'){

				var attackName = action.actionName;

				self.makeAttack(attackName, target, game);


			}else if(actionType == 'ability'){

				//Figure this out later

			}else if(actionType == 'item'){

				//Figure this out later too!

			}

		}

		this.makeAttack = function(attackName, target, game){

			var attackData = this.attacks[attackName];

			var numAttacks = attackData.numAttacks;
			var chanceToHit = attackData.chanceToHit;
			var chanceToCrit = attackData.chanceToCrit;
			var dmgModifier = attackData.dmgModifier;
			var onHitEffect = attackData.onHitEffect;
			var onMissEffect = attackData.onMissEffect;
			var baseCooldown = attackData.baseCooldown;

			for(var i = 1; i <= numAttacks; i++){

				var attackResults = Array();
				var hitRoll = Utils.doRand(1, 101);
				var didHit = (hitRoll <= (chanceToHit * 100)) ? true : false ;
				var hitType = "hit";
				var dmgObject = {
					dmgDealt : 0,
					didCrit : 0,
					dmgModifier : dmgModifier
				}

				if(didHit){
					var critRoll = Utils.doRand(1, 101);
					var didCrit = (critRoll <= (chanceToCrit * 100)) ? true : false ;

					if(didCrit){
						dmgObject.dmgDealt = self.maxDmg();
						hitType = "crit";
					}else{
						dmgObject.dmgDealt = Utils.doRand( self.minDmg(), (self.maxDmg() + 1) );
					}

					//Yes, we're making assumptions for now
					dmgObject.dmgDealt += self.hasWeapon() ? self.getEquippedWeapon().extraDamage() : 0 ;

					dmgObject.dmgDealt = dmgObject.dmgDealt * dmgObject.dmgModifier;

				}else{
					hitType = "miss";
				}

				var actualDmg = target.calculateActualDmg(dmgObject.dmgDealt);

				attackResults = {
					attemptedDmg : dmgObject.dmgDealt,
					actualDmg : actualDmg,
					hitType : hitType,
					attackType : attackName,
				};

				target.takeDmg(actualDmg);

				//Register the attack
				game.registerAttack(self, target, attackResults);
			}

		}

		this.takeDmg = function(dmg){
			self.hp( self.hp() - dmg );
			return self.hp();
		}

		this.hasArmor = function(){
			return false;
		}

		this.hasWeapon = function(){
			return false;
		}

		this.getEquippedWeapon = function(){
			return false;
		}

		self.init(data);
	}

	Entity.prototype.constructor = Entity;

	return Entity;

});
