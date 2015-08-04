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

			var numAttacks = 1;
			var chanceToHit = 1.0;
			var chanceToCrit = 0.0;
			var dmgModifier = 1.0;

			//We'll definitely have to implement usage of base entity stats here

			/*
			Flurry of Blows: 3x attacks, 30% chance to hit, 200% of normal dmg, 3 rd cooldown
Mighty Strike: 1x attack, 50% chance to hit, 300% of normal dmg, 2 rd cooldown
Gut Punch: 1x attack, 50% chance to hit, 50% of normal dmg, stuns for two rounds (effective immediately if applicable), 2 rd cooldown
			*/

			if(attackName == 'flurry'){
				numAttacks = 3;
				chanceToHit = 0.3;
				dmgModifier = 2.0;
			}else if(attackName == 'mighty'){
				chanceToHit = 0.5;
				dmgModifier = 3.0;
			}else if(attackName == 'stun'){
				chanceToHit = 0.5;
				dmgModifier = 0.5;
			}

			for(var i = 1; i <= numAttacks; i++){

				var attackResults = Array();
				var hitRoll = Utils.doRand(1, 101);
				var didHit = (hitRoll <= (chanceToHit * 100)) ? true : false ;
				var dmgDealt = 0;
				var hitType = "hit";

				if(didHit){
					var critRoll = Utils.doRand(1, 101);
					var didCrit = (critRoll <= (chanceToCrit * 100)) ? true : false ;

					if(didCrit){
						dmgDealt = self.maxDmg();
						hitType = "crit";
					}else{
						dmgDealt = Utils.doRand( self.minDmg(), (self.maxDmg() + 1) );
					}

					//Yes, we're making assumptions for now
					dmgDealt += self.hasWeapon() ? self.getEquippedWeapon().extraDamage() : 0 ;

					dmgDealt = dmgDealt * dmgModifier;

				}else{
					hitType = "miss";
				}

				var actualDmg = target.calculateActualDmg(dmgDealt);

				attackResults = {
					attemptedDmg : dmgDealt,
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
