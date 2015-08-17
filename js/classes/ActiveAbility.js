define([
	'jquery',
	'knockout',
	'classes/OverworldAbility',
	'Utils'
], function($, ko, OverworldAbility, Utils){

	function ActiveAbility(data){

		var self = this;

		OverworldAbility.call(this, data);

		this.init = function(data){

			self.baseCooldown = data.baseCooldown || 0;
			self.cooldown = data.cooldown || 0;

		}

		this.doAbility = function(){

		}

		this.init(data);
	}

	ActiveAbility.prototype = Object.create(OverworldAbility.prototype);
	ActiveAbility.prototype.constructor = ActiveAbility;

	return ActiveAbility;
});