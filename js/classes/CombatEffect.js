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

			self.duration = ko.observable(data.duration || 0);
			self.baseDuration = data.baseDuration || 0;
			self.isActive = ko.observable(data.isActive || 0);
			self.delayUntilNextApplication = ko.observable(data.delayUntilNextApplication || 0);
			self.baseDelayUntilNextApplication = data.baseDelayUntilNextApplication || 0;
			//self.effect = data.effect || undefined; //This way??

		}

		this.doRound = function(){

			if(self.duration() > 0){
				self.duration( self.duration() - 1 );
			}
			
			if(self.duration() == 0){
				self.isActive(0);
			}
		}

		this.applyEffect = function(){
			self.isActive(1);
			self.duration( self.baseDuration );
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