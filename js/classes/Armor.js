define([
	'jquery',
	'knockout',
	'classes/Item'
], function($, ko, Item){

	function Armor(data){

		var self = this;

		Item.call(this, data);

		this.init = function(data){
			self.level = ko.observable(data.level || 1);
			self.armorValue = ko.observable(data.armorValue || 0);
			self.armorSlot = data.armorSlot || "body";
			self.isArmor = true;
			self.isEquippable = true;

			self.fullyDynamicStats = data.fullyDynamicStats || 0;
			
			if(self.fullyDynamicStats){
				//Obviously move this to a central location...
				var avgPlayerHp = ( self.level() > 1 ? self.level() + 1 : self.level()) * 6;
				var avgMonsterHp = Math.round(avgPlayerHp / 2);
				var avgMonsterDmg = avgMonsterHp / 3;
				
				//Let's say the dmg is -30% - +50%
				self.armorValue( Math.ceil(avgMonsterDmg / 3) );
				
				self.buyValue( self.armorValue() * 100 );
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