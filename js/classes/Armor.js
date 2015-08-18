define([
	'jquery',
	'knockout',
	'classes/Item',
	'Utils'
], function($, ko, Item, Utils){

	function Armor(data){

		var self = this;

		Item.call(this, data);

		this.init = function(data){
			self.level = ko.observable(data.level || 1);
			self.armorValue = ko.observable(data.armorValue || 0);
			self.armorSlot = data.armorSlot || "body";
			self.isArmor = true;
			self.isEquippable = true;
			self.canUpgrade = (data.canUpgrade !== undefined) ? data.canUpgrade : 1;
			self.canBreakdown = (data.canBreakdown !== undefined) ? data.canBreakdown : 1;
			self.pctOfAvgArmor = data.pctOfAvgArmor;

			self.fullyDynamicStats = (data.fullyDynamicStats !== undefined) ? data.fullyDynamicStats : 1;
			
			if(self.fullyDynamicStats && self.isScaled() == 0){

				var averages = Utils.calculateAveragesForLevel(self.level());
				var avgPlayerHp = averages.avgPlayerHp;
				var avgMonsterHp = averages.avgMonsterHp;
				var avgMonsterDmg = averages.avgMonsterDmg;
				var baseArmorValue = averages.avgPlayerArmorValue;

				baseArmorValue = baseArmorValue * self.pctOfAvgArmor * self.qualityModifier;
				baseArmorValue = Math.round(baseArmorValue);
				baseArmorValue = (baseArmorValue > 0) ? baseArmorValue : 1;
				self.armorValue(baseArmorValue);
				
				self.buyValue( self.armorValue() * 100 );

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

	Armor.prototype = Object.create(Item.prototype);
	Armor.prototype.constructor = Armor;

	return Armor;
});