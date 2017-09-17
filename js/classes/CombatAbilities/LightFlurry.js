define([
	'jquery',
	'knockout',
	'classes/CombatAbility',
	'Utils'
], function($, ko, CombatAbility, Utils){

	function LightFlurry(data){

		var self = this;

		CombatAbility.call(this, data);

		this.init = function(data){

		}

		this.onHit = function(hitData){
			
			var doExtraDmg = Utils.doBasedOnPercent({
				25 : 1,
				75 : 0
			});

			if(doExtraDmg){
				hitData.dmgCoefficient = 1.2;
			}
		}

		this.doOnLevelUp = function(){
		}

		this.getTrainCost = function(){
		}

		this.init(data);
	}

	LightFlurry.prototype = Object.create(CombatAbility.prototype);
	LightFlurry.prototype.constructor = LightFlurry;

	return LightFlurry;
});