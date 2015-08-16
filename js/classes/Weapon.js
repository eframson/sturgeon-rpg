define([
	'jquery',
	'knockout',
	'classes/Item',
	'Utils'
], function($, ko, Item, Utils){

	function Weapon(data){

		var self = this;

		Item.call(this, data);

		this.init = function(data){
			self.level = ko.observable(data.level || 1);
			self.dmgMin = ko.observable(data.dmgMin || 0);
			self.dmgMax = ko.observable(data.dmgMax || 1);
			self.handsRequired = data.handsRequired || 1;
			self.isWeapon = true;
			self.isEquippable = true;
			self.fullyDynamicStats = (data.fullyDynamicStats !== undefined) ? data.fullyDynamicStats : 1;
			self.extraDamage = ko.observable(data.extraDamage || 0);
			self.minDmgPctOfAvg = data.minDmgPctOfAvg || 0.7;
			self.maxDmgPctOfAvg = data.maxDmgPctOfAvg || 1.3;
			self.monsterLootCoefficient = data.monsterLootCoefficient || 1;
			
			if(self.fullyDynamicStats && self.isScaled() == 0){
				var averages = Utils.calculateAveragesForLevel(self.level());
				var avgPlayerHp = averages.avgPlayerHp;
				var avgMonsterHp = averages.avgMonsterHp;
				var avgDmgPerHit = averages.avgPlayerDmg;

				//Apply coefficient representing item quality to our average figure
				avgDmgPerHit = avgDmgPerHit * self.qualityModifier;
				
				//Let's say the dmg range is -30% - +30%
				self.dmgMin( Math.round(avgDmgPerHit * self.minDmgPctOfAvg) );
				self.dmgMax( Math.round(avgDmgPerHit * self.maxDmgPctOfAvg) );
				self.dmgMin( (self.dmgMin() > 1) ? self.dmgMin() : 1 );
				self.dmgMax( (self.dmgMax() > 1) ? self.dmgMax() : 1 );

				//Shouldn't ever happen, but just to be on the safe side...
				self.dmgMax( (self.dmgMax() < self.dmgMin()) ? self.dmgMin() : self.dmgMax() );
				
				self.buyValue( Math.round( (avgDmgPerHit * 100) + (self.qualityModifier * 10) ) );

				var magicDesc = self.desc;
				var matches = self.desc.match(/%[^%]+%/g);

				if(matches != undefined){
					for(var i = 0; i < matches.length; i++){
						var trimmedMatch = matches[i].replace(/%/g, "");
						magicDesc = magicDesc.replace("%" + trimmedMatch + "%", self[trimmedMatch]());
					}

					self.desc = magicDesc;
				}

				self.isScaled(1);
			}
		}

		this._applyUpgrade = function(){
			self.dmgMin( self.dmgMin() + 1 );
			self.dmgMax( self.dmgMax() + 1 );
			self.attributesImprovedByLastCrafting = "Max DMG, Min DMG";
		}

		this.init(data);
	}
	
	Weapon.prototype = Object.create(Item.prototype);
	Weapon.prototype.constructor = Weapon;

	return Weapon;
});