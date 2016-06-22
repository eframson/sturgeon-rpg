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
			self.delayUntilNextApplication = ko.observable(data.delayUntilNextApplication || 0);
			self.baseDelayUntilNextApplication = data.baseDelayUntilNextApplication || 0;
			self.display = (data.display != undefined) ? data.display : 1 ;
			
			self.isActive = ko.computed(function(){
				return self.duration() > 0 || self.duration() < 0;
			});

		}

		this.doRound = function(entity){

			if(self.duration() > 0){

				if(self.duration() == 1){
					self.delayUntilNextApplication(self.baseDelayUntilNextApplication);
				}

				self.duration( self.duration() - 1 );

				if(self.duration() == 0 && entity.customCombatEffectExpiryHandlers[self.id] != undefined){
					entity.customCombatEffectExpiryHandlers[self.id](self);
				}
			}

			if( self.isActive() == 0 && self.delayUntilNextApplication() > 0 ){
				self.delayUntilNextApplication( self.delayUntilNextApplication() - 1 );
			}
		}

		this.applyEffect = function(){
			
			if(self.delayUntilNextApplication() == 0){
				self.duration( self.baseDuration );
			}

		}

		this.init(data);
	}

	CombatEffect.prototype = Object.create(Ability.prototype);
	CombatEffect.prototype.constructor = CombatEffect;

	return CombatEffect;
});