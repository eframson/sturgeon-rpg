define([
	'jquery',
	'knockout',
	'classes/ItemCollection',
	'classes/Item',

	'Utils',
], function($, ko, ItemCollection, Item){

	var Player = function(playerData){

		//Init
		var self = this;
		playerData = playerData || {equipment: {}, skills: {}, skillCooldowns : {}, skillProgress : {}, inventory : Array() };

		this.init = function(playerData){

			self.data = ko.observable({

				level : ko.observable(playerData.level || 1),
				hp : ko.observable(playerData.hp || 10),
				armor : ko.observable(playerData.armor || 0),
				inventory : new ItemCollection(Array()),
				inventoryMaxSlots : ko.observable(playerData.inventoryMaxSlots || 1),
				inventorySlotsOccupied : ko.observable(playerData.inventorySlotsOccupied || 0),
				equipment : ko.observable({
					headArmor : ko.observable(playerData.equipment.headArmor || undefined),
					finArmor : ko.observable(playerData.equipment.finArmor || undefined),
					bodyArmor : ko.observable(playerData.equipment.bodyArmor || undefined),
					tailArmor: ko.observable(playerData.equipment.tailArmor || undefined),
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

		this.getData = function(){
			return self.data();
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

		this.itemTest = function(){

			var food = new Item({
				id : 'biscuit_food',
				name : "Fish Biscuits",
				type : "food",
				desc : "Fish Biscuits are small, compacted squares of delicious berries, bugs, bacon, and high fructose corn syrup. \"Fish Biscuits: They're what fish crave!\"",
				qty : 1,
			});

			self.addItemToInventory(food);

			var moreFood = new Item({
				id : 'biscuit_food',
				name : "Fish Biscuits",
				type : "food",
				qty : 3,
			});

			self.addItemToInventory(moreFood);

			var someItem = new Item({
				id : 'rock',
				name : "Rocks",
				type : "misc",
				qty : 1,
			});

			self.addItemToInventory(someItem);

			var someOtherItem = new Item({
				id : 'dirt',
				name : "Dirt",
				type : "misc",
				qty : 4,
			});

			self.addItemToInventory(someOtherItem);

		}

		self.init(playerData);
	}

	return Player;

});
