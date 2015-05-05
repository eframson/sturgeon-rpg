define([
	'jquery',
	'knockout',
	'classes/Item',

	'Utils',
], function($, ko, Item){

	var Player = function(playerData){

		//Init
		var self = this;
		playerData = playerData || {equipment: {}, skills: {}, skillCooldowns : {}, skillProgress : {}, inventory : Array() };

		this.init = function(playerData){

			self.data = ko.observable({

				level : ko.observable(playerData.level || 1),
				hp : ko.observable(playerData.hp || 10),
				armor : ko.observable(playerData.armor || 0),
				inventory : ko.observableArray(Array()),
				inventoryMaxSlots : ko.observable(playerData.inventoryMaxSlots || 5),
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
					findFood : ko.observable(playerData.skills.findFood || 20),
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

			});

			var itemArray = Array();
			for(i = 0; i < playerData.inventory.length; i++){
				itemArray.push( new Item(playerData.inventory[i]) );
			}
			self.data().inventory(itemArray);
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
			if(itemToAdd == undefined || itemToAdd.constructor != Item){
				return false;
			}

			if(itemToAdd.slotsRequired > (self.data().inventoryMaxSlots() - self.data().inventorySlotsOccupied()) ){
				return false;
			}
			
			var existingItem = false;

			if(itemToAdd.stackable){
				
				var existingItem = self.getInventoryItemByID(itemToAdd.id);
				
				if(existingItem){
					existingItem.qty( existingItem.qty() + itemToAdd.qty() );
				}
			}
			
			if(!existingItem){
			
				self.data().inventory.push(itemToAdd);
				
				if( itemToAdd.id != "gold" ){
					self.data().inventorySlotsOccupied( self.data().inventorySlotsOccupied() + itemToAdd.slotsRequired );
				}

			}

			return true;
		}

		this.removeItemFromInventory = function(itemID, qty){

			var item = self.getInventoryItemByID(itemID);

			if(!item){
				return false;
			}

			var existingQty = item.qty();

			if( qty == undefined || qty && (qty == "all" || qty >= existingQty) ){
				self.data().inventory.remove(item);
				self.data().inventorySlotsOccupied( self.data().inventorySlotsOccupied() - 1 );
				return 0;
			}else{
				item.qty( existingQty - qty );
				return item.qty();
			}
		}

		this.setInventoryItemQty = function(itemOrItemID, qty){

			if(!itemOrItemID || typeof qty != "number"){
				return false;
			}

			//There's probably a better way to check for this...
			if(typeof itemOrItemID != "object"){
				itemOrItemID = self.getInventoryItemByID(itemID);
			}

			itemOrItemID.qty(qty);

		}

		this.getInventoryItemByID = function(itemID){

			for(i = 0; i < self.data().inventory().length; i++){
				if( itemID == self.data().inventory()[i].id ){
					return self.data().inventory()[i];
				}
			}
			return false;

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
