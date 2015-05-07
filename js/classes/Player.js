define([
	'jquery',
	'knockout',
	'classes/ItemCollection',
	'classes/Item',
	'classes/Armor',
	'classes/Weapon',

	'Utils',
], function($, ko, ItemCollection, Item, Armor, Weapon){

	var Player = function(playerData){

		//Init
		var self = this;
		playerData = playerData || {equipment: { armor: {}, }, skills: {}, skillCooldowns : {}, skillProgress : {}, inventory : Array() };

		this.init = function(playerData){

			self.data = ko.observable({

				level : ko.observable(playerData.level || 1),
				hp : ko.observable(playerData.hp || 10),
				armor : ko.observable(playerData.armor || 0),
				inventory : new ItemCollection(Array()),
				inventoryMaxSlots : ko.observable(playerData.inventoryMaxSlots || 1),
				inventorySlotsOccupied : ko.observable(playerData.inventorySlotsOccupied || 0),
				equipment : ko.observable({

					armor : ko.observable({

						head : ko.observable(playerData.equipment.armor.head || undefined),
						fin : ko.observable(playerData.equipment.armor.fin || undefined),
						body : ko.observable(playerData.equipment.armor.body || undefined),
						tail: ko.observable(playerData.equipment.armor.tail || undefined),

					}),
					
					weapon : ko.observable(playerData.equipment.weapon || undefined),
					shield : ko.observable(playerData.equipment.shield || undefined),
				}),
				skills : ko.observable({
					scanSquares : ko.observable(playerData.skills.scanSquares || 2),
					findFood : ko.observable(playerData.skills.findFood || 100),
					visionRange : ko.observable(playerData.skills.visionRange || 1),
				}),
				skillCooldowns : ko.observable({
					scanSquares : ko.observable(playerData.skillCooldowns.scanSquares || 0),
					findFood : ko.observable(playerData.skillCooldowns.findFood || 0),
				}),
				skillProgress : ko.observable({
					scanSquares : ko.observable(playerData.skillProgress.scanSquares || 0),
					findFood : ko.observable(playerData.skillProgress.findFood || 0),
					speed : ko.observable(playerData.skillProgress.speed || 0),

				}),
				abilities : ko.observableArray(playerData.abilities || Array()),
				speed : ko.observable(playerData.level || 1),
				gp : ko.observable(playerData.gp || 0),

			});

			var itemArray = Array();
			for(i = 0; i < playerData.inventory.length; i++){
				itemArray.push( new Item(playerData.inventory[i]) );
			}
			self.data().inventory(itemArray);

			this.inventorySlotsAvailable = ko.computed(function(){
				return self.data().inventoryMaxSlots() - self.data().inventorySlotsOccupied();
			});

			this.hasInventorySpace = ko.computed(function(){
				return ( self.inventorySlotsAvailable() > 0 );
			});
		}

		this.addItemToInventory = function(itemToAdd){

			var numInInventory = self.data().inventory.addItem(
				itemToAdd,
				function(){
					var hasSpace = self.hasInventorySpace();
					if( !hasSpace && itemToAdd.id != "gold"){
						return false;
					}
					return true;
				},
				function(){
					if(itemToAdd.id != "gold"){
						self.data().inventorySlotsOccupied( self.data().inventorySlotsOccupied() + itemToAdd.slotsRequired );
					}
				}
			);

			return numInInventory;
		}

		this.removeItemFromInventory = function(itemID, qty){

			var existingItem = self.getInventoryItemByID(itemID),
				slotsRequired = existingItem.slotsRequired;

			var numLeft = self.data().inventory.removeItem(itemID, qty);
				
			if(numLeft === 0){
				self.data().inventorySlotsOccupied( self.data().inventorySlotsOccupied() - slotsRequired );
			}else if( numLeft == false ){
				console.log("could not remove item");
			}
		}

		this.setInventoryItemQty = function(itemOrItemID, qty){

			return self.data().inventory.setItemQty(itemOrItemID, qty);

		}

		this.getInventoryItemByID = function(itemID){

			return self.data().inventory.getItemByID(itemID);

		}

		this.getEquippedArmorBySlot = function(slot){
			return self._getArmorSlot(slot)();
		}

		this.getEquippedWeapon = function(slot){
			return self._getWeaponSlot()();
		}

		this.getEquippedShield = function(slot){
			return self._getShieldSlot()();
		}

		this.equipArmorInSlot = function(slot, item){
			self._getArmorSlot(slot)(item);
		}

		this.equipWeapon = function(item){
			self._getWeaponSlot()(item);
		}

		this.equipShield = function(item){
			self._getShieldSlot()(item);
		}

		this.equipArmorInSlot = function(slot, item){
			self._getArmorSlot(slot)(item);
		}

		this._getArmorSlot = function(slot){
			return self.data().equipment().armor()[slot];
		}

		this._getWeaponSlot = function(){
			return self.data().equipment().weapon;
		}

		this._getShieldSlot = function(){
			return self.data().equipment().shield;
		}

		this.getExportData = function(){

			var exportObj = {};

			for (prop in self.data()){
				if(prop != "inventory"){
					exportObj[prop] = self.data()[prop];
				}
			}

			exportObj.inventory = Array();
			$.each( self.data().inventory(), function(idx, elem){
				exportObj.inventory.push( elem.getExportData() );
			});

			return ko.mapping.toJS( exportObj );
		}

		self.init(playerData);
	}

	return Player;

});
