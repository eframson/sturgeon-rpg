define([
	'jquery',
	'knockout',
	'classes/Ability',
	'Utils'
], function($, ko, Ability, Utils){

	function PassiveAbility(data){

		var self = this;

		Ability.call(this, data);

		this.init = function(data){
			self.requiredLevel = data.requiredLevel || 0;
		}

		this.applyEffect = function(){
			//This should be implemented by a child class
			return 1;
		}

		this.init(data);
	}

	PassiveAbility.prototype = Object.create(Ability.prototype);
	PassiveAbility.prototype.constructor = PassiveAbility;

	return PassiveAbility;
});