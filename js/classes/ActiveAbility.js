define([
	'jquery',
	'knockout',
	'classes/UsableAbility',
	'Utils'
], function($, ko, UsableAbility, Utils){

	function ActiveAbility(data){

		var self = this;

		UsableAbility.call(this, data);

		this.init = function(data){

			self.apCost = (data.apCost !== undefined) ? data.apCost : 1 ;
			self.chanceOfEffect = (data.chanceOfEffect !== undefined) ? data.chanceOfEffect : 1;

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

	ActiveAbility.prototype = Object.create(UsableAbility.prototype);
	ActiveAbility.prototype.constructor = ActiveAbility;

	return ActiveAbility;
});