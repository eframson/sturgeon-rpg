define([
	'jquery',
	'knockout',
	'classes/ActiveAbility',
	'Utils'
], function($, ko, ActiveAbility, Utils){

	function FindFood(data){

		var self = this;

		ActiveAbility.call(this, data);

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
			var baseCost = (self.skillStages.indexOf(self.skillLevel()) + 1) * 1000
			return baseCost + ((self.skillProgress() + 1) * 200);
		}

		this.init(data);
	}

	FindFood.prototype = Object.create(ActiveAbility.prototype);
	FindFood.prototype.constructor = FindFood;

	return FindFood;
});