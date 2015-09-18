define([
	'jquery',
	'knockout',
	'classes/PassiveAbility',
	'Utils'
], function($, ko, PassiveAbility, Utils){

	function ImprovedBarter(data){

		var self = this;

		PassiveAbility.call(this, data);

		this.init = function(data){

		}

		this.init(data);
	}

	ImprovedBarter.prototype = Object.create(PassiveAbility.prototype);
	ImprovedBarter.prototype.constructor = ImprovedBarter;

	return ImprovedBarter;
});