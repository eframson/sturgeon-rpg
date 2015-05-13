define([
	'jquery',
	'knockout',
	'classes/Item'
], function($, ko, Item){

	function Weapon(data){

		var self = this;

		Item.call(this, data);

		this.init = function(data){
			this.dmgMin = ko.observable(data.dmgMin || 0);
			this.dmgMax = ko.observable(data.dmgMax || 1);
			this.handsRequired = data.handsRequired || 1;
			this.isWeapon = true;
		}

		this._applyUpgrade = function(){
			self.dmgMin( self.dmgMin() + 1 );
			self.dmgMax( self.dmgMax() + 1 );
			self.attributesImprovedByLastCrafting = "Max DMG, Min DMG";
		}

		this.init(data);
	}

	//This is how we have to override the "parent" function
	/*Weapon.prototype._applyUpgrade = function(){
		self.dmgMin( self.dmgMin() + 1 );
		self.dmgMax( self.dmgMax() + 1 );
		self.attributesImprovedByLastCrafting = "Max DMG, Min DMG";
	}*/

	Weapon.prototype = Object.create(Item.prototype);
	Weapon.prototype.constructor = Weapon; //Is this actually necessary?

	return Weapon;
});