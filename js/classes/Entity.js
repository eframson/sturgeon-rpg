define([
	'jquery',
	'knockout',
	'classes/DataCollection',
	'classes/SaveableObject',
	'classes/CombatEffect',

	'json!data/skills.json',
	'Utils',
], function($, ko, DataCollection, SaveableObject, CombatEffect, skillDataFile, Utils){

	function Entity(data, onFinishedLoadingCallback){

		//Init
		var self = this;
		data = data || {};
		data.cooldowns = data.cooldowns || {};

		var skillDataCollection = new DataCollection(skillDataFile);

		SaveableObject.call(this);

		this.init = function(data){

			self.numActiveRequests = 0;
			self.onFinishedLoadingCallbackFired = 0;

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

			self.combatEffects = ko.observable({});

			self.combatAbilities = ko.observable(data.combatAbilities || {});

			self.numTurnsToSkip = ko.observable(data.numTurnsToSkip || 0);

			if(data.combatEffects){
				var effects = {};
				$.each(data.combatEffects, function(idx, effect){
					effects[idx] = new CombatEffect(effect);
				});
				self.combatEffects(effects);
			}

			self.activeCombatEffects = ko.computed(function(){
				var combatEffectsArray = $.map(self.combatEffects(), function(elem, idx){
					return elem;
				});

				var activeEffects = $.grep(combatEffectsArray, function(elem, idx){
					return elem.isActive();
				});

				return activeEffects;
			});

			self.displayCombatEffects = ko.computed(function(){
				var activeEffects = $.grep(self.activeCombatEffects(), function(elem, idx){
					return elem.display;
				});

				return activeEffects;
			});

			self.immuneCombatEffects = ko.computed(function(){
				var combatEffectsArray = $.map(self.combatEffects(), function(elem, idx){
					return elem;
				});

				var activeEffects = $.grep(combatEffectsArray, function(elem, idx){
					return elem.delayUntilNextApplication() > 0;
				});

				return activeEffects;
			});

			self.isDead = ko.computed(function(){
				return self.hp() < 1;
			});

			self.canAct = ko.computed(function(){
				return !self.hasActiveCombatEffect("stun");
			});

			self.combatEffectsIterable = ko.computed(function(){
				return $.map(self.combatEffects(), function(elem, idx){
					return elem;
				});
				//return Utils.getObjectAsArrayIndexedByNumericalSortOrder(self.combatAbilities());
			});

		}

		self.customCombatEffectRoundHandlers = {};
		self.customCombatEffectExpiryHandlers = {};

		this.calculateActualDmg = function(dmg, levelNum, minDmg, dmgType){
			var baseDmg = Utils.calculateDmgForArmorAndLevel(dmg, self.armor(), levelNum, dmgType);

			if( minDmg !== undefined ){
				baseDmg = (baseDmg < minDmg) ? minDmg : baseDmg ;
			}

			return baseDmg;
		}

		this.takeStaggerDmg = function(){
			//Do nothing, this is only something Monsters can actually do,
			//but this is just here so nothing explodes
		}

		this.chargeUlt = function(chargeAmt){
			//Do nothing, this is only something Players can actually do,
			//but this is just here so nothing explodes
		}

		this.takeCombatAction = function(abilityId, target, game){

			if(self.canAct() && abilityId != 'pass'){
				self.makeAttack(abilityId, target, game);
			}

		}

		this.makeAttack = function(abilityId, target, game){

			var combatAbility = self.combatAbilities()[abilityId];
			combatAbility.doAbility(self, target, game);

		}

		this.updateCombatEffectsForRound = function(){
			
			$.each(self.activeCombatEffects(), function(idx, effect){
				effect.doRound(self);
			});
			//Make sure all effects have been evaluated before doing "special" things
			$.each(self.activeCombatEffects(), function(idx, effect){
				if(self.customCombatEffectRoundHandlers[effect.id] != undefined){
					self.customCombatEffectRoundHandlers[effect.id](effect);
				}
			});
		}

		this.updateActiveAbilityCooldownsForRound = function(){

			$.each(self.combatAbilities(), function(idx, ability){

				if(ability.cooldown() > 0){
					ability.cooldown( ability.cooldown() - 1 );
				}

			});

		}

		this.resetActiveAbilityCooldowns = function(){
			
			$.each(self.combatAbilities(), function(idx, ability){

				ability.cooldown( 0 );
			});

		}

		this.resetCombatEffects = function(){

			self.combatEffects({});

		}

		this.applyCombatEffect = function(combatEffect){

			var existingEffect = self.combatEffects()[combatEffect.id];

			if(existingEffect == undefined){
				self.combatEffects()[combatEffect.id] = combatEffect;
				existingEffect = self.combatEffects()[combatEffect.id];
			}
			
			existingEffect.applyEffect();

			self.combatEffects.valueHasMutated();
		}

		this.takeDmg = function(dmg){
			self.hp( self.hp() - dmg );
		}

		this.hasArmor = function(){
			return false;
		}

		this.hasWeapon = function(){
			return false;
		}

		this.hasActiveCombatEffect = function(effect_id){
			var activeEffect = $.grep(self.activeCombatEffects(), function(elem, idx){
				return elem.id == effect_id && elem.isActive();
			});

			return activeEffect.length > 0;
		}

		this.getEquippedWeapon = function(){
			return false;
		}

		this.registerRequest = function(){
			self.numActiveRequests++;
		}

		this.deregisterRequest = function(){

			self.numActiveRequests--;

			if(self.numActiveRequests == 0){
				if(onFinishedLoadingCallback !== undefined && typeof onFinishedLoadingCallback === 'function' && self.onFinishedLoadingCallbackFired == 0){
					self.onFinishedLoadingCallbackFired = 1;
					onFinishedLoadingCallback(self);
				}
			}

		}

		self.init(data);
	}

	Entity.prototype = Object.create(SaveableObject.prototype);
	Entity.prototype.constructor = Entity;

	return Entity;

});
