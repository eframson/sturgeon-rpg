define([
	'jquery',
	'knockout',
	'classes/Item'
], function($, ko, Item){

	var Armor = function(data){

		Item.call(this, data);

		this.armorValue = data.armorValue || 0;
		this.armorSlot = data.armorSlot || "body";
	}

	return Armor;
});