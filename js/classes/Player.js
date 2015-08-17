define([
	'jquery',
	'knockout',
	'classes/Entity',
	'classes/ItemCollection',
	'classes/Item',
	'classes/Consumable',
	'classes/Armor',
	'classes/Shield',
	'classes/Weapon',

	'Utils',
], function($, ko, Entity, ItemCollection, Item, Consumable, Armor, Shield, Weapon, Utils){

	function Player(playerData){

		//Init
		var self = this;
		playerData = $.extend({equipment: { armor: {}, }, skills: {}, skillCooldowns : {}, skillProgress : {}, inventory : Array() }, playerData);

		Entity.call(this, playerData);

		this.init = function(playerData){

			self.level = ko.observable(playerData.level || 1);
			self.hp = ko.observable(playerData.hp || 0);
			self.baseHp = ko.observable(playerData.baseHp || 20);
			self.exp = ko.observable(playerData.exp || 0);
			self.inventory = new ItemCollection(Array());
			self.inventoryMaxSlots = ko.observable(playerData.inventoryMaxSlots || 5);
			self.equipment = ko.observable({

				armor : ko.observable({

					head : self._instantiateObservableIfSet(playerData.equipment.armor.head, Armor),
					fin : self._instantiateObservableIfSet(playerData.equipment.armor.fin, Armor),
					body : self._instantiateObservableIfSet(playerData.equipment.armor.body, Armor),
					tail : self._instantiateObservableIfSet(playerData.equipment.armor.tail, Armor)

				}),

				weapon : self._instantiateObservableIfSet(playerData.equipment.weapon, Weapon),
				shield : self._instantiateObservableIfSet(playerData.equipment.shield, Shield),
			});
			self.skills = ko.observable({
				scanSquares : ko.observable(playerData.skills.scanSquares || 1),
				findFood : ko.observable(playerData.skills.findFood || "poor"),
				visionRange : ko.observable( (playerData.skills.visionRange != undefined) ? playerData.skills.visionRange : 0 ),
			});
			self.skillCooldowns = ko.observable({
				scanSquares : ko.observable(playerData.skillCooldowns.scanSquares || 0),
				findFood : ko.observable(playerData.skillCooldowns.findFood || 0),
			});
			self.skillProgress = ko.observable({
				scanSquares : ko.observable(playerData.skillProgress.scanSquares || 0),
				findFood : ko.observable(playerData.skillProgress.findFood || 0),
				speed : ko.observable(playerData.skillProgress.speed || 0),

			});
			self.abilities = ko.observableArray(playerData.abilities || Array());
			self.speed = ko.observable(playerData.speed || 2);
			self.str = ko.observable(playerData.str || Utils.doRand(1,6));
			self.dex = ko.observable(playerData.dex || Utils.doRand(1,6));
			self.end = ko.observable(playerData.end || Utils.doRand(1,6));
			self.baseChanceToCrit = ko.observable(playerData.baseChanceToCrit || 5);
			self.hasLeveledUp = ko.observable(playerData.hasLeveledUp || false);

			//Why is this necessary??
			self.isDead = ko.computed(function(){
				return self.hp() < 1;
			});

			var itemArray = Array();
			for(i = 0; i < playerData.inventory.length; i++){
				if(playerData.inventory[i]._classNameForLoad){
					itemArray.push(  eval("new " + playerData.inventory[i]._classNameForLoad +"(playerData.inventory[i])")  );
				}else{
					itemArray.push( new Item(playerData.inventory[i]) );
				}
			}
			self.inventory.items(itemArray);

			this.inventorySlotsOccupied = ko.computed(function(){
				var slotsOccupied = 0;
				for(i=0; i < self.inventory.items().length; i++){
					slotsOccupied += self.inventory.items()[i].slotsRequired;
				}
				return slotsOccupied;
			});

			this.inventorySlotsAvailable = ko.computed(function(){
				return self.inventoryMaxSlots() - self.inventorySlotsOccupied();
			});

			this.hasInventorySpace = ko.computed(function(){
				return ( self.inventorySlotsAvailable() > 0 );
			});

			this.baseMinDmg = ko.computed(function(){
				return Math.ceil(self.str() * 0.5);
			});

			this.baseMaxDmg = ko.computed(function(){
				return Math.ceil(self.str() * 1.2);
			});

			this.minDmg = ko.computed(function(){
				//Eventually let's add STR to this value
				var minDmg = self.baseMinDmg();
				if( !Utils.isEmptyObject(self.equipment().weapon()) ){
					minDmg += self.equipment().weapon().dmgMin();
				}
				return minDmg;
			});

			this.maxDmg = ko.computed(function(){
				//Eventually let's add STR to this value
				var maxDmg = self.baseMaxDmg();
				if( !Utils.isEmptyObject(self.equipment().weapon()) ){
					maxDmg += self.equipment().weapon().dmgMax();
				}
				return maxDmg;
			});

			this.totalArmor = ko.computed(function(){
				var armorValue = Math.floor(self.dex() / 2);

				var armorSlots = self.equipment().armor();

				for(slot in armorSlots){

					if( !Utils.isEmptyObject( armorSlots[slot]() ) ){
						armorValue += armorSlots[slot]().armorValue();
					}

				}

				if( !Utils.isEmptyObject(self.equipment().shield()) ){
					armorValue += self.equipment().shield().armorValue();
				}

				return armorValue;
			});

			self.armor = self.totalArmor;

			self.gp = ko.computed(function(){
				var gold = self.inventory.getItemByID("gold");

				if(gold){
					return gold.qty();
				}else{
					return 0;
				}
			});

			self.weaponScraps = ko.computed(function(){
				var scraps = self.inventory.getItemByID("weapon_scraps");

				if(scraps){
					return scraps.qty();
				}else{
					return 0;
				}
			});

			self.armorScraps = ko.computed(function(){
				var scraps = self.inventory.getItemByID("armor_scraps");

				if(scraps){
					return scraps.qty();
				}else{
					return 0;
				}
			});

			self.maxHp = ko.computed(function(){
				return self.baseHp() + (self.end() * 2);
			});

			self.expRequiredForNextLevel = ko.computed(function(){
				return self.level() * 100;
			});

			self.numPotionsAvailable = ko.computed(function(){
				var pots = self.inventory.getItemByID("health_potion");

				if(pots){
					return pots.qty();
				}else{
					return 0;
				}
			});

			this.chanceToCrit = ko.computed(function(){
				return self.baseChanceToCrit() + self.dex();
			});

			//Actual init stuff
			if(self.hp() == 0){
				self.hp( self.maxHp() );
			}
		}

		this.addItemToInventory = function(itemToAdd, ignoreInventoryConstraints){

			ignoreInventoryConstraints = (ignoreInventoryConstraints === undefined) ? false : ignoreInventoryConstraints ;

			var numJustAdded = self.inventory.addItem(
				itemToAdd,
				function(){
					if(ignoreInventoryConstraints){
						return true;
					}
					var hasSpace = self.inventorySlotsAvailable() >= itemToAdd.slotsRequired;
					if( !hasSpace && itemToAdd.id != "gold"){
						return false;
					}
					return true;
				}
			);

			return numJustAdded;
		}

		this.removeItemFromInventory = function(itemID, qty){

			var existingItem = self.getInventoryItemByID(itemID),
				slotsRequired = existingItem.slotsRequired;

			var numLeft = self.inventory.removeItem(itemID, qty);

			if( numLeft === false ){
				console.log("could not remove item");
			}
		}

		this.setInventoryItemQty = function(itemOrItemID, qty){

			return self.inventory.setItemQty(itemOrItemID, qty);

		}

		this.getInventoryItemByID = function(itemID){

			return self.inventory.getItemByID(itemID);

		}

		this.getEquippedArmorBySlot = function(slot){
			return self._getArmorSlot(slot)();
		}

		this.getEquippedWeapon = function(){
			return self._getWeaponSlot()();
		}

		this.getEquippedShield = function(){
			return self._getShieldSlot()();
		}

		this.equipWeapon = function(item){
			var existingItem = self._getWeaponSlot()();
			self._getWeaponSlot()(item);
			return existingItem;
		}

		this.equipShield = function(item){
			var existingItem = self._getShieldSlot()();
			self._getShieldSlot()(item);
			return existingItem;
		}

		this.equipArmor = function(item){
			var existingItem = self._getArmorSlot(item.armorSlot)();
			self.equipArmorInSlot(item.armorSlot,item);
			return existingItem;
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
			return self.equipment().armor()[slot];
		}

		this._getWeaponSlot = function(){
			return self.equipment().weapon;
		}

		this._getShieldSlot = function(){
			return self.equipment().shield;
		}

		this.addExp = function(xp){
			var potentialTotalXp = self.exp() + xp;
			if(potentialTotalXp >= self.expRequiredForNextLevel()){
				self.exp( potentialTotalXp - self.expRequiredForNextLevel() );
				self.level( self.level() + 1 );
				self.levelUp();
			}else{
				self.exp( potentialTotalXp );
			}
		}

		this.levelUp = function(){
			//Add stats
			self.hasLeveledUp(true);
			self.baseHp( self.baseHp() + 5 );
			self.hp(self.maxHp());
			self.skillProgress().findFood( self.skillProgress().findFood() + 1 );
			self.end( self.end() + 1 );

			if( self.level() % 3 == 0){
				self.str( self.str() + 1 );
				self.dex( self.dex() + 1 );
			}
			if( self.level() % 4 == 0){
				self.speed( self.speed() + 1 );
				self.inventoryMaxSlots( self.inventoryMaxSlots() + 1 );
			}

			self._updateFindFoodSkillIfProgressIsSufficient();
			//Reset cooldowns on level up?
		}

		this.restoreHealth = function(amt, isPct){

			var toRestoreAmt = amt;
			var maxHp = self.maxHp();
			var hp = self.hp();

			if(isPct){
				toRestoreAmt = Math.round(amt * maxHp);
			}

			toRestoreAmt = (toRestoreAmt <= (maxHp - hp)) ? toRestoreAmt : (maxHp - hp) ;

			self.hp( hp + toRestoreAmt );
		}

		this.hasWeapon = function(){
			return !Utils.isEmptyObject( self.getEquippedWeapon() );
		}

		this._updateFindFoodSkillIfProgressIsSufficient = function(){
			if(self.skillProgress().findFood() == 10){
				self._levelUpFindFoodSkill();
				self.skillProgress().findFood(0);
			}
		}

		this._levelUpFindFoodSkill = function(){
			var skillProgression = [
				"poor",
				"good",
				"great",
				"exceptional"
			];

			var currentSkill = self.skills().findFood();

			var currentIdx = skillProgression.indexOf(currentSkill);

			if(currentIdx < (skillProgression.length - 1)){
				currentIdx++;
				self.skills().findFood(skillProgression[currentIdx]);
			}
			
		}

		this.getExportData = function(){


			var exportObj = {};

			exportObj._classNameForLoad = self.constructor.name;

			for(prop in self){
				if(prop != "inventory"){
					if ( typeof self[prop] !== 'function' ){
						exportObj[prop] = self[prop];
					}else if (ko.isObservable(self[prop])) {
						exportObj[prop] = self[prop]();
					}
				}
			}

			exportObj.inventory = self.inventory.getExportData();

			return ko.mapping.toJS( exportObj );

			/*var exportObj = {};

			for (prop in self){
				if(prop != "inventory"){
					exportObj[prop] = self[prop];
				}
			}

			exportObj.inventory = self.inventory.getExportData();

			return ko.mapping.toJS( exportObj );*/
		}

		this._instantiateObservableIfSet = function(obj, className){
			return ko.observable(obj !== undefined && !Utils.isEmptyObject(obj) ? new className(obj) : {});
		}

		self.init(playerData);
	}

	Player.prototype = Object.create(Entity.prototype);
	Player.prototype.constructor = Player;

	return Player;

});
