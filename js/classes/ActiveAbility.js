define([
	'jquery',
	'knockout',
	'classes/OverworldAbility',
	'Utils'
], function($, ko, OverworldAbility, Utils){

	function ActiveAbility(data){

		var self = this;

		OverworldAbility.call(this, data);

		this.init = function(data){

			self.buttonLabel = data.buttonLabel;
			self.sortOrder = data.sortOrder;
			self.apCost = (data.apCost !== undefined) ? data.apCost : 1 ;

		}

		this.doSkill = function(){

			//See if skill "hit"
			var didHit = self.makeSkillAttempt();
			
			//Return true/false on success/fail
			return didHit;
		}

		this.makeSkillAttempt = function(){
			var hitRoll = Utils.doRand(1, 101);
			return (hitRoll <= self.chanceOfEffect) ? true : false ;
		}

		this.init(data);
	}

	ActiveAbility.prototype = Object.create(OverworldAbility.prototype);
	ActiveAbility.prototype.constructor = ActiveAbility;

	return ActiveAbility;
});