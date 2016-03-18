define([
	'jquery',
	'knockout',
	'classes/ActiveAbility',
	'Utils'
], function($, ko, ActiveAbility, Utils){

	function LevelableActiveAbility(data){

		var self = this;

		ActiveAbility.call(this, data);

		this.isLevelable = 1;

		this.init = function(data){


			self.skillLevel = ko.observable((data.skillLevel !== undefined) ? data.skillLevel : 1 );
			self.skillLevelString = ko.observable((data.skillLevelString !== undefined) ? data.skillLevelString : "Skill level" );
			self.skillProgress = ko.observable(data.skillProgress || 0);
			self.nextSkillLevelAtProgress = ko.observable(data.nextSkillLevelAtProgress || 10);
			self.resetProgressOnSkillLevelUp = (data.resetProgressOnSkillLevelUp !== undefined) ? data.resetProgressOnSkillLevelUp : 1 ;
			self.canTrainNextLevel = ko.observable( (data.canTrainNextLevel !== undefined) ? data.canTrainNextLevel : 1 );
			self.requiredLevel = data.requiredLevel || 0;



			self.baseCooldown = data.baseCooldown || 0;
			self.cooldown = ko.observable(data.cooldown || 0);
			self.didLevelUp = 0;
			self.canLevelUp = 0;

		}

		this.doSkill = function(delayLevelUp){

			delayLevelUp = (delayLevelUp != undefined) ? delayLevelUp : 1 ;

			//Trigger cooldown
			self.triggerCooldown();

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
			return 1;
		}

		this.getTrainCost = function(){
			//Should be overridden by child
			return 0;
		}

		this.triggerCooldown = function(){
			self.cooldown(self.baseCooldown);
		}

		this.init(data);
	}

	LevelableActiveAbility.prototype = Object.create(ActiveAbility.prototype);
	LevelableActiveAbility.prototype.constructor = LevelableActiveAbility;

	return LevelableActiveAbility;
});