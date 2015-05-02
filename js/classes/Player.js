define([
	'jquery',
	'knockout',
	'classes/Item',

	'Utils',
], function($, ko, Item){

	var Player = function(playerData){

		//Init
		var self = this;
		playerData = playerData || {equipment: {}, skills: {}, skillCooldowns : {}, skillProgress : {}};

		this.data = ko.observable({

			level : ko.observable(playerData.level || 1),
			hp : ko.observable(playerData.hp || 10),
			inventory : ko.observableArray(playerData.inventory || Array()),
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
				findEnemies: ko.observable(playerData.skills.findEnemies || 1),
				findFood: ko.observable(playerData.skills.findFood || 1),
				visionRange: ko.observable(playerData.skills.visionRange || 1),
			}),
			skillCooldowns : ko.observable({
				findEnemies : ko.observable(playerData.skillCooldowns.findEnemies || 0),
				findFood: ko.observable(playerData.skillCooldowns.findFood || 0),
			}),
			skillProgress : ko.observable({
				findEnemies : ko.observable(playerData.skillProgress.findEnemies || 0),
				findFood: ko.observable(playerData.skillProgress.findFood || 0),
				speed: ko.observable(playerData.skillProgress.speed || 0),
				
			}),			
			abilities : ko.observableArray(playerData.abilities || Array()),
			speed : ko.observable(playerData.level || 1),

		});
		//End init

		this.getData = function(){
			return self.data();
		}

		this.loadFromData = function(playerData){
			if(playerData == undefined){
				return false;
			}
			console.log(playerData);
		}
		
		this.addItemToInventory = function(itemToAdd){
			if(itemToAdd == undefined || itemToAdd.constructor != Item){
				return false;
			}
			
			if(itemToAdd.slotsRequired > (self.data().inventoryMaxSlots() - self.data().inventorySlotsOccupied()) ){
				return false;
			}
			
			if(itemToAdd.stackable){

				$.each(self.data().inventory(), function(idx, item){
					if(item.id == itemToAdd.id ){
						item.qty( item.qty() + itemToAdd.qty );
					}
				});
				
				self.data().inventory.push(itemToAdd);
				self.data().inventorySlotsOccupied( self.data().inventorySlotsOccupied() + itemToAdd.slotsRequired );
				
			}else{
				self.data().inventory.push(itemToAdd);
				self.data().inventorySlotsOccupied( self.data().inventorySlotsOccupied() + itemToAdd.slotsRequired );
			}
			
			return true;

			
			//inventory
			//inventoryMaxSlots
			//inventorySlotsOccupied
		}
	}

	return Player;

});