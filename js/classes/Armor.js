define([
	'jquery',
	'knockout',
	'classes/Item'
], function($, ko, Item){

	function Armor(data){

		var self = this;

		Item.call(this, data);

		this.init = function(){
			//Put armor-specific code here
		}

		this.armorValue = data.armorValue || 0;
		this.armorSlot = data.armorSlot || "body";

		this.init();
	}

	Armor.prototype = Object.create(Item.prototype);
	Armor.prototype.constructor = Armor;

	return Armor;
});