define([
	'jquery',
	'knockout',
	'classes/Ability',
	'Utils'
], function($, ko, Ability, Utils){

	function UsableAbility(data){

		var self = this;

		Ability.call(this, data);

		this.init = function(data){

			self.buttonLabel = data.buttonLabel;
			self.sortOrder = data.sortOrder || 9999;

		}

		this.init(data);
	}

	UsableAbility.prototype = Object.create(Ability.prototype);
	UsableAbility.prototype.constructor = UsableAbility;

	return UsableAbility;
});