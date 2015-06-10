define([
	'jquery',
	'knockout',
	'classes/Entity',
	'classes/ItemCollection',
	'classes/Item',
	'classes/Armor',
	'classes/Shield',
	'classes/Weapon',

	'Utils',
], function($, ko, Entity, ItemCollection, Item, Armor, Shield, Weapon, Utils){

	function Player(playerData){

		//Init
		var self = this;
		playerData = $.extend({equipment: { armor: {}, }, skills: {}, skillCooldowns : {}, skillProgress : {}, inventory : Array() }, playerData);

		Entity.call(this, playerData);

		this.init = function(playerData){

			self.data = ko.observable({

				level : ko.observable(playerData.level || 1),
				hp : ko.observable(playerData.hp || 0),
				baseHp : ko.observable(playerData.baseHp || 10),
				exp : ko.observable(playerData.exp || 0),
				inventory : new ItemCollection(Array()),
				inventoryMaxSlots : ko.observable(playerData.inventoryMaxSlots || 5),
				equipment : ko.observable({

					armor : ko.observable({

						head : self._instantiateObservableIfSet(playerData.equipment.armor.head, Armor),
						fin : self._instantiateObservableIfSet(playerData.equipment.armor.fin, Armor),
						body : self._instantiateObservableIfSet(playerData.equipment.armor.body, Armor),
						tail: self._instantiateObservableIfSet(playerData.equipment.armor.tail, Armor)

					}),

					weapon : self._instantiateObservableIfSet(playerData.equipment.weapon, Weapon),
					shield : self._instantiateObservableIfSet(playerData.equipment.shield, Shield),
				}),
				skills : ko.observable({
					scanSquares : ko.observable(playerData.skills.scanSquares || 1),
					findFood : ko.observable(playerData.skills.findFood || 20),
					visionRange : ko.observable( (playerData.skills.visionRange != undefined) ? playerData.skills.visionRange : 0 ),
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
				str : ko.observable(playerData.str || Utils.doRand(1,6)),
				dex : ko.observable(playerData.dex || Utils.doRand(1,6)),
				end : ko.observable(playerData.end || Utils.doRand(1,6)),
				chanceToCrit : ko.observable(playerData.chanceToCrit || 0.05),

			});

			//These are ugly hacks...eventually we should just get rid of the extra data() layer, right?
			self.hp = self.data().hp;
			self.speed = self.data().speed;

			var itemArray = Array();
			for(i = 0; i < playerData.inventory.length; i++){
				if(playerData.inventory[i]._classNameForLoad){
					itemArray.push(  eval("new " + playerData.inventory[i]._classNameForLoad +"(playerData.inventory[i])")  );
				}else{
					itemArray.push( new Item(playerData.inventory[i]) );
				}
			}
			self.data().inventory(itemArray);

			this.inventorySlotsOccupied = ko.computed(function(){
				var slotsOccupied = 0;
				for(i=0; i < self.data().inventory().length; i++){
					slotsOccupied += self.data().inventory()[i].slotsRequired;
				}
				return slotsOccupied;
			});

			this.inventorySlotsAvailable = ko.computed(function(){
				return self.data().inventoryMaxSlots() - self.inventorySlotsOccupied();
			});

			this.hasInventorySpace = ko.computed(function(){
				return ( self.inventorySlotsAvailable() > 0 );
			});

			this.baseMinDmg = ko.computed(function(){
				return Math.ceil(self.data().str() * 0.5);
			});

			this.baseMaxDmg = ko.computed(function(){
				return Math.ceil(self.data().str() * 0.85);
			});

			this.minDmg = ko.computed(function(){
				//Eventually let's add STR to this value
				var minDmg = self.baseMinDmg();
				if( !Utils.isEmptyObject(self.data().equipment().weapon()) ){
					minDmg += self.data().equipment().weapon().dmgMin();
				}
				return minDmg;
			});

			this.maxDmg = ko.computed(function(){
				//Eventually let's add STR to this value
				var maxDmg = self.baseMaxDmg();
				if( !Utils.isEmptyObject(self.data().equipment().weapon()) ){
					maxDmg += self.data().equipment().weapon().dmgMax();
				}
				return maxDmg;
			});

			this.totalArmor = ko.computed(function(){
				var armorValue = Math.ceil(self.data().dex() * 0.5); //Eventually when DEX is implemented, use that as base AC

				var armorSlots = self.data().equipment().armor();

				for(slot in armorSlots){

					if( !Utils.isEmptyObject( armorSlots[slot]() ) ){
						armorValue += armorSlots[slot]().armorValue();
					}

				}

				if( !Utils.isEmptyObject(self.data().equipment().shield()) ){
					armorValue += self.data().equipment().shield().armorValue();
				}

				return armorValue;
			});

			self.armor = self.totalArmor;

			self.gp = ko.computed(function(){
				var gold = self.data().inventory.getItemByID("gold");

				if(gold){
					return gold.qty();
				}else{
					return 0;
				}
			});

			self.weaponScraps = ko.computed(function(){
				var scraps = self.data().inventory.getItemByID("weapon_scraps");

				if(scraps){
					return scraps.qty();
				}else{
					return 0;
				}
			});

			self.armorScraps = ko.computed(function(){
				var scraps = self.data().inventory.getItemByID("armor_scraps");

				if(scraps){
					return scraps.qty();
				}else{
					return 0;
				}
			});

			self.maxHp = ko.computed(function(){
				return self.data().baseHp() + (self.data().end() * 2);
			});

			self.expRequiredForNextLevel = ko.computed(function(){
				return self.data().level() * 100;
			});

			self.numPotionsAvailable = ko.computed(function(){
				var pots = self.data().inventory.getItemByID("health_potion");

				if(pots){
					return pots.qty();
				}else{
					return 0;
				}
			});

			self.hasLeveledUp = ko.observable(false);

			//Actual init stuff
			if(self.data().hp() == 0){
				self.data().hp( self.maxHp() );
			}
		}

		this.addItemToInventory = function(itemToAdd){

			var numInInventory = self.data().inventory.addItem(
				itemToAdd,
				function(){
					var hasSpace = self.inventorySlotsAvailable() >= itemToAdd.slotsRequired;
					if( !hasSpace && itemToAdd.id != "gold"){
						return false;
					}
					return true;
				}
			);

			return numInInventory;
		}

		this.removeItemFromInventory = function(itemID, qty){

			var existingItem = self.getInventoryItemByID(itemID),
				slotsRequired = existingItem.slotsRequired;

			var numLeft = self.data().inventory.removeItem(itemID, qty);

			if( numLeft === false ){
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
			return self.data().equipment().armor()[slot];
		}

		this._getWeaponSlot = function(){
			return self.data().equipment().weapon;
		}

		this._getShieldSlot = function(){
			return self.data().equipment().shield;
		}

		this.getAttackResults = function(attackType){

			var numAttacks = 1;
			var chanceToHit = 1.0;
			var chanceToCrit = 0.0;
			var dmgModifier = 1.0;
			var hitType = "hit";
			var attackResults = Array();
			/*
			Flurry of Blows: 3x attacks, 30% chance to hit, 200% of normal dmg, 3 rd cooldown
Mighty Strike: 1x attack, 50% chance to hit, 300% of normal dmg, 2 rd cooldown
Gut Punch: 1x attack, 50% chance to hit, 50% of normal dmg, stuns for two rounds (effective immediately if applicable), 2 rd cooldown
			*/

			if(attackType == 'flurry'){
				numAttacks = 3;
				chanceToHit = 0.3;
				dmgModifier = 2.0;
			}else if(attackType == 'mighty'){
				chanceToHit = 0.5;
				dmgModifier = 3.0;
			}else if(attackType == 'stun'){
				chanceToHit = 0.5;
				dmgModifier = 0.5;
			}

			for(var i = 1; i <= numAttacks; i++){
				var hitRoll = Utils.doRand(1, 101);
				var didHit = (hitRoll <= (chanceToHit * 100)) ? true : false ;
				var dmgDealt = 0;

				if(didHit){
					var critRoll = Utils.doRand(1, 101);
					var didCrit = (critRoll <= (chanceToCrit * 100)) ? true : false ;

					if(didCrit){
						dmgDealt = self.maxDmg();
						hitType = "crit";
					}else{
						dmgDealt = Utils.doRand( self.minDmg(), (self.maxDmg() + 1) );
					}

					dmgDealt += self.data().equipment().weapon().extraDamage();

					dmgDealt = dmgDealt * dmgModifier;

				}else{
					hitType = "miss";
				}

				attackResults.push({
					dmg : dmgDealt,
					type : hitType,
					attackType : attackType,
				});
			}

			return attackResults;
		}

		this.addExp = function(xp){
			var potentialTotalXp = self.data().exp() + xp;
			if(potentialTotalXp >= self.expRequiredForNextLevel()){
				self.data().exp( potentialTotalXp - self.expRequiredForNextLevel() );
				self.data().level( self.data().level() + 1 );
				self.levelUp();
			}else{
				self.data().exp( potentialTotalXp );
			}
		}

		this.levelUp = function(){
			//Add stats
			self.hasLeveledUp(true);
			self.data().baseHp( self.data().baseHp() + 1 );
			self.data().skills().findFood( self.data().skills().findFood() + 1 );

			if( self.data().level() % 3 == 0){
				self.data().str( self.data().str() + 1 );
				self.data().dex( self.data().dex() + 1 );
				self.data().end( self.data().end() + 1 );
			}
			if( self.data().level() % 4 == 0){
				self.data().speed( self.data().speed() + 1 );
				self.data().inventoryMaxSlots( self.data().inventoryMaxSlots() + 1 );
			}
			//Heal player / reset cooldowns on level up?
		}

		this.restoreHealth = function(amt, isPct){

			var toRestoreAmt = amt;
			var maxHp = self.maxHp();
			var hp = self.data().hp();

			if(isPct){
				toRestoreAmt = Math.round(amt * maxHp);
			}

			toRestoreAmt = (toRestoreAmt <= (maxHp - hp)) ? toRestoreAmt : (maxHp - hp) ;

			self.data().hp( hp + toRestoreAmt );
		}

		this.hasWeapon = function(){
			return !Utils.isEmptyObject( self.getEquippedWeapon() );
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

		this._instantiateObservableIfSet = function(obj, className){
			return ko.observable(obj !== undefined && !Utils.isEmptyObject(obj) ? new className(obj) : {});
		}

		self.init(playerData);
	}

	Player.prototype = Object.create(Entity.prototype);
	Player.prototype.constructor = Player;

	return Player;

});
