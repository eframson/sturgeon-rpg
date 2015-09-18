define([
	'jquery',
	'knockout',
	'classes/PassiveAbility',
	'Utils'
], function($, ko, PassiveAbility, Utils){

	function ArmorMaster(data){

		var self = this;

		PassiveAbility.call(this, data);

		this.init = function(data){

		}

		this.init(data);
	}

	ArmorMaster.prototype = Object.create(PassiveAbility.prototype);
	ArmorMaster.prototype.constructor = ArmorMaster;

	return ArmorMaster;
});