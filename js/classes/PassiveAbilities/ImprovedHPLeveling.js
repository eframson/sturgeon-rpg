define([
	'jquery',
	'knockout',
	'classes/PassiveAbility',
	'Utils'
], function($, ko, PassiveAbility, Utils){

	function ImprovedHPLeveling(data){

		var self = this;

		PassiveAbility.call(this, data);

		this.init = function(data){

		}

		this.init(data);
	}

	ImprovedHPLeveling.prototype = Object.create(PassiveAbility.prototype);
	ImprovedHPLeveling.prototype.constructor = ImprovedHPLeveling;

	return ImprovedHPLeveling;
});