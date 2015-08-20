define([
	'jquery',
	'knockout',
	'classes/DataCollection',

	'json!data/skills.json',
	'Utils',
], function($, ko, DataCollection, skillDataFile, Utils){

	function Entity(data){

		//Init
		var self = this;
		data = data || {};
		data.cooldowns = data.cooldowns || {};

		var skillDataCollection = new DataCollection(skillDataFile);

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

			self.combatEffects = ko.observable({});

			self.combatAbilities = ko.observable(data.combatAbilities || {});

			self.activeCombatEffects = ko.computed(function(){
				var combatEffectsArray = $.map(self.combatEffects(), function(elem, idx){
					return elem;
				});

				var activeEffects = $.grep(combatEffectsArray, function(elem, idx){
					return elem.isActive();
				});

				return activeEffects;
			});

			self.isDead = ko.computed(function(){
				return self.hp() < 1;
			});

			self.canAct = ko.computed(function(){
				return !self.hasActiveCombatEffect("stun");
			});

		}

		this.calculateActualDmg = function(dmg, levelNum){
			return Utils.calculateDmgForArmorAndLevel(dmg, self.armor(), levelNum);
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

			//var attackData = self.attacks[attackName];
			var combatAbility = self.combatAbilities()[attackName];
			combatAbility.doAbility(self, target, game);

		}

		this.updatePassiveEffectsForRound = function(){
			
			$.each(self.combatEffects(), function(idx, effect){

				if(effect.cooldown() > 0){
					effect.cooldown( effect.cooldown() - 1 );

					if(effect.cooldown() == 0){
						effect.delayUntilNextApplication(effect.baseDelayUntilNextApplication());
					}
				}else if( effect.delayUntilNextApplication() > 0 ){
					effect.delayUntilNextApplication(effect.delayUntilNextApplication() - 1);
				}

			});

		}

		this.applyCombatEffect = function(combatEffect){

			existingEffect = self.combatEffects()[combatEffect.id];

			if(existingEffect){

				if(existingEffect.baseDelayUntilNextApplication() == 0){
					existingEffect.cooldown(combatEffect.baseCooldown);
				}

			}else{
				combatEffect.cooldown(combatEffect.baseCooldown);
				self.combatEffects()[combatEffect.id] = combatEffect;
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

		this.hasActiveCombatEffect = function(effect_id){
			var activeEffect = $.grep(self.activeCombatEffects(), function(elem, idx){
				return elem.id == effect_id;
			});

			return activeEffect.length > 0;
		}

		this.getEquippedWeapon = function(){
			return false;
		}

		self.init(data);
	}

	Entity.prototype.constructor = Entity;

	return Entity;

});
