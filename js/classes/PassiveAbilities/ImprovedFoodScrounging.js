define([
	'jquery',
	'knockout',
	'classes/PassiveAbility',
	'Utils'
], function($, ko, PassiveAbility, Utils){

	function ImprovedFoodScrounging(data){

		var self = this;

		PassiveAbility.call(this, data);

		this.init = function(data){

		}

		this.init(data);
	}

	ImprovedFoodScrounging.prototype = Object.create(PassiveAbility.prototype);
	ImprovedFoodScrounging.prototype.constructor = ImprovedFoodScrounging;

	return ImprovedFoodScrounging;
});