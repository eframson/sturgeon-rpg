define([
	'jquery',
	'knockout',
	'classes/PassiveAbility',
	'Utils'
], function($, ko, PassiveAbility, Utils){

	function ImprovedDexterity(data){

		var self = this;

		PassiveAbility.call(this, data);

		this.init = function(data){

		}

		this.init(data);
	}

	ImprovedDexterity.prototype = Object.create(PassiveAbility.prototype);
	ImprovedDexterity.prototype.constructor = ImprovedDexterity;

	return ImprovedDexterity;
});