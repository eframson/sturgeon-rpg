define([
	'jquery',
	'knockout',
	'classes/Entity',

	'json!data/monsterarchetypes.json',
	'Utils',
], function($, ko, Entity, monsterArchetypeDataFile, Utils){

	function Monster(monsterData){

		//Init
		var self = this;
		monsterData = monsterData || {};

		Entity.call(this, monsterData);

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

			self.hpCoefficient = ko.observable(monsterData.hpCoefficient || 1);
			self.xpCoefficient = ko.observable(monsterData.xpCoefficient || 1);
			self.chanceOfEpicLoot = ko.observable(monsterData.chanceOfEpicLoot || 0);
			self.lootCoefficient = ko.observable(monsterData.lootCoefficient || 1);
			self.chanceToCrit = ko.observable(monsterData.chanceToCrit || 0);

			self.monsterArchetypeDataFile = monsterArchetypeDataFile;
			self.availableAttacks = monsterData.availableAttacks || {};

			if(self.fullyDynamicStats && !self.isScaled()){
				
				//Idea 1
				var averages = Utils.calculateAveragesForLevel(self.level());
				var avgPlayerHp = averages.avgPlayerHp;
				var avgMonsterHp = averages.avgMonsterHp;
				var avgMonsterDmg = averages.avgMonsterDmg;

				var newMonsterArchetypeId = self.archetypeId || Utils.chooseRandomly(self.getAvailableMonsterArchetypeIdsByClass(self.archetypeClass));
				var archetypeData = self.getMonsterArchetypeById(newMonsterArchetypeId, self.archetypeClass);

				self.hpCoefficient = ko.observable(archetypeData.hpCoefficient);
				self.xpCoefficient = ko.observable(archetypeData.xpCoefficient);
				self.chanceOfEpicLoot = ko.observable(archetypeData.chanceOfEpicLoot);
				self.chanceToCrit = ko.observable(archetypeData.chanceToCrit);
				self.chanceToHit = ko.observable(archetypeData.chanceToHit);
				self.dmgCoefficient = ko.observable(archetypeData.dmgCoefficient);
				self.lootCoefficient = ko.observable(archetypeData.lootCoefficient);
				self.availableAttacks = archetypeData.attacks;

				//Let's say HP and DMG both have a 30% variance
				self.maxHp( Math.round((Utils.doRand(Math.ceil(avgMonsterHp * 0.7), Math.ceil(avgMonsterHp * 1.3))) * self.avgHpCoefficient) );
				self.maxHp( Math.ceil(self.maxHp() * self.hpCoefficient()) );
				self.hp( self.maxHp() );
				self.minDmg( Math.ceil(avgMonsterDmg * 0.7) * self.avgDmgCoefficient );
				self.maxDmg( Math.ceil(avgMonsterDmg * 1.3) * self.avgDmgCoefficient );
				self.speed( self.level() );
				self.expValue( Math.ceil((avgMonsterHp * 5) * self.xpCoefficient()) );

				

				

				
				
				self.name( self.name() + (archetypeData.displayString ? " " + archetypeData.displayString : "") );

				//This should prevent monsters getting constantly re-scaled every time a game is loaded, lol
				self.isScaled(1);

				/*console.log("Estimated base values");
				console.log("Avg Player HP: " + avgPlayerHp);
				console.log("Avg Monster HP: " + avgMonsterHp);
				console.log("Avg Monster DMG: " + avgMonsterDmg);

				console.log("Generated stats");
				console.log("HP: " + self.hp());
				console.log("Min DMG: " + self.minDmg());
				console.log("Max DMG: " + self.maxDmg());
				console.log("Speed: " + self.speed());
				console.log("EXP value: " + self.expValue());*/

			}

		}

		this.getMonsterArchetypeById = function(archetypeID, archetypeClass){
			var archetypeIDs = self.getAvailableMonsterArchetypeIdsByClass(archetypeClass);
			for(i=0; i < archetypeIDs.length; i++){
				if(archetypeIDs[i] == archetypeID){
					return self.monsterArchetypeDataFile[archetypeClass][archetypeIDs[i]];
				}
			}
		}

		this.getAvailableMonsterArchetypeIdsByClass = function(archetypeClass){
			return Object.keys(self.monsterArchetypeDataFile[archetypeClass]);
		}

		this.getExportData = function(){
			return Utils.getExportDataFromObject(self);
		}

		self.init(monsterData);
	}

	Monster.prototype = Object.create(Entity.prototype);
	Monster.prototype.constructor = Monster;

	return Monster;

});
