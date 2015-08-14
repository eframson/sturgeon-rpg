define([
	'jquery',
	'knockout',
	'classes/Ability',
	'Utils'
], function($, ko, Ability, Utils){

	function CombatAbility(data){

		var self = this;

		Ability.call(this, data);

		this.init = function(data){

			self.buttonLabel = data.buttonLabel || self.name;
			self.numAttempts = data.numAttempts || 1;
			self.chanceToHit = data.chanceToHit || undefined;
			self.chanceToCrit = data.chanceToCrit || undefined;
			self.dmg = data.dmg || undefined;
			self.chanceToHitCoefficient = data.chanceToHitCoefficient || 1;
			self.chanceToCritCoefficient = data.chanceToCritCoefficient || 1;
			self.dmgCoefficient = data.dmgCoefficient || undefined;
			self.baseCooldown = data.baseCooldown || 0;
			self.cooldown = data.cooldown || 0;
			self.onHitEffect = data.onHitEffect || undefined;
			self.onMissEffect = data.onHitEffect || undefined;

		}

		this.init(data);

		/*
		//Maybe this way?
		this.onHitEffect = function(){

		}

		this.onMissEffect = function(){

		}
		*/
	}

	CombatAbility.prototype = Object.create(Ability.prototype);
	CombatAbility.prototype.constructor = CombatAbility;

	return CombatAbility;
});