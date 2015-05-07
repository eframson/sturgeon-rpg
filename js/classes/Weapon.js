define([
	'jquery',
	'knockout',
	'classes/Item'
], function($, ko, Item){

	var Weapon = function(data){

		Item.call(this, data);

		this.dmgMin = data.dmgMin || 0;
		this.dmgMax = data.dmgMax || 1;
		this.handsRequired = data.handsRequired || 1;
	}

	return Weapon;
});