define([
	'jquery',
	'knockout',
	'classes/GearItem',
	'Utils'
], function($, ko, GearItem, Utils){

	function Armor(data){

		var self = this;

		data.upgradedWithScrapType = "armor";

		GearItem.call(this, data);

		this.init = function(data){
			self.armorValue = ko.observable(data.armorValue || 0);
			self.armorSlot = data.armorSlot || "body";
			self.isArmor = true;
			self.isEquippable = true;
			self.pctOfAvgArmor = data.pctOfAvgArmor;
			
			if(self.fullyDynamicStats && self.isScaled() == 0){

				var calculatedStats = Utils.projectedStatAllotmentsForLevel(self.level());
				var armorValues = calculatedStats.player.armor;

				armorValues[data.quality];
				
				baseArmorValue = armorValues[data.quality];
				self.armorValue(baseArmorValue);
				
				self._buyValue = self.armorValue() * 100;
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

				self.isScaled(1);
			}

		}

		this._applyUpgrade = function(){
			self.armorValue( self.armorValue() + 1 );
			self.attributesImprovedByLastCrafting = "Armor Value";
		}

		this.init(data);
	}

	//This is how we have to override the "parent" function
	/*Armor.prototype._applyUpgrade = function(){
		self.armorValue( self.armorValue() + 1 );
		self.attributesImprovedByLastCrafting = "Armor Value";
	}*/

	Armor.prototype = Object.create(GearItem.prototype);
	Armor.prototype.constructor = Armor;

	return Armor;
});