define([
	'jquery',
	'knockout',
	'classes/Entity',
	'classes/DataCollection',

	'json!data/monsterarchetypes.json',
	'json!data/skills.json',
	'Utils',
], function($, ko, Entity, DataCollection, monsterArchetypeDataFile, skillDataFile, Utils){

	function Monster(monsterData, onFinishedLoadingCallback){

		//Init
		var self = this;
		monsterData = monsterData || {};

		Entity.call(this, monsterData, onFinishedLoadingCallback);

		var monsterArchetypeDataCollection = new DataCollection(monsterArchetypeDataFile);
		var skillDataCollection = new DataCollection(skillDataFile);

		this.init = function(monsterData){

			self.name = ko.observable(monsterData.name || "Enemy");
			self.desc = ko.observable(monsterData.desc || "An enemy");
			self.level = ko.observable(monsterData.level || 1);
			self.autoScale = ko.observable(monsterData.autoScale || 1);
			self.isScaled = ko.observable(monsterData.isScaled || 0);
			self.expValue = ko.observable(monsterData.expValue || 0);
			self.fullyDynamicStats = monsterData.fullyDynamicStats || 0;
			self.avgHpCoefficient = monsterData.avgHpCoefficient || 1;
			self.avgDmgCoefficient = monsterData.avgDmgCoefficient || 1;
			self.archetypeId = monsterData.archetypeId;
			self.archetypeClass = monsterData.archetypeClass || "regular";
			self.doNotSpecializeArchetype = (monsterData.doNotSpecializeArchetype !== undefined) ? monsterData.doNotSpecializeArchetype : 0;

			self.hpCoefficient = ko.observable(monsterData.hpCoefficient || 1);
			self.xpCoefficient = ko.observable(monsterData.xpCoefficient || 1);
			self.chanceOfEpicLoot = ko.observable(monsterData.chanceOfEpicLoot || 0);
			self.lootCoefficient = ko.observable(monsterData.lootCoefficient || 1);
			self.chanceToCrit = ko.observable(monsterData.chanceToCrit || 0);

			self.availableAttacks = monsterData.availableAttacks || {};

			var archetypeData;

			if(self.fullyDynamicStats && !self.isScaled()){
				
				var averages = Utils.calculateAveragesForLevel(self.level());
				var avgMonsterHp = averages.avgMonsterHp;
				var avgMonsterDmg = averages.avgMonsterDmg;

				var newMonsterArchetypeId;
				if(self.doNotSpecializeArchetype){
					newMonsterArchetypeId = "basic";
				}else{
					newMonsterArchetypeId = self.archetypeId || self._getAppropriateArchetypeIdForLevel();
				}
				self.archetypeId = newMonsterArchetypeId;
				archetypeData = self.getMonsterArchetypeById(newMonsterArchetypeId, self.archetypeClass);

				self.hpCoefficient = ko.observable(archetypeData.hpCoefficient || 1);
				self.xpCoefficient = ko.observable(archetypeData.xpCoefficient || 1);
				self.dmgCoefficient = ko.observable(archetypeData.dmgCoefficient || 1);
				self.armorCoefficient = ko.observable(archetypeData.armorCoefficient);
				self.chanceOfEpicLoot = ko.observable(archetypeData.chanceOfEpicLoot);
				self.chanceToCrit = ko.observable(archetypeData.chanceToCrit);
				self.chanceToHit = ko.observable(archetypeData.chanceToHit);
				self.lootCoefficient = ko.observable(archetypeData.lootCoefficient);
				self.availableAttacks = archetypeData.attacks;

				//Let's say HP and DMG both have a 30% variance
				var stats = Utils.projectedStatAllotmentsForLevel( self.level() );
				self.maxHp(stats.monster.hp);
				self.maxHp( Math.round((Utils.doRand(Math.ceil(stats.monster.hp * 0.9), Math.ceil(stats.monster.hp * 1.1))) ));
				self.maxHp( Math.round(self.maxHp() * self.hpCoefficient()) );
				self.hp( self.maxHp() );
				self.minDmg( Math.round(stats.monster.baseDmg * 0.9) );
				self.maxDmg( Math.round(stats.monster.baseDmg * 1.1) );

				self.minDmg( Math.round( self.minDmg() * self.dmgCoefficient() ) );
				self.maxDmg( Math.round( self.maxDmg() * self.dmgCoefficient() ) );

				self.speed( self.level() );
				self.expValue( Math.ceil((avgMonsterHp * 3) * self.xpCoefficient()) );
				
				monsterData.availableCombatAbilities = archetypeData.availableCombatAbilities;
				
				self.name( self.name() + (archetypeData.displayString ? " " + archetypeData.displayString : "") );

				self.armor(self.level());
				if(self.armorCoefficient() != undefined){
					self.armor( self.armor() * self.armorCoefficient() );
				}

				//This should prevent monsters getting constantly re-scaled every time a game is loaded
				self.isScaled(1);

			}

			var abilityDataToLoad = [];
			if(Utils.isEmptyObject(self.combatAbilities())){

				$.each((monsterData.availableCombatAbilities || []), function(idx, elem){
					var abilityData;
					
					abilityData = skillDataCollection.getNode(["combat_abilities", elem]);

					abilityDataToLoad.push(abilityData);
				});

			}else{
				abilityDataToLoad = $.map(self.combatAbilities(), function(elem, idx){
					return elem;
				});
			}

			//Theoretically this shouldn't happen, but at least one error email says it is, so we're implementing this fix
			if(self.archetypeId){
				archetypeData = archetypeData || self.getMonsterArchetypeById(self.archetypeId, self.archetypeClass);
				var availableCombatAbilities = archetypeData.availableCombatAbilities;

				var abilityDataToLoadIds = $.map(abilityDataToLoad, function(elem, idx){
					return elem.id;
				});

				$.each((availableCombatAbilities || []), function(idx, elem){
					var abilityData;
					
					if( abilityDataToLoadIds.indexOf(elem) == -1 ){
						abilityData = skillDataCollection.getNode(["combat_abilities", elem]);
						abilityDataToLoad.push(abilityData);
					}
				});

			}

			$.each(abilityDataToLoad, function(idx, elem){

				var className = elem.className;

				self.registerRequest();
				require(["classes/CombatAbilities/" + className], function(newClassDefinition){
					self.combatAbilities()[elem.id] = new newClassDefinition(elem);
					self.combatAbilities.valueHasMutated();
					self.deregisterRequest();
				});

			});

			self.combatAbilityIdsOffCooldown = ko.computed(function(){
				var combatAbilitiesArray = $.map(self.combatAbilities(), function(elem, idx){
					return elem;
				});

				var availableCombatAbilities = $.grep(combatAbilitiesArray, function(elem, idx){
					if (elem.cooldown !== undefined && typeof elem.cooldown === "function"){
						return elem.cooldown() == 0;
					}
				});

				var availableCombatAbilities = $.map(availableCombatAbilities, function(elem, idx){
					return elem.id;
				});

				return availableCombatAbilities;
			});

			self.combatAbilityIdsOnCooldown = ko.computed(function(){
				var combatAbilitiesArray = $.map(self.combatAbilities(), function(elem, idx){
					return elem;
				});

				var unavailableCombatAbilities = $.grep(combatAbilitiesArray, function(elem, idx){
					if (elem.cooldown !== undefined && typeof elem.cooldown === "function"){
						return elem.cooldown() > 0;
					}
				});

				var unavailableCombatAbilities = $.map(unavailableCombatAbilities, function(elem, idx){
					return elem.id;
				});

				return unavailableCombatAbilities;
			});

		}

		this.selectCombatAbility = function(){

			var baseAvailableAttacks = {};
			var monsterAbilityId = undefined;
			var totalProbabilityToRedistribute = 0;

			//From the available combat abilities, find the ones that are not currently valid
			var abilityIdsOnCooldown = self.combatAbilityIdsOnCooldown();

			//Combine their probabilities
			$.each((abilityIdsOnCooldown || []), function(idx, abilityId){
				totalProbabilityToRedistribute += parseInt(self.availableAttacks[abilityId]);
			});

			//If we have probabilities to redistribute
			if(totalProbabilityToRedistribute > 0){
				//Count the number of valid abilities
				var numberToRedistributeTo = self.combatAbilityIdsOffCooldown().length;
				if(numberToRedistributeTo > 0){

					var floatingProbabilityPerAbility = (totalProbabilityToRedistribute / numberToRedistributeTo);
					var floorProbabilityPerAbility = Math.floor(floatingProbabilityPerAbility);
					var remainderToDistribute = (floatingProbabilityPerAbility > floorProbabilityPerAbility) ? 1 : 0 ;

					//Take the combined probability total and divvy it up among the remaining valid abilities
					$.each(self.combatAbilityIdsOffCooldown(), function(idx, abilityId){
						baseAvailableAttacks[abilityId] = floorProbabilityPerAbility + parseInt(self.availableAttacks[abilityId]);

						//If there is a remainder, add the floor on all but one, and add floor + 1 on the last one (or first one or whatever)
						if(idx == (self.combatAbilityIdsOffCooldown().length - 1) ){
							baseAvailableAttacks[abilityId] = baseAvailableAttacks[abilityId] + remainderToDistribute;
						}
					});
					
				}else{
					//If there are none left, pass (leave ability ID set as undef)
					monsterAbilityId = 'pass';
				}
			}else{
				baseAvailableAttacks = self.availableAttacks;
			}			

			//Swap the keys and values
			var probabilityIndexedAttacks = {};
			$.each(baseAvailableAttacks, function(abilityId, probability){
				if(probabilityIndexedAttacks[probability] === undefined){
					probabilityIndexedAttacks[probability] = abilityId;
				}else if(probabilityIndexedAttacks[probability] !== undefined){
					//If the resulting object would have two keys with the same name (i.e. - two abilities with the same % chance), they need to be made into an array
					if( probabilityIndexedAttacks[probability] instanceof Array ){
						probabilityIndexedAttacks[probability].push(abilityId);
					}else{
						probabilityIndexedAttacks[probability] = [ probabilityIndexedAttacks[probability], abilityId ];
					}
				}
			});
			
			//From the resulting probability list, choose one appropriately and return its ID

			if(monsterAbilityId != 'pass'){

				monsterAbilityId = Utils.doBasedOnPercent(
					probabilityIndexedAttacks
				);

				return monsterAbilityId;

			}else{
				return undefined;
			}

		}

		this.getMonsterArchetypeById = function(archetypeID, archetypeClass){
			return monsterArchetypeDataCollection.getNode([archetypeClass, archetypeID]);
		}

		this.getAvailableMonsterArchetypeIdsByClass = function(archetypeClass){
			return monsterArchetypeDataCollection.getNode([archetypeClass], 1);
		}

		this._getAppropriateArchetypeIdForLevel = function(){

			//Get a list of all monster archetypes
			var allAvailableArchetypes = monsterArchetypeDataCollection.getNode([self.archetypeClass]);

			//Filter out by ones that shouldn't appear on the current level
			allAvailableArchetypes = $.grep($.map(allAvailableArchetypes, function(obj, idx){ return obj }), function(elem, idx){
				return elem.appearsOnLevel <= self.level();
			});

			var availableArchetypeIds = $.map(allAvailableArchetypes, function(elem, idx){
				return elem.id;
			});

			return Utils.chooseRandomly(availableArchetypeIds);
		}

		self.init(monsterData);
	}

	Monster.prototype = Object.create(Entity.prototype);
	Monster.prototype.constructor = Monster;

	return Monster;

});
