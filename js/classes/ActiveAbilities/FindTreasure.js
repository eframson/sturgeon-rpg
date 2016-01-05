define([
	'jquery',
	'knockout',
	'classes/ActiveAbility',
	'Utils'
], function($, ko, ActiveAbility, Utils){

	function FindTreasure(data){

		var self = this;

		ActiveAbility.call(this, data);

		this.init = function(data){

			self.skillStages = [
				"poor",
				"good",
				"great",
				"exceptional"
			];

			self.chancesOfSuccess = {
				"poor" : 10,
				"good" : 20,
				"great" : 30,
				"exceptional" : 40
			};

			self.lootQualities = {
				"poor" : {
					10 : "great",
					20 : "good",
					70 : "poor"
				},
				"good" :{
					20 : "great",
					30 : "poor",
					50 : "good"
				},
				"great" : {
					10 : "exceptional",
					20 : "poor",
					30 : "great",
					40 : "good"
				},
				"exceptional" : {
					10 : "poor",
					20 : "exceptional",
					35 : [
						"good",
						"great",
					]
				},
			}

			self.junkMultiplierForSkillLevel = {
				"poor" : 1.0,
				"good" : 1.2,
				"great" : 1.5,
				"exceptional" : 2.0
			};

		}

		this.doOnLevelUp = function(){
			//Advance to next skill stage (if possible)
			var idxOf = self.skillStages.indexOf(self.skillLevel());
			if(idxOf < (self.skillStages.length - 1)){
				idxOf++;
				self.skillLevel( self.skillStages[idxOf] );
			}else{
				self.canTrainNextLevel(0);
				self.didLevelUp = 0;
			}
		}

		this.getTrainCost = function(){
			var baseCost = (self.skillStages.indexOf(self.skillLevel()) + 1) * 300;
			//return baseCost + ((self.skillProgress() + 1) * 200);
			return baseCost;
		}

		this.doSkill = function(delayLevelUp){

			delayLevelUp = (delayLevelUp != undefined) ? delayLevelUp : 1 ;

			//Trigger cooldown
			self.cooldown(self.baseCooldown);

			//See if skill "hit"
			var chanceOfSuccess = self.chancesOfSuccess[self.skillLevel()];
			var hitRoll = Utils.doRand(1, 101);
			var didHit = (hitRoll <= self.chanceOfSuccess) ? true : false ;

			//Make skill progress
			self.makeProgress(delayLevelUp);
			
			//Return true/false on success/fail
			return didHit;
		}

		this.getItemQuality = function(){
			var skillLevel = self.skillLevel();
			var lootProbabilities = self.lootQualities[skillLevel];

			var lootQuality = Utils.doBasedOnPercent(lootProbabilities);
			return lootQuality;
		}

		this.junkQtyForLevel = function(dungeonLevel){
			//Base qty
			var baseQty = 2;
			//Dungeon lvl
			var numAddlPerLevel = 1;
			baseQty += (numAddlPerLevel * dungeonLevel);
			//Skill multiplier
			baseQty = Math.round(baseQty * self.junkMultiplierForSkillLevel[self.skillLevel()]);
			return baseQty;
		}

		this.init(data);
	}

	FindTreasure.prototype = Object.create(ActiveAbility.prototype);
	FindTreasure.prototype.constructor = FindTreasure;

	return FindTreasure;
});