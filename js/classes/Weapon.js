define([
	'jquery',
	'knockout',
	'classes/Item'
], function($, ko, Item){

	var Weapon = function(data){

		Item.call(this, data);

		this.damageMin = data.damageMin || 0;
		this.damageMax = data.damageMax || 1;
	}

	return Weapon;
});