define([
	'jquery',
	'knockout',
	'classes/PassiveAbility',
	'Utils'
], function($, ko, PassiveAbility, Utils){

	function ImprovedScrapFinding(data){

		var self = this;

		PassiveAbility.call(this, data);

		this.init = function(data){

		}

		this.init(data);
	}

	ImprovedScrapFinding.prototype = Object.create(PassiveAbility.prototype);
	ImprovedScrapFinding.prototype.constructor = ImprovedScrapFinding;

	return ImprovedScrapFinding;
});