define([
	'jquery',
	'knockout',
	'classes/Item'
], function($, ko, Item){

	function Armor(data){

		var self = this;

		Item.call(this, data);

		this.init = function(data){
			this.armorValue = ko.observable(data.armorValue || 0);
			this.armorSlot = data.armorSlot || "body";
			this.isArmor = true;
			this.isEquippable = true;
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