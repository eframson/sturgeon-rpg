define([
	'jquery',
	'knockout',
	'classes/CombatAbility',
	'Utils'
], function($, ko, CombatAbility, Utils){

	function Stun(data){

		var self = this;

		CombatAbility.call(this, data);

		this.init = function(data){

		}

		this.doOnLevelUp = function(){
			//Advance to next skill stage (if possible)
			/*var idxOf = self.skillStages.indexOf(self.skillLevel());
			if(idxOf < (self.skillStages.length - 1)){
				idxOf++;
				self.skillLevel( self.skillStages[idxOf] );
			}else{
				self.canTrainNextLevel(0);
				self.didLevelUp = 0;
			}*/
		}

		this.getTrainCost = function(){
			/*var baseCost = (self.skillStages.indexOf(self.skillLevel()) + 1) * 1000
			return baseCost + ((self.skillProgress() + 1) * 200);*/
		}

		this.init(data);
	}

	Stun.prototype = Object.create(CombatAbility.prototype);
	Stun.prototype.constructor = Stun;

	return Stun;
});