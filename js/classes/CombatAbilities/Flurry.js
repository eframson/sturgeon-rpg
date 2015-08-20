define([
	'jquery',
	'knockout',
	'classes/CombatAbility',
	'Utils'
], function($, ko, CombatAbility, Utils){

	function Flurry(data){

		var self = this;

		CombatAbility.call(this, data);

		this.init = function(data){

		}

		this.onHit = function(hitData){
			
			var doExtraDmg = Utils.doBasedOnPercent({
				30 : 1,
				70 : 0
			});

			if(doExtraDmg){
				hitData.dmgCoefficient = 1.5;
			}
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

	Flurry.prototype = Object.create(CombatAbility.prototype);
	Flurry.prototype.constructor = Flurry;

	return Flurry;
});