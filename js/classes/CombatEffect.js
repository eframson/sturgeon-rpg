define([
	'jquery',
	'knockout',
	'classes/Ability',
	'Utils'
], function($, ko, Ability, Utils){

	function CombatEffect(data){

		var self = this;

		Ability.call(this, data);

		this.init = function(data){

			self.duration = data.duration || undefined;
			self.delayUntilNextApplication = data.delayUntilNextApplication || 0;
			//self.effect = data.effect || undefined; //This way??

		}

		this.doRound = function(){

		}

		/*
		//Or this way??
		this.effectLogic = function(){

		}
		*/

		this.init(data);
	}

	CombatEffect.prototype = Object.create(Ability.prototype);
	CombatEffect.prototype.constructor = CombatEffect;

	return CombatEffect;
});