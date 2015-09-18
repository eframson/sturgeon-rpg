define([
	'jquery',
	'knockout',
	'classes/PassiveAbility',
	'Utils'
], function($, ko, PassiveAbility, Utils){

	function ImprovedEndurance(data){

		var self = this;

		PassiveAbility.call(this, data);

		this.init = function(data){

		}

		this.init(data);
	}

	ImprovedEndurance.prototype = Object.create(PassiveAbility.prototype);
	ImprovedEndurance.prototype.constructor = ImprovedEndurance;

	return ImprovedEndurance;
});