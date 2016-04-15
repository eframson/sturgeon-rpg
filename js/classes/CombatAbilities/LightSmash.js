define([
	'jquery',
	'knockout',
	'classes/CombatAbility',
	'Utils'
], function($, ko, CombatAbility, Utils){

	function LightSmash(data){

		var self = this;

		CombatAbility.call(this, data);

		this.init = function(data){

		}

		this.doAfterHit = function(attacker, defender){
			attacker.numTurnsToSkip( attacker.numTurnsToSkip() + 1 );
		}

		this.doOnLevelUp = function(){
		}

		this.getTrainCost = function(){
		}

		this.init(data);
	}

	LightSmash.prototype = Object.create(CombatAbility.prototype);
	LightSmash.prototype.constructor = LightSmash;

	return LightSmash;
});