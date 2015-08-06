define([
	'jquery',
	'knockout',

	'Utils',
], function($, ko, Utils){

	function Entity(data){

		//Init
		var self = this;
		data = data || {};
		data.cooldowns = data.cooldowns | {};

		this.init = function(data){

			self.nextRoundAction = ko.observable(undefined);
			self.nextRoundActionType = ko.observable(undefined);

			self.maxHp = ko.observable(data.maxHp || 5);
			self.hp = ko.observable(data.hp || 5);
			self.armor = ko.observable(data.armor || 0);
			self.speed = ko.observable(data.speed || 1);
			self.minDmg = ko.observable(data.minDmg || 1);
			self.maxDmg = ko.observable(data.maxDmg || 2);
			self.minDmg = ko.observable(data.minDmg || 1);

			self.chanceToHit = ko.observable(data.chanceToHit || 100);
			self.chanceToCrit = ko.observable(data.chanceToCrit || 5);
			self.dmgCoefficient = ko.observable(data.dmgCoefficient || 1);

			self.cooldowns = ko.observable({
				basic : ko.observable(data.cooldowns.basic || 0),
				flurry : ko.observable(data.cooldowns.basic || 0)
			});

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
				chanceToHitCoefficient : 1,
				chanceToCritCoefficient : 1,
				dmgCoefficient : 1,
				onHit : {

				},
				onMissEffect : {

				},
				baseCooldown : 0,
				description : 'Strike your enemy with your currently equipped weapon (if any)',
				buttonLabel : 'Attack',
			},
			debug_basic : {
				numAttacks : 1,
				chanceToHitCoefficient : 1,
				chanceToCritCoefficient : 1,
				dmgCoefficient : 1,
				onHit : {

				},
				onMissEffect : {

				},
				baseCooldown : 0,
				description : 'Strike your enemy with your currently equipped weapon (if any)',
				buttonLabel : 'Attack',
			},
			flurry : {
				numAttacks : 3,
				chanceToHitCoefficient : 1,
				chanceToCritCoefficient : 1,
				dmgCoefficient : 0.3,
				onHit : function(hitData){
					var doExtraDmg = Utils.doBasedOnPercent({
						30 : 1,
						70 : 0
					});

					if(doExtraDmg){
						hitData.dmgCoefficient = 1.5;
					}
				},
				onMissEffect : {

				},
				baseCooldown : 2,
				description : 'Make three quick attacks for 30% of normal damage each. Chance on hit to do 150% of normal damage.',
				buttonLabel : 'Flurry',
			},
			mighty : {
				numAttacks : 1,
				chanceToHitCoefficient : 0.5,
				chanceToCritCoefficient : 1,
				dmgCoefficient : 3.0,
				onHit : {

				},
				onMissEffect : {

				},
				baseCooldown : 2,
				description : '',
				buttonLabel : 'Attack',
			},
			stun : {
				numAttacks : 1,
				chanceToHitCoefficient : 1,
				chanceToCritCoefficient : 1,
				dmgCoefficient : 0.5,
				onHit : {

				},
				onMissEffect : {

				},
				baseCooldown : 3,
				description : '',
				buttonLabel : 'Attack',
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
			var chanceToHit = self.chanceToHit();
			var chanceToCrit = self.chanceToCrit();
			var dmgCoefficient = attackData.dmgCoefficient;
			var onHit = attackData.onHit;
			var onMissEffect = attackData.onMissEffect;
			var baseCooldown = attackData.baseCooldown;
			var chanceToCritCoefficient = attackData.chanceToCritCoefficient;
			var chanceToHitCoefficient = attackData.chanceToHitCoefficient;

			chanceToHit = Math.round(chanceToHit * chanceToHitCoefficient);
			chanceToCrit = Math.round(chanceToCrit * chanceToCritCoefficient);

			if(attackName == 'debug_basic'){
				console.log("chanceToHit: " + chanceToHit);
				console.log("chanceToCrit: " + chanceToCrit);
			}

			for(var i = 1; i <= numAttacks; i++){

				var attackResults = Array();
				var hitRoll = Utils.doRand(1, 101);
				var didHit = (hitRoll <= chanceToHit) ? true : false ;
				var hitType = "hit";
				var dmgObject = {
					dmgDealt : 0,
					didCrit : 0,
					dmgCoefficient : dmgCoefficient
				}

				if(attackName == 'debug_basic'){
					console.log("hitRoll: " + hitRoll);
				}

				if(didHit){
					var critRoll = Utils.doRand(1, 101);
					var didCrit = (critRoll <= chanceToCrit) ? true : false ;

					if(attackName == 'debug_basic'){
						console.log("critRoll: " + critRoll);
					}

					if(didCrit){
						dmgObject.dmgDealt = self.maxDmg();
						hitType = "crit";
						if(attackName == 'debug_basic'){
							console.log("attack was critical");
						}
					}else{
						dmgObject.dmgDealt = Utils.doRand( self.minDmg(), (self.maxDmg() + 1) );
					}

					if(attackName == 'debug_basic'){
						console.log("dmgDealt: " + dmgObject.dmgDealt);
					}

					dmgObject.dmgDealt = dmgObject.dmgDealt * self.dmgCoefficient();

					if(attackName == 'debug_basic'){
						console.log("dmgDealt times attack entity dmg coefficient: " + dmgObject.dmgDealt);
					}

					if(typeof onHit === 'function'){
						onHit(dmgObject);
					}

					if(attackName == 'debug_basic'){
						console.log("dmgDeal after onHit: " + dmgObject.dmgDealt);
					}

					dmgObject.dmgDealt = dmgObject.dmgDealt * dmgObject.dmgCoefficient;

					if(attackName == 'debug_basic'){
						console.log("dmgDealt times attack dmg coefficient: " + dmgObject.dmgDealt);
					}

					dmgObject.dmgDealt = Math.ceil(dmgObject.dmgDealt);

					if(attackName == 'debug_basic'){
						console.log("dmgDealt after ceil: " + dmgObject.dmgDealt);
					}

					//Yes, we're making assumptions for now
					dmgObject.dmgDealt += self.hasWeapon() ? self.getEquippedWeapon().extraDamage() : 0 ;

					if(attackName == 'debug_basic'){
						console.log("dmgDealt plus weapon damage: " + dmgObject.dmgDealt);
					}

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

				self.cooldowns[attackName] = baseCooldown;

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
