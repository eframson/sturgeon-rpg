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
			self.avgMonsterHpPercentPerHit = data.avgMonsterHpPercentPerHit || 0.3;
			self.quality = data.quality || "standard";
			self.extraDamage = ko.observable(data.extraDamage || 0);
			
			if(self.fullyDynamicStats && self.isScaled() == 0){
				var averages = Utils.calculateAveragesForLevel(self.level());
				var avgPlayerHp = averages.avgPlayerHp;
				var avgMonsterHp = averages.avgMonsterHp;
				
				var avgDmgPerHit = avgMonsterHp * self.avgMonsterHpPercentPerHit;

				//Randomize it a bit
				avgDmgPerHit = Utils.doRand((avgDmgPerHit * 0.5), (avgDmgPerHit * 1.5));
				
				//Let's say the dmg range is -30% - +50%
				self.dmgMin( Math.round(avgDmgPerHit * 0.7) );
				self.dmgMax( Math.round(avgDmgPerHit * 1.5) );
				self.dmgMin( (self.dmgMin() > 1) ? self.dmgMin() : 1 );
				self.dmgMax( (self.dmgMax() > 1) ? self.dmgMax() : 1 );

				if (data.monsterLootCoefficient){
					self.dmgMin( Math.ceil(self.dmgMin() * data.monsterLootCoefficient) );
					self.dmgMax( Math.ceil(self.dmgMax() * data.monsterLootCoefficient) );
				}
				
				self.buyValue( self.dmgMax() * 100 );

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