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
			self.quality = data.quality || "standard";

			self.fullyDynamicStats = data.fullyDynamicStats || 0;
			
			if(self.fullyDynamicStats){

				var averages = Utils.calculateAveragesForLevel(self.level());
				var avgPlayerHp = averages.avgPlayerHp;
				var avgMonsterHp = averages.avgMonsterHp;
				var avgMonsterDmg = averages.avgMonsterDmg;
				
				//Let's say the dmg is -30% - +50%
				self.armorValue( Math.ceil(avgMonsterDmg / 3) );

				if (data.monsterLootCoefficient){
					self.armorValue( Math.ceil(self.armorValue() * data.monsterLootCoefficient) );
				}
				
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