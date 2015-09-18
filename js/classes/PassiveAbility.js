define([
	'jquery',
	'knockout',
	'classes/OverworldAbility',
	'Utils'
], function($, ko, OverworldAbility, Utils){

	function PassiveAbility(data){

		var self = this;

		OverworldAbility.call(this, data);

		this.init = function(data){

		}

		this.applyEffect = function(){
			//This should be implemented by a child class
			return 1;
		}

		this.init(data);
	}

	PassiveAbility.prototype = Object.create(OverworldAbility.prototype);
	PassiveAbility.prototype.constructor = PassiveAbility;

	return PassiveAbility;
});