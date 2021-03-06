define([
	'jquery',
	'knockout',
	'classes/LevelableActiveAbility',
	'Utils'
], function($, ko, LevelableActiveAbility, Utils){

	function FindFood(data){

		var self = this;

		LevelableActiveAbility.call(this, data);

		this.init = function(data){

			self.skillStages = [
				"poor",
				"good",
				"great",
				"exceptional"
			];

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

		this.init(data);
	}

	FindFood.prototype = Object.create(LevelableActiveAbility.prototype);
	FindFood.prototype.constructor = FindFood;

	return FindFood;
});