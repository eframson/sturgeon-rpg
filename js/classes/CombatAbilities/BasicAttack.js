define([
	'jquery',
	'knockout',
	'classes/CombatAbility',
	'Utils'
], function($, ko, CombatAbility, Utils){

	function BasicAttack(data){

		var self = this;

		CombatAbility.call(this, data);

		this.init = function(data){

		}

		this.doOnLevelUp = function(){

		}

		this.getTrainCost = function(){

		}

		this.init(data);
	}

	BasicAttack.prototype = Object.create(CombatAbility.prototype);
	BasicAttack.prototype.constructor = BasicAttack;

	return BasicAttack;
});