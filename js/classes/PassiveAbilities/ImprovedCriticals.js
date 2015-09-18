define([
	'jquery',
	'knockout',
	'classes/PassiveAbility',
	'Utils'
], function($, ko, PassiveAbility, Utils){

	function ImprovedCriticals(data){

		var self = this;

		PassiveAbility.call(this, data);

		this.init = function(data){

		}

		this.init(data);
	}

	ImprovedCriticals.prototype = Object.create(PassiveAbility.prototype);
	ImprovedCriticals.prototype.constructor = ImprovedCriticals;

	return ImprovedCriticals;
});