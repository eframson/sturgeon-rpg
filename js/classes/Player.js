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
	'classes/DataCollection',

	'json!data/skills.json',
	'Utils',
], function($, ko, Entity, ItemCollection, Item, Consumable, Armor, Shield, Weapon, DataCollection, skillDataFile, Utils){

	function Player(data){

		//Init
		var self = this;
		data = $.extend({equipment: { armor: {}, }, inventory : Array(), activeAbilities : {}, combatAbilities : {}, passiveAbilities : {} }, data);

		Entity.call(this, data);

		this.init = function(data){

			self.skillDataCollection = new DataCollection(skillDataFile);

			self.level = ko.observable(data.level || 1);
			self.hp = ko.observable(data.hp || 0);
			self.baseHp = ko.observable(data.baseHp || 20);
			self.exp = ko.observable(data.exp || 0);
			self.inventory = new ItemCollection(Array());
			self.inventoryMaxSlots = ko.observable(data.inventoryMaxSlots || 5);
			self.equipment = ko.observable({

				armor : ko.observable({

					head : self._instantiateObservableIfSet(data.equipment.armor.head, Armor),
					fin : self._instantiateObservableIfSet(data.equipment.armor.fin, Armor),
					body : self._instantiateObservableIfSet(data.equipment.armor.body, Armor),
					tail : self._instantiateObservableIfSet(data.equipment.armor.tail, Armor)

				}),

				weapon : self._instantiateObservableIfSet(data.equipment.weapon, Weapon),
				shield : self._instantiateObservableIfSet(data.equipment.shield, Shield),
			});

			if(Utils.isEmptyObject(data.activeAbilities)){
				data.activeAbilities = {
					find_food: {},
					scan_squares: {}
				};
			}

			if(Utils.isEmptyObject(data.combatAbilities)){
				data.combatAbilities = {
					basic_attack: {},
					//stun : {},
					//mighty : {},
					//flurry: {}
				};
			}

			self.activeAbilities = ko.observable({});
			self.combatAbilities = ko.observable({});
			self.passiveAbilities = ko.observable({});

			$.each(data.activeAbilities, function(idx, elem){

				self.addActiveAbility(idx, elem);

			});

			$.each(data.combatAbilities, function(idx, elem){

				self.addCombatAbility(idx, elem);

			});

			$.each(data.passiveAbilities, function(idx, elem){

				self.addPassiveAbility(idx, elem);

			});

			self.speed = ko.observable(data.speed || 2);
			self.str = ko.observable(data.str || Utils.doRand(1,6));
			self.dex = ko.observable(data.dex || Utils.doRand(1,6));
			self.end = ko.observable(data.end || Utils.doRand(1,6));
			self.baseChanceToCrit = ko.observable(data.baseChanceToCrit || 5);
			self.hasLeveledUp = ko.observable(data.hasLeveledUp || false);
			self.availablePerkPoints = ko.observable(data.availablePerkPoints || 0);

			//Why is this necessary??
			self.isDead = ko.computed(function(){
				return self.hp() < 1;
			});

			var itemArray = Array();
			for(i = 0; i < data.inventory.length; i++){
				if(data.inventory[i]._classNameForLoad){
					itemArray.push(  eval("new " + data.inventory[i]._classNameForLoad +"(data.inventory[i])")  );
				}else{
					itemArray.push( new Item(data.inventory[i]) );
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

			this.hasWeapon = ko.computed(function(){
				return !Utils.isEmptyObject( self.getEquippedWeapon() );
			});

			this.minDmg = ko.computed(function(){
				//Eventually let's add STR to this value
				var minDmg = self.baseMinDmg();
				if( self.hasWeapon() ){
					minDmg += self.getEquippedWeapon().dmgMin();
				}
				return minDmg;
			});

			this.maxDmg = ko.computed(function(){
				//Eventually let's add STR to this value
				var maxDmg = self.baseMaxDmg();
				if( self.hasWeapon() ){
					maxDmg += self.getEquippedWeapon().dmgMax();
				}
				return maxDmg;
			});

			this.bonusDmg = ko.computed(function(){
				if( self.hasWeapon() ){
					return self.getEquippedWeapon().extraDamage();
				}
				return 0;
			});

			this.totalArmor = ko.computed(function(){
				var baseArmorValue = Math.floor(self.dex() / 2);
				var itemArmorValue = 0;

				if( self.hasPassiveAbility("improved_dexterity") ){
					baseArmorValue = baseArmorValue * 2;
				}

				var armorSlots = self.equipment().armor();

				for(slot in armorSlots){

					if( !Utils.isEmptyObject( armorSlots[slot]() ) ){
						itemArmorValue += armorSlots[slot]().armorValue();
					}

				}

				if( !Utils.isEmptyObject(self.equipment().shield()) ){
					itemArmorValue += self.equipment().shield().armorValue();
				}

				if(self.hasPassiveAbility("armor_master")){
					itemArmorValue = itemArmorValue * 2;
				}

				return (baseArmorValue + itemArmorValue);
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
				var hpFromEnd = self.end() * 2;

				if( self.hasPassiveAbility("improved_endurance") ){
					hpFromEnd = hpFromEnd * 2;
				}

				return self.baseHp() + hpFromEnd;
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
				var baseChance = self.baseChanceToCrit();

				if( self.hasPassiveAbility("improved_criticals") ){
					baseChance = baseChance * 2;
				}

				return baseChance + self.dex();
			});

			this.getAvailableActiveAbilities = ko.computed(function(){
				var abilityData = self.skillDataCollection.getNode(["active_abilities"]);
				var availableAbilities = [];

				$.each(abilityData, function(idx, ability){

					if( self.activeAbilities()[ability.id] === undefined && ability.canPurchase == 1 ){
						ability.node_path = "active_abilities";
						availableAbilities.push(ability);
					}

				});

				return availableAbilities;
			});

			this.getAvailableCombatAbilities = ko.computed(function(){
				var abilityData = self.skillDataCollection.getNode(["combat_abilities"]);
				var availableAbilities = [];

				$.each(abilityData, function(idx, ability){

					if( self.combatAbilities()[ability.id] === undefined && ability.canPurchase == 1 ){
						ability.node_path = "combat_abilities";
						availableAbilities.push(ability);
					}

				});

				return availableAbilities;
			});

			this.getAvailablePassiveAbilities = ko.computed(function(){
				var abilityData = self.skillDataCollection.getNode(["passive_abilities"]);
				var availableAbilities = [];

				$.each(abilityData, function(idx, ability){

					if( self.passiveAbilities()[ability.id] === undefined && ability.canPurchase == 1 ){
						ability.node_path = "passive_abilities";
						availableAbilities.push(ability);
					}

				});

				return availableAbilities;
			});

			

			self.activeAbilitiesIterable = ko.computed(function(){
				return Utils.getObjectAsArrayIndexedByNumericalSortOrder(self.activeAbilities());
			});
			
			self.combatAbilitiesIterable = ko.computed(function(){
				return Utils.getObjectAsArrayIndexedByNumericalSortOrder(self.combatAbilities());
			});

			//Actual init stuff
			if(self.hp() == 0){
				self.hp( self.maxHp() );
			}
		}

		this.addActiveAbility = function(ability_id, abilityData){

			if(Utils.isEmptyObject(abilityData)){
				abilityData = self.skillDataCollection.getNode(["active_abilities", ability_id]);
			}

			var className = abilityData.className;

			require(["classes/ActiveAbilities/" + className], function(newClassDefinition){
				self.activeAbilities()[abilityData.id] = new newClassDefinition(abilityData);
				self.activeAbilities.valueHasMutated();
			});

		}

		this.addCombatAbility = function(ability_id, abilityData){

			if(Utils.isEmptyObject(abilityData)){
				abilityData = self.skillDataCollection.getNode(["combat_abilities", ability_id]);
			}

			var className = abilityData.className;

			require(["classes/CombatAbilities/" + className], function(newClassDefinition){
				self.combatAbilities()[abilityData.id] = new newClassDefinition(abilityData);
				self.combatAbilities.valueHasMutated();
			});

		}

		this.addPassiveAbility = function(ability_id, abilityData){

			if(Utils.isEmptyObject(abilityData)){
				abilityData = self.skillDataCollection.getNode(["passive_abilities", ability_id]);
			}

			var className = abilityData.className;

			require(["classes/PassiveAbilities/" + className], function(newClassDefinition){
				self.passiveAbilities()[abilityData.id] = new newClassDefinition(abilityData);
				self.passiveAbilities.valueHasMutated();
			});

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

		this.progressActiveAbilities = function(){

			$.each(self.activeAbilities(), function(idx, ability){

				ability.makeProgress();

			});

		}

		this.getActiveAbilities = function(){
			var activeAbilities = [];
			$.each(self.activeAbilities(), function(idx, ability){
				activeAbilities.push(ability);
			});
			return activeAbilities;
		}

		this.getCombatAbilities = function(){
			var combatAbilities = [];
			$.each(self.combatAbilities(), function(idx, ability){
				combatAbilities.push(ability);
			});
			return combatAbilities;
		}

		this.getPassiveAbilities = function(){
			var passiveAbilities = [];
			$.each(self.passiveAbilities(), function(idx, ability){
				passiveAbilities.push(ability);
			});
			return passiveAbilities;
		}

		this.hasPassiveAbility = function(ability_id){
			if( self.passiveAbilities()[ability_id] !== undefined ){
				return true;
			}
			return false;
		}

		this.levelUp = function(){
			//Add stats
			self.hasLeveledUp(true);

			var hpGainPerLevel = 5;
			var restoreHpTo;

			if( self.hasPassiveAbility("improved_hp_leveling") ){
				hpGainPerLevel = hpGainPerLevel * 2;
			}

			self.baseHp( self.baseHp() + hpGainPerLevel );
			restoreHpTo = Math.floor( self.maxHp() / 2 );

			if( self.hasPassiveAbility("improved_hp_leveling") ){
				restoreHpTo = self.maxHp();
			}

			restoreHpTo = ( self.hp() < restoreHpTo ? restoreHpTo : self.hp() );

			self.hp(restoreHpTo);

			self.progressActiveAbilities();

			self.end( self.end() + 1 );

			if( self.level() % 3 == 0){
				self.str( self.str() + 1 );
				self.dex( self.dex() + 1 );
			}
			if( self.level() % 4 == 0){
				self.speed( self.speed() + 1 );
				self.inventoryMaxSlots( self.inventoryMaxSlots() + 1 );
				self.availablePerkPoints( self.availablePerkPoints() + 1 );
			}
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

		this.getExportData = function(){


			var exportObj = {};

			exportObj._classNameForLoad = self.constructor.name;

			for(prop in self){
				if(prop != "inventory" && prop != "activeAbilities" && prop != "combatAbilities" && prop != "passiveAbilities" && prop != "combatEffects"){
					if ( typeof self[prop] !== 'function' ){
						exportObj[prop] = self[prop];
					}else if (ko.isObservable(self[prop])) {
						exportObj[prop] = self[prop]();
					}
				}
			}

			exportObj.inventory = self.inventory.getExportData();

			exportObj.activeAbilities = {};
			$.each(self.activeAbilities(), function(idx, ability){

				exportObj.activeAbilities[idx] = ability.getExportData();

			});

			exportObj.combatAbilities = {};
			$.each(self.combatAbilities(), function(idx, ability){

				exportObj.combatAbilities[idx] = ability.getExportData();

			});

			exportObj.passiveAbilities = {};
			$.each(self.passiveAbilities(), function(idx, ability){

				exportObj.passiveAbilities[idx] = ability.getExportData();

			});

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

		self.init(data);
	}

	Player.prototype = Object.create(Entity.prototype);
	Player.prototype.constructor = Player;

	return Player;

});
