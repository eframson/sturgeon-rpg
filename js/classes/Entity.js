define([
	'jquery',
	'knockout',
	'classes/DataCollection',
	'classes/SaveableObject',

	'json!data/skills.json',
	'Utils',
], function($, ko, DataCollection, SaveableObject, skillDataFile, Utils){

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

			self.cooldowns = ko.observable({
				basic : ko.observable(data.cooldowns.basic || 0),
				flurry : ko.observable(data.cooldowns.basic || 0)
			});

			self.combatEffects = ko.observable({});

			self.combatAbilities = ko.observable(data.combatAbilities || {});

			self.queuedAttacks = ko.observable(data.queuedAttacks || []);

			self.activeCombatEffects = ko.computed(function(){
				var combatEffectsArray = $.map(self.combatEffects(), function(elem, idx){
					return elem;
				});

				var activeEffects = $.grep(combatEffectsArray, function(elem, idx){
					return elem.isActive();
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

		this.calculateActualDmg = function(dmg, levelNum, minDmg){
			var baseDmg = Utils.calculateDmgForArmorAndLevel(dmg, self.armor(), levelNum);

			if( minDmg !== undefined ){
				baseDmg = (baseDmg < minDmg) ? minDmg : baseDmg ;
			}

			return baseDmg;
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
			
			$.each(self.combatEffects(), function(idx, effect){

				effect.doRound();

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

		this.queueAttack = function(attack){
			self.queuedAttacks().push(attack);
		}

		this.deQueueAttack = function(){
			return self.queuedAttacks().pop();
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
