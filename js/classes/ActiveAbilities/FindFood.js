define([
	'jquery',
	'knockout',
	'classes/ActiveAbility',
	'Utils'
], function($, ko, ActiveAbility, Utils){

	function FindFood(data){

		var self = this;

		ActiveAbility.call(this, data);

		/*
			self.id = data.id;
			self.name = data.name || self.id;
			self.description = data.description || self.name;
			self.skillLevel = (data.skillLevel !== undefined) ? data.skillLevel : 1 ;
			self.skillProgress = data.skillProgress || 0;
			self.nextSkillLevelAtProgress = data.nextSkillLevelAtProgress || 10;
			self.resetProgressOnSkillLevelUp = (data.resetProgressOnSkillLevelUp !== undefined) ? data.resetProgressOnSkillLevelUp : 1 ;
			self.buttonLabel = data.buttonLabel;
			self.chanceOfEffect = (data.chanceOfEffect !== undefined) ? data.chanceOfEffect : 1;
			self.baseCooldown = data.baseCooldown || 0;
			self.cooldown = data.cooldown || 0;
		*/

		this.init = function(data){

			self.skillStages = [
				"poor",
				"good",
				"great",
				"exceptional"
			];

		}

		this.doAbility = function(){

		}

		this.doProgress = function(progressAmt){
			progressAmt = progressAmt || 1;

			self.skillProgress( self.skillProgress() + 1 );

			if( self.skillProgress() == self.nextSkillLevelAtProgress() ){

			}
		}

		this.levelUp = function(){

		}

		this.init(data);
	}

	FindFood.prototype = Object.create(ActiveAbility.prototype);
	FindFood.prototype.constructor = FindFood;

	return FindFood;
});