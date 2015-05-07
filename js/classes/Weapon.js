define([
	'jquery',
	'knockout',
	'classes/Item'
], function($, ko, Item){

	function Weapon(data){

		var self = this;

		Item.call(this, data);

		this.init = function(){
			//Put weap-specific code here
		}

		this.dmgMin = data.dmgMin || 0;
		this.dmgMax = data.dmgMax || 1;
		this.handsRequired = data.handsRequired || 1;

		this.init();
	}

	Weapon.prototype = Object.create(Item.prototype);
	Weapon.prototype.constructor = Weapon; //Is this actually necessary?

	return Weapon;
});