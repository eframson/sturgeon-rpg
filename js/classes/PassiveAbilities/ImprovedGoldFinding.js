define([
	'jquery',
	'knockout',
	'classes/PassiveAbility',
	'Utils'
], function($, ko, PassiveAbility, Utils){

	function ImprovedGoldFinding(data){

		var self = this;

		PassiveAbility.call(this, data);

		this.init = function(data){

		}

		this.init(data);
	}

	ImprovedGoldFinding.prototype = Object.create(PassiveAbility.prototype);
	ImprovedGoldFinding.prototype.constructor = ImprovedGoldFinding;

	return ImprovedGoldFinding;
});