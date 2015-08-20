define([
	'jquery',
	'knockout',
	'classes/LevelableAbility',
	'Utils'
], function($, ko, LevelableAbility, Utils){

	function OverworldAbility(data){

		var self = this;

		LevelableAbility.call(this, data);

		this.init = function(data){

			self.buttonLabel = data.buttonLabel;
			self.chanceOfEffect = (data.chanceOfEffect !== undefined) ? data.chanceOfEffect : 1;

		}

		this.init(data);
	}

	OverworldAbility.prototype = Object.create(LevelableAbility.prototype);
	OverworldAbility.prototype.constructor = OverworldAbility;

	return OverworldAbility;
});