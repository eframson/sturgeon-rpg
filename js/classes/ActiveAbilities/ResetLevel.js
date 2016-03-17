define([
	'jquery',
	'knockout',
	'classes/LevelableActiveAbility',
	'Utils'
], function($, ko, LevelableActiveAbility, Utils){

	function ResetLevel(data){

		var self = this;

		LevelableActiveAbility.call(this, data);

		this.init = function(data){
			self.canTrainNextLevel(0);
		}

		this.makeProgress = function(){
			return false;
		}

		this.doOnLevelUp = function(){
			return false;
		}

		this.getTrainCost = function(){
			return false;
		}

		this.init(data);
	}

	ResetLevel.prototype = Object.create(LevelableActiveAbility.prototype);
	ResetLevel.prototype.constructor = ResetLevel;

	return ResetLevel;
});