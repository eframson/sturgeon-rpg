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

			self.baseCooldown = data.baseCooldown || 0;
			self.cooldown = data.cooldown || 0;
			self.skillStages = [
				"poor",
				"good",
				"great",
				"exceptional"
			];

		}

		this.doAbility = function(){

		}

		this.init(data);
	}

	FindFood.prototype = Object.create(ActiveAbility.prototype);
	FindFood.prototype.constructor = FindFood;

	return FindFood;
});