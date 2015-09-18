define([
	'jquery',
	'knockout',
	'classes/LevelableAbility',
	'Utils'
], function($, ko, LevelableAbility, Utils){

	function ActiveAbility(data){

		var self = this;

		LevelableAbility.call(this, data);

		this.init = function(data){

			self.buttonLabel = data.buttonLabel;
			self.baseCooldown = data.baseCooldown || 0;
			self.cooldown = ko.observable(data.cooldown || 0);
			self.didLevelUp = 0;
			self.canLevelUp = 0;
			self.sortOrder = data.sortOrder;

		}

		this.doSkill = function(delayLevelUp){

			delayLevelUp = (delayLevelUp != undefined) ? delayLevelUp : 1 ;

			//Trigger cooldown
			self.cooldown(self.baseCooldown);

			//See if skill "hit"
			var didHit = self.makeSkillAttempt();

			//Make skill progress
			self.makeProgress(delayLevelUp);
			
			//Return true/false on success/fail
			return didHit;
		}

		this.makeSkillAttempt = function(){
			var hitRoll = Utils.doRand(1, 101);
			return (hitRoll <= self.chanceOfEffect) ? true : false ;
		}

		this.makeProgress = function(delayLevelUp){

			delayLevelUp = (delayLevelUp != undefined) ? delayLevelUp : 1 ;

			self.skillProgress( self.skillProgress() + 1 );

			//Level skill up if progress is sufficient
			if( self.isSkillProgressSufficientToLevel() && !delayLevelUp ){
				self.levelUp();
			}else if( self.isSkillProgressSufficientToLevel() ){
				self.canLevelUp = 1;
			}
		}

		this.isSkillProgressSufficientToLevel = function(){
			return self.skillProgress() >= self.nextSkillLevelAtProgress();
		}

		this.levelUp = function(){
			self.canLevelUp = 0;
			self.didLevelUp = 1;

			if(self.resetProgressOnSkillLevelUp){
				self.skillProgress(0);
			}

			self.updateNextSkillLevelAtProgress();

			self.doOnLevelUp();
		}

		this.updateNextSkillLevelAtProgress = function(){
			//Can be overridden by child
			return true;
		}

		this.doOnLevelUp = function(){
			//Should be overridden by child
			return true;
		}

		this.init(data);
	}

	ActiveAbility.prototype = Object.create(LevelableAbility.prototype);
	ActiveAbility.prototype.constructor = ActiveAbility;

	return ActiveAbility;
});