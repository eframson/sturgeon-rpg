define([
	'jquery',
	'knockout',
	'classes/Ability',
	'Utils'
], function($, ko, Ability, Utils){

	function OverworldAbility(data){

		var self = this;

		Ability.call(this, data);

		this.init = function(data){

			self.buttonLabel = data.buttonLabel;
			self.chanceOfEffect = (data.chanceOfEffect !== undefined) ? data.chanceOfEffect : 1;

		}

		this.init(data);
	}

	OverworldAbility.prototype = Object.create(Ability.prototype);
	OverworldAbility.prototype.constructor = OverworldAbility;

	return OverworldAbility;
});