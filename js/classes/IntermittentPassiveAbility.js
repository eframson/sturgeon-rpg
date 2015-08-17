define([
	'jquery',
	'knockout',
	'classes/PassiveAbility',
	'Utils'
], function($, ko, PassiveAbility, Utils){

	function IntermittentPassiveAbility(data){

		var self = this;

		PassiveAbility.call(this, data);

		this.init = function(data){

			self.roundsBetweenAttempts = data.roundsBetweenAttempts || 0;

		}

		this.doForRound - function(){

		}

		this.init(data);
	}

	IntermittentPassiveAbility.prototype = Object.create(PassiveAbility.prototype);
	IntermittentPassiveAbility.prototype.constructor = IntermittentPassiveAbility;

	return IntermittentPassiveAbility;
});