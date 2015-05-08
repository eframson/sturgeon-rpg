define([
	'jquery',
	'knockout',
	'classes/ItemCollection',
	'classes/Item',
	'classes/Armor',
	'classes/Weapon',

	'Utils',
], function($, ko, ItemCollection, Item, Armor, Weapon){

	function Player(playerData){

		//Init
		var self = this;
		playerData = playerData || {equipment: { armor: {}, }, skills: {}, skillCooldowns : {}, skillProgress : {}, inventory : Array() };

		this.init = function(playerData){

			self.data = ko.observable({

				level : ko.observable(playerData.level || 1),
				hp : ko.observable(playerData.hp || 10),
				inventory : new ItemCollection(Array()),
				inventoryMaxSlots : ko.observable(playerData.inventoryMaxSlots || 1),
				inventorySlotsOccupied : ko.observable(playerData.inventorySlotsOccupied || 0),
				equipment : ko.observable({

					armor : ko.observable({

						head : ko.observable(playerData.equipment.armor.head || {}),
						fin : ko.observable(playerData.equipment.armor.fin || {}),
						body : ko.observable(playerData.equipment.armor.body || {}),
						tail: ko.observable(playerData.equipment.armor.tail || {}),

					}),
					
					weapon : ko.observable(playerData.equipment.weapon || {}),
					shield : ko.observable(playerData.equipment.shield || {}),
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
				speed : ko.observable(playerData.speed || 2),
				gp : ko.observable(playerData.gp || 0),
				baseMinDmg : ko.observable(playerData.baseMinDmg || 1),
				baseMaxDmg : ko.observable(playerData.baseMaxDmg || 2),

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

			this.minDmg = ko.computed(function(){
				//Eventually let's add STR to this value
				var minDmg = self.data().baseMinDmg();
				if( !isEmptyObject(self.data().equipment().weapon()) ){
					minDmg += self.data().equipment().weapon().dmgMin;
				}
				return minDmg;
			});

			this.maxDmg = ko.computed(function(){
				//Eventually let's add STR to this value
				var maxDmg = self.data().baseMaxDmg();
				if( !isEmptyObject(self.data().equipment().weapon()) ){
					maxDmg += self.data().equipment().weapon().dmgMax;
				}
				return maxDmg;
			});

			this.totalArmor = ko.computed(function(){
				var armorValue = 0; //Eventually when DEX is implemented, use that as base AC

				var armorSlots = self.data().equipment().armor();

				for(slot in armorSlots){

					if( !isEmptyObject( armorSlots[slot]() ) ){
						armorValue += armorSlots[slot]().armorValue;
					}

				}

				if( !isEmptyObject(self.data().equipment().shield()) ){
					armorValue += self.data().equipment().shield().armorValue;
				}

				return armorValue;
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

		this.equipWeapon = function(item){
			self._getWeaponSlot()(item);
		}

		this.equipShield = function(item){
			self._getShieldSlot()(item);
		}

		this.equipArmor = function(item){
			self.equipArmorInSlot(item.armorSlot,item);
		}

		this.equipArmorInSlot = function(slot, item){
			self._getArmorSlot(slot)(item);
		}

		this.unEquipWeapon = function(item){
			self._getWeaponSlot()({});
		}

		this.unEquipShield = function(item){
			self._getShieldSlot()({});
		}

		this.unEquipArmor = function(item){
			self.equipArmorInSlot(item.armorSlot,{});
		}

		this.unEquipArmorInSlot = function(slot, item){
			self._getArmorSlot(slot)({});
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

	Player.prototype.constructor = Player;

	return Player;

});
