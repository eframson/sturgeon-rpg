define([
	'jquery',
	'knockout',
	'classes/PassiveAbility',
	'Utils'
], function($, ko, PassiveAbility, Utils){

	function ImprovedScanning(data){

		var self = this;

		PassiveAbility.call(this, data);

		this.init = function(data){

		}

		this.init(data);
	}

	ImprovedScanning.prototype = Object.create(PassiveAbility.prototype);
	ImprovedScanning.prototype.constructor = ImprovedScanning;

	return ImprovedScanning;
});