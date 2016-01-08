define([
	'jquery',
	'knockout',
	'classes/ActiveAbility',
	'Utils'
], function($, ko, ActiveAbility, Utils){

	function ResetLevel(data){

		var self = this;

		ActiveAbility.call(this, data);

		this.init = function(data){

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

	ResetLevel.prototype = Object.create(ActiveAbility.prototype);
	ResetLevel.prototype.constructor = ResetLevel;

	return ResetLevel;
});