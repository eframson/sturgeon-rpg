define([
	'jquery',
	'knockout',
	'classes/GearItem',
	'classes/DataCollection',
	'json!data/items.json',
	'Utils'
], function($, ko, GearItem, DataCollection, itemDataFile, Utils){

	function Weapon(data){

		this.itemDataCollection = new DataCollection(itemDataFile);

		var self = this;

		data.upgradedWithScrapType = "weapon";

		GearItem.call(this, data);

		this.noExportProps = [
			"itemDataCollection"
		];

		this.init = function(data){
			
			self.dmgMin = ko.observable(data.dmgMin || 0);
			self.dmgMax = ko.observable(data.dmgMax || 1);
			self.handsRequired = data.handsRequired || 1;
			self.isWeapon = true;
			self.isEquippable = true;
			self.fullyDynamicStats = (data.fullyDynamicStats !== undefined) ? data.fullyDynamicStats : 1;
			self.extraDamage = ko.observable(data.extraDamage || 0);
			self.minDmgPctOfAvg = data.minDmgPctOfAvg || 0.9;
			self.maxDmgPctOfAvg = data.maxDmgPctOfAvg || 1.1;
			self.monsterLootCoefficient = data.monsterLootCoefficient || 1;
			self.subtype = data.subtype;
			
			if(self.fullyDynamicStats && self.isScaled() == 0){
				var averages = Utils.calculateAveragesForLevel(self.level());
				var avgDmgPerHit = averages.avgPlayerDmg;

				var calculatedStats = Utils.projectedStatAllotmentsForLevel(self.level());

				//Apply coefficient representing item quality to our average figure
				avgDmgPerHit = calculatedStats.player.weapon[self.handsRequired][self.quality()];
				
				//Let's say the dmg range is -30% - +30%
				self.dmgMin( Math.round(avgDmgPerHit * self.minDmgPctOfAvg) );
				self.dmgMax( Math.round(avgDmgPerHit * self.maxDmgPctOfAvg) );
				self.dmgMin( (self.dmgMin() > 1) ? self.dmgMin() : 1 );
				self.dmgMax( (self.dmgMax() > 1) ? self.dmgMax() : 1 );

				//Shouldn't ever happen, but just to be on the safe side...
				self.dmgMax( (self.dmgMax() < self.dmgMin()) ? self.dmgMin() : self.dmgMax() );
				
				self._buyValue = Math.round( (avgDmgPerHit * 3) + (self.qualityModifier * 10) );
				self._forceRecalculate.valueHasMutated();

				var magicDesc = self.desc;
				var matches = self.desc.match(/%[^%]+%/g);

				if(matches != undefined){
					for(var i = 0; i < matches.length; i++){
						var trimmedMatch = matches[i].replace(/%/g, "");
						magicDesc = magicDesc.replace("%" + trimmedMatch + "%", self[trimmedMatch]());
					}

					self.desc = magicDesc;
				}

				/*if(self.quality() == "exceptional"){
					var bonusDmg = Utils.doRand(1, (self.level() + 1));
					self.extraDamage(bonusDmg);
					Utils.doBasedOnPercent({ 25 : function(){
						self.name = Utils.chooseRandomly(self.itemDataCollection.getNode(["items", "exceptional_weapon_names", self.subtype]));
						self.namedItem(1);
					}});
					self.name = self.name + " +" + self.extraDamage();
					//TODO: Increase buy/sell value based on extra damage amount (dmg amount * level ?)
				}*/

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
	
	Weapon.prototype = Object.create(GearItem.prototype);
	Weapon.prototype.constructor = Weapon;

	return Weapon;
});