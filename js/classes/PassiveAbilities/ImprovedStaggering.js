define([
	'jquery',
	'knockout',
	'classes/PassiveAbility',
	'Utils'
], function($, ko, PassiveAbility, Utils){

	function ImprovedStaggering(data){

		var self = this;

		PassiveAbility.call(this, data);

		this.init = function(data){

		}

		this.init(data);
	}

	ImprovedStaggering.prototype = Object.create(PassiveAbility.prototype);
	ImprovedStaggering.prototype.constructor = ImprovedStaggering;

	return ImprovedStaggering;
});