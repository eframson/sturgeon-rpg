define([
	'jquery',
	'knockout',
	'classes/OverworldAbility',
	'Utils'
], function($, ko, OverworldAbility, Utils){

	function LevelableAbility(data){

		var self = this;

		OverworldAbility.call(this, data);

		this.init = function(data){

			self.skillLevel = ko.observable((data.skillLevel !== undefined) ? data.skillLevel : 1 );
			self.skillLevelString = ko.observable((data.skillLevelString !== undefined) ? data.skillLevelString : "Skill level" );
			self.skillProgress = ko.observable(data.skillProgress || 0);
			self.nextSkillLevelAtProgress = ko.observable(data.nextSkillLevelAtProgress || 10);
			self.resetProgressOnSkillLevelUp = (data.resetProgressOnSkillLevelUp !== undefined) ? data.resetProgressOnSkillLevelUp : 1 ;
			self.canTrainNextLevel = ko.observable( (data.canTrainNextLevel !== undefined) ? data.canTrainNextLevel : 1 );
			self.requiredLevel = data.requiredLevel || 0;

		}

		this.init(data);

		this.doOnLevelUp = function(){
			//Should be overridden by child
			return 1;
		}

		this.getTrainCost = function(){
			//Should be overridden by child
			return 0;
		}
	}

	LevelableAbility.prototype = Object.create(OverworldAbility.prototype);
	LevelableAbility.prototype.constructor = LevelableAbility;

	return LevelableAbility;
});