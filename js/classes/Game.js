define([
	'jquery',
	'knockout',
	'classes/Player',
	'classes/Level',
	'classes/Item',
	'classes/Consumable',
	'classes/Weapon',
	'classes/Armor',
	'classes/Shield',
	'classes/Accessory',
	'classes/ItemCollection',
	'classes/DataCollection',
	'classes/Monster',
	'classes/CombatEffect',
	'json!data/items.json',
	'json!data/monsters.json',
	'json!data/skills.json',
	'Utils',
	'classes/Grid',

	'jquery.animateNumbers'
], function($, ko, Player, Level, Item, Consumable, Weapon, Armor, Shield, Accessory, ItemCollection, DataCollection, Monster, CombatEffect, itemDataFile, monsterDataFile, skillDataFile, Utils, Grid) {

	//Can these be knockout custom bindings? Some of them, surely...
	var $FULL_SCREEN_NOTICE_DIV = $(".full-screen-row");
	var $MAIN_CONTENT_DIV = $(".main-content-row");
	var $PLAYER_STAT_HEADER = $(".player-stat-row");
	var $MESSAGE_LOG = $(".log-area");
	var $FAQ = $("#faq-content");
	var $SAVED_NOTICE = $(".saved-notice");
	var $SAVED_PREF_NOTICE = $(".saved-pref-notice");
	var BASE_FADEOUT_SPEED = 600;
	var BASE_FADEIN_SPEED = 400;
	var FAST_FADEOUT_SPEED = 300;
	var FAST_FADEIN_SPEED = 300;

	function Game() {

		var self = this;

		this.modalWindow = $('#myModal');
		this.modalWindow.on('hidden.bs.modal', function (e) {
			self.modalHidden();
		});

		this.itemDataCollection = new DataCollection(itemDataFile);
		this.monsterDataCollection = new DataCollection(monsterDataFile);
		this.skillDataCollection = new DataCollection(skillDataFile);

		this.player = undefined;
		this.slides = {
			start: {
				text: "<p>You are in an egg, nestled in a layer of rocks at the bottom of a creek bed. It is a comfortable 16 degrees Celsius. You've been in here for a week already. You are bored.</p>",
				buttons: [
					{
						title: "Let's bust outta here!",
						action: function(){ self.transitionFullscreenContentToSlideId("d1"); }
					},
				],
				location: "Unknown",
			},
			d1: {
				text: "<p>With a loud crack, you emerge from your egg like the Kool-Aid man through a brick wall.</p>",
				buttons: [
					{
						title: "OH YEAH!!!",
						action: function(){ self.transitionFullscreenContentToSlideId("d2"); }
					},
				],
				location: "Unknown",
			},
			d2: {
				text: "<p>You feel cool water rush past your face like a refreshing breeze.</p>",
				buttons: [
					{
						title: "Continue",
						action: function(){
							//Show the main game now
							self.manageTransitionToView("fullscreen","mainscreen");

							self.isNew(false);
						}
					},
				],
				location: "Unknown",
			},
		};

		this.defaultCooldown = 10;
		this.playerActions = {
			scan_squares : function(){
				var scanSquareSkill = self.player().activeAbilities()["scan_squares"];
				var success = scanSquareSkill.doSkill();

				if(success){ //Just a formality, should always succeed
					if( self.player().hasPassiveAbility("improved_scanning") ){
						self.level().scanSquaresNearPlayer( scanSquareSkill.skillLevel() );	
					}else{
						self.level().rayCast(scanSquareSkill.skillLevel() * self.level().unitsPerSquare);
					}
					
					self.level().drawMap();
					self.logMessage("By holding very still and concentrating, you are able to thoroughly survey your surroundings.");
				}

				if( scanSquareSkill.canLevelUp){
					scanSquareSkill.levelUp();

					if(scanSquareSkill.didLevelUp){ //Did we actually improve our skill (i.e. - we're not maxed out)
						scanSquareSkill.didLevelUp = 0; //Clear this out
						self.logMessage("Your skill in scanning has increased.");
					}
					
				}

			},
			find_food : function(){

				var findFoodSkill = self.player().activeAbilities()["find_food"];
				var success = findFoodSkill.doSkill();

				var newFoodItem = false;

				if(success){ //Just a formality, should always succeed
					newFoodItem = self.getRandomScroungable(findFoodSkill.skillLevel());

					if( self.player().hasPassiveAbility("improved_food_scrounging") ){
						newFoodItem.qty = newFoodItem.qty * 2;
					}
				}

				var message = "";

				if(newFoodItem){ //Again, just a formality
					var qty = self.addFoodToPlayerInventory(newFoodItem);
					message = "You gracefully float to the bottom of the river and successfully scrounge up " + self._assembleLogMessageStringFromItem(newFoodItem) + " using your kick-ass mouth feelers";
					if(qty != false && qty > 0){
						message += "!";
					}else{
						message += ", but your inventory is full!";
						self.freezeMovement(true);
						self.showContainerWithContents([newFoodItem]);
					}
				}else{
					message = "You failed to find any food (this is probably a bug, you should always find food)";
				}

				self.logMessage(message);

				if( findFoodSkill.canLevelUp){
					findFoodSkill.levelUp();

					if(findFoodSkill.didLevelUp){ //Did we actually improve our skill (i.e. - we're not maxed out)
						findFoodSkill.didLevelUp = 0; //Clear this out
						self.logMessage("Your skill in scrounging food has increased! You can now find <span class='"
							+ findFoodSkill.skillLevel() + "'>" + findFoodSkill.skillLevel() + "</span> quality food.");
					}
					
				}

				//Trigger cooldown on findTreasure as well! (if applicable)
				var findTreasure = self.player().activeAbilities()["find_treasure"];
				if(findTreasure){
					findTreasure.triggerCooldown();
				}
			},
			reset_level : function(){

				self.freezeMovement(true);

				self.fullScreenContent({
					text: "Would you like to reset the current dungeon level? Costs 25% of your current GP.",
					buttons: [
						{
							title : "No",
							action : function(){
								self.manageTransitionToView("fullscreen","mainscreen",function() {
									self.freezeMovement(false);
								});
							}
						},
						{
							title : "Yes",
							action : function(){

								var gold = self.player().inventory.getItemByID("gold");
								var cost = 0;
								if(gold){
									cost = Math.round(gold.qty() * .25);
									gold.qty( gold.qty() - cost );
								}

								self.manageTransitionToView(
									"fullscreen",
									"mainscreen",
									function() {
										self.freezeMovement(false);
									}, function(){
										self.level().generateThisLevel(true);
										self.level().revealSquaresNearPlayer(1);
										self.level().drawMap();

										self.logMessage("Level has been reset.", "player");
									}
								);

							}
						}
					]
				});

				self.manageTransitionToView("mainscreen","fullscreen");

			},
			find_treasure : function(){

				var findTreasure = self.player().activeAbilities()["find_treasure"];
				var foundItem = findTreasure.doSkill();

				if(foundItem){
					//Get item quality
					var itemQuality = findTreasure.getItemQuality();
					//Randomly pick a level-appropriate piece of gear with the given quality
					newLootItem = self.generateRandomLootItem(undefined, itemQuality, { 100 : "gear" });
					//Attempt to add the item to inventory
					var qtyAdded = self.player().addItemToInventory( newLootItem );

					var messageString = "After long hours of tiring excavation, you uncover " + self._assembleLogMessageStringFromItem(newLootItem);

					if(qtyAdded != false && qtyAdded > 0){
						//Log success
						self.logMessage(messageString + "!", "item");
					}else{
						//If inventory is full, bring up the "container" screen
						self.showContainerWithContents([newLootItem]);
						//Log discovery
						self.logMessage(messageString + ", but your inventory is full!", "item");
					}

				}else{
					//Junk! Pick a junk item
					var junkItem = self.getRandomVendorTrash();
					var junkQty = findTreasure.junkQtyForLevel(self.level().levelNum());

					//Add the generic "junk" item to inventory or increment its qty appropriately
					var genericJunkItem = new Item(self.getAvailableItemById("junk", "misc", junkQty));
					self.player().addItemToInventory( genericJunkItem );

					//Log the junk item name
					self.logMessage("After long hours of tiring excavation, unfortunately all you find is "
						+ junkQty + "x " + junkItem.name + ". You dejectedly add " + (junkQty == 1 ? "it" : "them") + " to your inventory.", "item");
				}

				if( findTreasure.canLevelUp){
					findTreasure.levelUp();

					if(findTreasure.didLevelUp){ //Did we actually improve our skill (i.e. - we're not maxed out)
						findTreasure.didLevelUp = 0; //Clear this out
						self.logMessage("Your skill in finding treasure has increased! You are now more likely to find better items!");
					}
					
				}

				//Trigger cooldown on findFood as well!
				var findFoodSkill = self.player().activeAbilities()["find_food"];
				findFoodSkill.triggerCooldown();
			},
		};

		this.temporaryPreferenceStorage = {};

		this.sortByPresets = {
			"Type" : ["type", "qualityModifier", "name"],
			"Quality" : ["qualityModifier", "type", "name"],
			"Name": ["name","qualityModifier"]
		};
		this.sortByPresetsSortDirs = {
			"Type" : ["ASC", "ASC", "ASC"],
			"Quality" : ["ASC", "ASC", "ASC"],
			"Name": ["ASC","ASC"]
		};
		this.sortByPresetsList = [
			"Type",
			"Quality",
			"Name"
		];

		this.showInventoryEquipmentPresetsList = [
			"Inventory",
			"Equipment",
		];

		this.savedBuildVersion = undefined;
		this.ignoreSquareActions = 0;
		
		this._goesFirst;
		this.wAction = function() { return self.movePlayerUp() };
		this.aAction = function() { return self.movePlayerLeft() };
		this.sAction = function() { return self.movePlayerDown() };
		this.dAction = function() { return self.movePlayerRight() };
		this.spcAction = function(){ return 1 };

		this.init = function(){
			self.initObservables();
			self.initGame();
			//References for debugging
			self.newGrid = new Grid();
			self.Utils = Utils;
		}

		this.initObservables = function(){

			self.showLoading = ko.observable(false);
			self.player = ko.observable();
			self.location = ko.observable();
			self.levels = ko.observableArray(Array());
			self.logMessages = ko.observableArray();
			self.activeItem = ko.observable({
				id : ko.observable(""),
				desc : ko.observable(""),
				canEquip : ko.observable(0),
				canUnEquip : ko.observable(0),
				canBreakdown : ko.observable(0),
				canUse : ko.observable(0),
				canUseBtnDisabled : ko.observable(0),
				canDrop : ko.observable(0),
				canSell : ko.observable(0),
				canBuy : ko.observable(0),
				canUpgrade : ko.observable(0),
				moveDirection : ko.observable("right"),
				actualItem : ko.observable(undefined),
			});
			self.activeSkill = ko.observable(undefined);
			self.wasdKeysControlPlayerPos = ko.observable(true);
			self.rightColContent = ko.observable("equipment");
			self.freezeMovement = ko.observable(false);
			self.currentContainer = new ItemCollection(Array());
			self.goldGained = ko.observable(0);
			self.currentEnemy = ko.observable(undefined);
			self.backButtonLabel = ko.observable("Back");
			self.isNew = ko.observable(true);
			self.eventSquareTypeOverride = ko.observable(undefined);
			self.modalWindowTitle = ko.observable("");
			self.modalWindowText = ko.observable("");
			self.showModalClose = ko.observable(true);
			self.showModalWindowFooter = ko.observable(true);
			self.disablePlayerCombatButtons = ko.observable(false);
			self.quickEatPriority = ko.observable("asc");
			self.autoSaveBeforeBosses = ko.observable(1);
			self.pctEmptySquares = ko.observable(2);
			self.monsterSquareRates = ko.observable(2);
			self.enableZoom = ko.observable(0);
			self.resetPreferences = ko.observable(1);
			self.temporarilyDisableActiveSquare = ko.observable(0);
			self._forceRecalculate = ko.observable(0);

			//Keep track of what is displayed where
			self.fullScreenContent = ko.observable(undefined);
			self.leftColContent = ko.observable(undefined);
			self.centerColContent = ko.observable("fullscreen_content");
			self.rightColContent = ko.observable(undefined);

			self.hpBarBaseWidth = 368;
			self.playerHpBarWidth = ko.observable(self.hpBarBaseWidth);
			self.enemyHpBarWidth = ko.observable(self.hpBarBaseWidth);

			self.inventorySortOrder = ko.observable("Type");
			self.containerSortOrder = ko.observable("Type");
			self.merchantSortOrder = ko.observable("Type");
			self.inventoryEquipmentToggle = ko.observable("Inventory");

			self.numBattlesWon = ko.observable(0);
			self.numItemSquaresLooted = ko.observable(0);

			self.level = ko.computed(function(){
				if(self.levels() && self.levels().length > 0){

					for(i=0; i < self.levels().length; i++){
						var thisLevel = self.levels()[i];
						if (thisLevel.isActive()){
							return thisLevel;
						}
					}

				}else{
					return undefined;
				}
			}, self);

			self._activeItemCanBeUpgraded = ko.computed(function(){

				if( self.activeItem().actualItem() ){
					if( self.activeItem().actualItem().upgradedWithScrapType == "armor" ){
						return self.player().armorScraps() >= self.activeItem().actualItem().costForNextUpgradeLevel();
					}else if( self.activeItem().actualItem().upgradedWithScrapType == "weapon" ){
						return self.player().weaponScraps() >= self.activeItem().actualItem().costForNextUpgradeLevel();
					}
				}
				return false;
			});

			self.activeItemButtons = ko.computed(function(){
				var buttons = new Array();
				var defaultCss = "btn-default";

				if( self.activeItem().actualItem() != undefined ){
					var actualItem = self.activeItem().actualItem();

					if( self.activeItem().canEquip() ){
						buttons.push({
							css: defaultCss,
							text: "Equip",
							click: self.equipActiveItem
						});
					}

					if( self.activeItem().canUnEquip() && self.rightColContent() == "equipment" ){
						buttons.push({
							css: defaultCss,
							text: "Un-Equip",
							click: self.unEquipActiveItem
						});
					}

					if( self.activeItem().canUpgrade() ){

						buttons.push({
							css: defaultCss + ((self._activeItemCanBeUpgraded()) ? "" : " disabled"),
							text: "Upgrade (" + actualItem.costForNextUpgradeLevel() + " scrap)",
							click: self.upgradeActiveItem
						});

					}

					if( self.activeItem().canBreakdown() ){
						buttons.push({
							css: "btn-danger",
							text: "Salvage" + ( (self.activeItem().actualItem().isEquipped()) ? " (equipped!)" : "" ),
							click: self.salvageActiveItem
						});
					}

					//It's not actually dependent on the equipment screen, it just can't be used while trading with a merchant
					if( self.activeItem().canUse() && self.rightColContent() != "merchant" ){
						buttons.push({
							css: defaultCss + (
								(self.activeItem().actualItem().isFood || self.activeItem().actualItem().id == "health_potion")
									&& (self.player().hp() == self.player().maxHp()) ? ' disabled' : ''
							),
							text: "Use",
							click: self.useActiveItem
						});
					}

					if( self.activeItem().canBuy() && self.rightColContent() == "merchant" ){

						if( actualItem.qty() == 1 ){

							buttons.push({
								css: defaultCss + (( self.player().gp() < actualItem.buyValue() ) ? " disabled" : ""),
								text: "Buy (" + (self.player().hasPassiveAbility('improved_barter') ? Math.floor(actualItem.buyValue() / 2) : actualItem.buyValue() ) + " GP)",
								click: self.buyActiveItem
							});

						}else if( actualItem.qty() > 1 ){

							buttons.push({
								css: defaultCss + (( self.player().gp() < actualItem.buyValue() ) ? " disabled" : ""),
								text: "Buy 1x (" + actualItem.buyValue() + " GP)",
								click: self.buyActiveItem
							});

							var numPurchasable = Math.floor( self.player().gp() / actualItem.buyValue() );
							var actualPurchasable = (numPurchasable <= actualItem.qty()) ? numPurchasable : actualItem.qty() ;

							if(actualPurchasable > 0 && actualItem.qty() > 0){

								buttons.push({
									css: defaultCss + (( self.player().gp() < (actualPurchasable * actualItem.buyValue()) ) ? " disabled" : ""),
									text: "Buy " + actualPurchasable + "x (" + (actualPurchasable * actualItem.buyValue()) + " GP)",
									click: self.buyMaxActiveItem
								});

							}
						}

					}

					if( self.activeItem().canSell() && self.rightColContent() == "merchant" ){

						if( self.activeItem().actualItem().qty() == 1 ){

							buttons.push({
								css: defaultCss,
								text: "Sell (" + self.activeItem().actualItem().sellValue() + " GP)",
								click: self.sellActiveItem
							});

						}else if( self.activeItem().actualItem().qty() > 1 ){

							buttons.push({
								css: defaultCss,
								text: "Sell 1x (" + actualItem.sellValue() + " GP)",
								click: self.sellActiveItem
							});

							buttons.push({
								css: defaultCss,
								text: "Sell All (" + (actualItem.qty() * actualItem.sellValue()) + " GP)",
								click: self.sellAllActiveItem
							});

						}

					}

					if( self.activeItem().canDrop() && self.rightColContent() != 'merchant'){

						if( self.rightColContent() == 'container' ){ //We're moving something

							if( self.activeItem().moveDirection() == "left" && self.inventoryEquipmentToggle() == "Inventory"){ //We're moving from the container to the inventory

								if(actualItem.qty() > 1){

									if( actualItem.id != "gold" ){
										buttons.push({
											css: defaultCss,
											text: "<< Take 1x",
											click: self.moveActiveItem
										});
									}

									buttons.push({
										css: defaultCss,
										text: "<< Take All",
										click: self.moveAllActiveItem
									});

								}else if(actualItem.qty() == 1){
									buttons.push({
										css: defaultCss,
										text: "<< Take",
										click: self.moveActiveItem
									});
								}

							}else if( self.activeItem().moveDirection() == "right" ){ //We're moving from the inventory to the container

								if( actualItem.id != "gold" ){

									if( actualItem.qty() > 1 ){

										buttons.push({
											css: defaultCss,
											text: "Put 1x >>",
											click: self.moveActiveItem
										});

										buttons.push({
											css: defaultCss,
											text: "Put All >>",
											click: self.moveAllActiveItem
										});

									}else if( actualItem.qty() == 1 ){

										buttons.push({
											css: defaultCss,
											text: "Put >>",
											click: self.moveActiveItem
										});

									}

								}

							}

						}else { //We're dropping something

							if(actualItem.qty() > 1){

								buttons.push({
									css: defaultCss,
									text: "Drop 1x",
									click: self.moveActiveItem
								});

								buttons.push({
									css: defaultCss,
									text: "Drop All",
									click: self.moveAllActiveItem
								});

							}else if(actualItem.qty() == 1){
								buttons.push({
									css: defaultCss,
									text: "Drop",
									click: self.moveActiveItem
								});
							}

						}
					}

				}

				return buttons;
			});

			self.foodAvailableForQuickEat = ko.computed(function(){
				if( self.player() && self.player().inventory ){
					var foodItem = ko.utils.arrayFirst(self.player().inventory.items(), function(item){
						return item.isFood == 1;
					});
					return (foodItem) ? 1 : 0 ;
				}
				return 0;
			});

			self._quickEatFoodItem = ko.computed(function(){
				var foodItem = 0;

				if( typeof self.player == "function" && self.player() !== undefined ) {

					var sortOrder = (self.quickEatPriority() == 'asc') ? 'ASC' : 'DESC' ;
					var sortedFilteredItems = self.player().inventory.getSortedFilteredItems("isFood", 1, "qualityModifier", sortOrder);
					if(sortedFilteredItems.length > 0){
						foodItem = sortedFilteredItems[0];
					}

				}

				return foodItem;
			});

			self.hpRestoredByQuickEat = ko.computed(function(){
				var foodItem = self._quickEatFoodItem();
				var hpToRestore = undefined;

				if(foodItem){
					hpToRestore = self[foodItem.quality() + 'HpRestore']();
				}

				return hpToRestore;
			});
			
			self.unEquipNotice = ko.computed(function(){
				if( self.activeItem().actualItem() && (self.activeItem().actualItem().isEquippable || self.activeItem().canBuy() ) ){
					var actualItem = self.activeItem().actualItem();

					if( actualItem instanceof Shield ){
						var equippedWeapon = self.player().getEquippedWeapon();

						if( !Utils.isEmptyObject(equippedWeapon) && equippedWeapon.handsRequired == 2 ){
							return "Equipping this shield will unequip your current 2H weapon";
						}

					}else if( actualItem instanceof Weapon && actualItem.handsRequired == 2){
						var equippedShield = self.player().getEquippedShield();
						var equippedWeapon = self.player().getEquippedWeapon();
						var items = [];
						var itemString = "";

						if( !Utils.isEmptyObject(equippedShield) ){
							items.push("shield");

							if( !Utils.isEmptyObject(equippedWeapon) ){
								items.push("weapon");
							}
						}

						itemString = items.join(" and ");

						if(items.length > 0){
							return "Equipping this 2H weapon will unequip your current " + itemString;
						}

						return false;
						
					}
				}
			});

			self.inventoryTemplateOptions = ko.computed(function(){
				var forceRecalculate = self._forceRecalculate();
				var opts = {
					optKey : 'inventory',
					emptyString : "Your inventory is empty",
					onClickFn : self.setInventoryItemAsActiveItem,
					noLinesCond : 1,
					showLinesCond : 0,
					cssClass : 'inventory',
					showCostInsteadOfQty : 0,
				};

				opts.header = "Inventory";
				if( self.player() ){
					var itemCollection = self.player().inventory.getItemsSortedByMultipleCriteria(
							self.sortByPresets[self.inventorySortOrder() || "Type"],
							self.sortByPresetsSortDirs[self.inventorySortOrder() || "Type"])
					;
					opts.itemCollection = itemCollection;

					var headerString = opts.header;
					headerString += " (<span class='" + (self.player().inventorySlotsOccupied() > self.player().inventoryMaxSlots() ? 'danger' : '') + "'>" + self.player().inventorySlotsOccupied() + "</span>/<span>" + self.player().inventoryMaxSlots() + "</span> slots occupied)";
					opts.header = headerString;

					opts.noLinesCond = ( itemCollection.length == 0 || (itemCollection.length == 1 && self.player().gp() > 0) );
					opts.showLinesCond = (itemCollection.length > 1 || (itemCollection.length == 1 && self.player().gp() == 0) );
				}

				if(self.rightColContent() == "container" || self.rightColContent() == "merchant"){
					opts.showInventoryEquipmentToggle = 1;
				}
				return opts;

			}, self);

			self.containerTemplateOptions = ko.computed(function(){
				var itemCollection = self.currentContainer.getItemsSortedByMultipleCriteria(
					self.sortByPresets[self.containerSortOrder() || "Type"],
					self.sortByPresetsSortDirs[self.containerSortOrder() || "Type"]
				);
				var opts = {
					optKey : 'container',
					header : 'Container',
					emptyString : "The container is empty",
					onClickFn : self.setContainerItemAsActiveItem,
					noLinesCond : (itemCollection.length == 0),
					showLinesCond : (itemCollection.length > 0),
					cssClass : 'container',
					itemCollection: itemCollection,
					showCostInsteadOfQty : 0,
				};
				return opts;

			}, self);

			self.merchantTemplateOptions = ko.computed(function(){
				var itemCollection = self.currentContainer.getItemsSortedByMultipleCriteria(
					self.sortByPresets[self.merchantSortOrder() || "Type"],
					self.sortByPresetsSortDirs[self.merchantSortOrder() || "Type"]
				);
				var opts = {
					optKey : 'merchant',
					header : 'Merchant',
					emptyString : "The merchant has no goods for sale",
					onClickFn : self.setMerchantItemAsActiveItem,
					noLinesCond : (itemCollection.length == 0),
					showLinesCond : (itemCollection.length > 0),
					cssClass : 'merchant',
					itemCollection: itemCollection,
					showCostInsteadOfQty : 1,
				};
				return opts;

			}, self);

			self.poorHpRestore = ko.computed(function(){
				return self.player() ? Math.round(self.player().maxHp() * 0.25) : 0;
			}, self);

			self.goodHpRestore = ko.computed(function(){
				return self.player() ? Math.round(self.player().maxHp() * 0.50) : 0;
			}, self);

			self.greatHpRestore = ko.computed(function(){
				return self.player() ? Math.round(self.player().maxHp() * 0.75) : 0;
			}, self);

			self.exceptionalHpRestore = ko.computed(function(){
				return self.player() ? self.player().maxHp() : 0;
			}, self);

		}

		this.initPrefs = function(prefData){
			if(prefData != undefined){
				if( prefData.wasdKeysControlPlayerPos !== undefined ){
					self.wasdKeysControlPlayerPos(prefData.wasdKeysControlPlayerPos);
				}
				if( prefData.quickEatPriority !== undefined ){
					self.quickEatPriority(prefData.quickEatPriority);
				}
				if( prefData.autoSaveBeforeBosses !== undefined ){
					self.autoSaveBeforeBosses(prefData.autoSaveBeforeBosses);
				}
				if( prefData.monsterSquareRates !== undefined ){
					self.monsterSquareRates(prefData.monsterSquareRates);
				}
				if( prefData.pctEmptySquares !== undefined ){
					self.pctEmptySquares(prefData.pctEmptySquares);
				}
				if( prefData.enableZoom !== undefined ){
					self.enableZoom(prefData.enableZoom);
				}
			}
		}

		this.initGame = function(gameData){

			var level;
			var player;

			var savedPrefData = self.loadPrefs();
			self.initPrefs(savedPrefData);

			if(gameData != undefined){

				var levelArray = Array();
				for(i = 0; i < gameData.levels.length; i++){
					levelArray.push( new Level(gameData.levels[i]) );
				}
				self.levels(levelArray);
				player = new Player(gameData.player);
				self.fullScreenContent(gameData.fullScreenContent);

				self.leftColContent(gameData.leftColContent);
				self.centerColContent(gameData.centerColContent);
				self.rightColContent(gameData.rightColContent);
				self.isNew(gameData.isNew);
				self.logMessages(gameData.logMessages);
				self.wasdKeysControlPlayerPos(gameData.wasdKeysControlPlayerPos);
				self.freezeMovement(gameData.freezeMovement);
				self.backButtonLabel(gameData.backButtonLabel);
				self.playerHpBarWidth(gameData.playerHpBarWidth);
				self.enemyHpBarWidth(gameData.enemyHpBarWidth);
				self.goldGained(gameData.goldGained);

				// These "if" statements are really only necessary to accomodate beta testers (i.e. - anyone loading a game from a previous "version")
				if(gameData.inventorySortOrder){
					self.inventorySortOrder(gameData.inventorySortOrder);
				}
				if(gameData.containerSortOrder){
					self.containerSortOrder(gameData.containerSortOrder);
				}
				if(gameData.merchantSortOrder){
					self.merchantSortOrder(gameData.merchantSortOrder);
				}
				if(gameData.inventoryEquipmentToggle){
					self.inventoryEquipmentToggle(gameData.inventoryEquipmentToggle);
				}

				// Maybe this will help debug issues?
				if(gameData.savedBuildVersion){
					self.savedBuildVersion = gameData.savedBuildVersion;
				}

				if(gameData.currentEnemy){
					self.currentEnemy(new Monster(gameData.currentEnemy));
				}

				var items;
				if(gameData.currentContainer.items == undefined && gameData.currentContainer.length > 0){
					items = gameData.currentContainer;
					gameData.currentContainer = {};
					gameData.currentContainer.items = items;
				}

				var itemArray = Array();
				for(i = 0; i < gameData.currentContainer.items.length; i++){
					if(gameData.currentContainer.items[i]._classNameForLoad){
						itemArray.push(  eval("new " + gameData.currentContainer.items[i]._classNameForLoad +"(gameData.currentContainer.items[i])")  );
					}else{
						itemArray.push( new Item(gameData.currentContainer.items[i]) );
					}
				}

				self.currentContainer.items(itemArray);
				self.currentContainer.opts = gameData.currentContainer.opts;

				self.numBattlesWon( gameData.numBattlesWon || 0 );
				self.numItemSquaresLooted( gameData.numItemSquaresLooted || 0 );

			}else{

				player = new Player( {str: 3, dex: 2, end: 2} );
				level = new Level( self._getNewLevelParams( { genOpts : { quadsWithPotentialEntrances : [] }, isActive : true } ) );
				self.levels.push(level);

			}

			//Whether this is a new or existing game, make sure we have the next level preloaded
			var newLevel = self.level().generateNextLevelIfNotSet(self._getNewLevelParams());

			if( newLevel ){
				self.levels.push(newLevel);
			}

			self.player(player);

			self.level().revealSquaresNearPlayer(1);
			self.level().drawMap();

			self._updateZoomSettings();

			//Initialize our intro slides if this is a brand new game
			if(self.fullScreenContent() == undefined && self.isNew()){
				self.setFullscreenContentFromSlideId("start");
			}

			if(!self.isNew()){
				self.replaceMainScreenContent(function(){
					$MESSAGE_LOG.fadeIn(BASE_FADEIN_SPEED);
					$PLAYER_STAT_HEADER.fadeIn(BASE_FADEIN_SPEED);
				});
			}else{
				self.replaceMainScreenContent();
			}
		}

		this.addFoodToPlayerInventory = function(consumableItem){
			return self.player().addItemToInventory( consumableItem );
		}

		this.movePlayerUp = function(){
			self.movePlayer("up");
		}

		this.movePlayerDown = function(){
			self.movePlayer("down");
		}

		this.movePlayerLeft = function(){
			self.movePlayer("left");
		}

		this.movePlayerRight = function(){
			self.movePlayer("right");
		}

		this.movePlayer = function(direction){

			var currentPos = self.level().getPlayerPos();

			if(!self.freezeMovement()){

				var newPos = self.level().movePlayer(direction, 1);

				if(currentPos.x != newPos.x || currentPos.y != newPos.y){
					
					self.temporarilyDisableActiveSquare(0);

					self.updateCooldowns();

					//Coming soon...
					//self.evaluateIntermittentPassives();

					self.level().showSquaresNearPlayer(1);
					self.level().scanSquaresNearPlayer(0);

					var square = self.level().getSquare(newPos.x, newPos.y);

					square.isVisited = 1;

					if(square.notEmpty && square.isDone == false){

						if( self.ignoreSquareActions == 0 ){
							self.handleSquareAction(square);

							if(square.type != "exit" && square.type != "entrance" && square.type != "combat"){
								square.setDone(true);
							}
						}
						
					}

					self.level().drawMap();

				}

			}

		}

		this.updateCooldowns = function(){
			$.each(self.player().activeAbilities(), function(idx, skill){
				var cooldownValue = skill.cooldown();
				if(cooldownValue > 0){
					skill.cooldown(cooldownValue - 1);
				}
			});
		}

		this.toggleInventory = function(){

			self.freezeMovement(true);
			self.manageTransitionToView("mainscreen","equipment");
			
		}

		this.showPerks = function(){

			self.freezeMovement(true);
			self.manageTransitionToView("mainscreen","skills");
			
		}

		this.showContentArea = function(){
			
			if(self.level().getActiveSquare().type == 'exit' && self.temporarilyDisableActiveSquare() == 0){
				self.squareExitAction();
			}else{
				self.manageTransitionToView(undefined,"mainscreen", function(){
					self.freezeMovement(false);
				});
			}

			self.activeSkill(undefined);

		}

		self.showDamage = function(which){
			if(which == "enemy"){
				$(".combat.enemy .hp").stop(false, true).effect("highlight", { color: "#FF3939" }, 800);
			}else if(which == "player"){
				$(".combat.player .hp").stop(false, true).effect("highlight", { color: "#FF3939" }, 800);
			}
		}

		self.showNonDamage = function(which){
			if(which == "enemy"){
				$(".combat.enemy .hp").stop(false, true).effect("highlight", { color: "#cecece" }, 800);
			}else if(which == "player"){
				$(".combat.player .hp").stop(false, true).effect("highlight", { color: "#cecece" }, 800);
			}
		}

		this.startCombat = function(encounterType){

			self.player().resetActiveAbilityCooldowns();
			self.player().resetCombatEffects();

			var availableMonsters = self.getAvailableMonsterIdsByMonsterCategory("regular");
			
			//Pick a monster ID randomly
			var newMonsterID = Utils.chooseRandomly( availableMonsters );

			//Get our base monster data
			var baseMonsterObj = self.getMonsterDataByIdAndCategory(newMonsterID, "regular");

			//Get some extra stuff we might want to set on our monster
			var extraParamObj = {
				level : self.level().levelNum(),
				fullyDynamicStats : 1,
				archetypeId : (encounterType == "boss" ? "boss" : undefined),
				archetypeClass : (encounterType == "boss" ? "special" : undefined)
			};

			//Make sure first few encounters are basic monsters while player is starting out
			if( (self.numBattlesWon() + self.numItemSquaresLooted()) < 5 && encounterType != "boss"){
				extraParamObj.doNotSpecializeArchetype = 1;
			}

			//Set up a new object to merge everything else into, otherwise VERY BAD THINGS HAPPEN (because JS passing objects by reference)
			var newObj = {};
			$.extend(
				newObj,
				baseMonsterObj
			);
			$.extend(
				newObj,
				extraParamObj
			);

			//Monstertiemz go!
			self.currentEnemy(new Monster(
				newObj
			));

			/*console.log("Init new monster. Monster has:");
			console.log("minDmg: " + self.currentEnemy().minDmg());
			console.log("maxDmg: " + self.currentEnemy().maxDmg());
			console.log("hit chance: " + self.currentEnemy().chanceToHit());
			console.log("crit chance: " + self.currentEnemy().chanceToCrit());
			console.log("max hp: " + self.currentEnemy().maxHp());*/

			//Reset our "goes first" tracker
			self._goesFirst = undefined;

			var playerHpBarWidth = self._calculateHpBarWidthForGivenCurrentAndMaxHp(self.player().hp(), self.player().maxHp());
			self.playerHpBarWidth(playerHpBarWidth);
			self.enemyHpBarWidth(self.hpBarBaseWidth);
		}

		this.getGoesFirst = function(){

			if( self._goesFirst == undefined ){

				var goesFirst;

				if( self.player().speed() > self.currentEnemy().speed() ){
					goesFirst = "player";
				}else if( self.player().speed() < self.currentEnemy().speed() ){
					goesFirst = "enemy";
				}else{
					goesFirst = (Utils.doRand(0,2) == 1) ? "enemy" : "player" ;
				}

				self._goesFirst = goesFirst;
			}

			return self._goesFirst;

		}

		this.playerFlee = function(game, event){
			self.temporarilyDisableActiveSquare(1);
			self.manageTransitionToView("combat","mainscreen", function(){ self.freezeMovement(false); });
		}

		this.playerAttacks = function(ability, event){
			self.doCombatRound(ability.id);
		}

		this.playerPass = function(){
			self.doCombatRound("pass");
		}

		this.doCombatRound = function(playerAbilityId){

			var goesFirst = self.getGoesFirst();
			var attacker = (goesFirst == "player") ? self.player() : self.currentEnemy() ;
			var defender = (goesFirst == "player") ? self.currentEnemy() : self.player() ;

			var monsterAbilityId = self.currentEnemy().selectCombatAbility();

			var abilityId = (goesFirst == "player") ? playerAbilityId : monsterAbilityId ;

			if(abilityId !== undefined){
				//Attacker does something (optionally) to the defender, and UI is updated accordingly
				attacker.takeCombatAction(abilityId, defender, self);
				attacker.updateCombatEffectsForRound();
			}

			//If defender is alive, defender does something (optionally) to the attacker, and UI is updated accordingly
			if(!defender.isDead()){

				abilityId = (goesFirst == "player") ? monsterAbilityId : playerAbilityId ;

				if( abilityId !== undefined ){
					defender.takeCombatAction(abilityId, attacker, self);
					defender.updateCombatEffectsForRound();
				}
				
			}

			if( self.player().isDead() ){
				self.logMessage("You were defeated in combat! Better luck next time...", "combat");
			}

			if( self.currentEnemy().isDead() ){
				//"Done" the square if it's not an exit square

				var square = self.level().getActiveSquare();

				if(square.type != "exit"){
					square.setDone(true);
				}else{
					square.isChallengeActive(0);
				}

				self.player().addExp(self.currentEnemy().expValue());
				self.logMessage("You defeated the enemy! You gain " + self.currentEnemy().expValue() + " EXP!", "combat");
				self.numBattlesWon( self.numBattlesWon() + 1 );

				if( self.player().hasLeveledUp() ){
					self.player().hasLeveledUp(false);
					self.showLevelUpModal();
					self.logMessage("You leveled up! Your stats have improved accordingly.", "combat");
				}
			}

			$.each([attacker,defender], function(idx, entity){
				if(!entity.isDead()){
					entity.updateActiveAbilityCooldownsForRound();
				}
			});

		}

		this.registerCombatEffectApplication = function(attacker, defender, combatEffectToApply){
			var msg;
			if(defender instanceof Player){
				msg = "You are ";
			}else{
				msg = "The enemy is ";
			}
			self.logMessage(msg + 'now affected by: <span class=\'combat-effect\'>' + combatEffectToApply.name + '</span>','combat');
		}

		this.registerAttack = function(attacker, defender, attackResults){

			var combatLogString = "";
			var animateSection = "";
			var maxHp = defender.maxHp();
			var currentHp = defender.hp();

			if(defender instanceof Monster){
				combatLogString = "The enemy is";
				animateSection = "enemy";
			}else if(defender instanceof Player){
				combatLogString = "You are";
				animateSection = "player";
			}

			if(attackResults.hitType != 'miss'){
				self.logMessage(combatLogString + ( attackResults.hitType == 'crit' ? ' critically' : '' ) + " struck for " + attackResults.actualDmg + " points of damage! An additional " + (attackResults.attemptedDmg - attackResults.actualDmg) + " points were absorbed by armor.", "combat");
				if( attackResults.actualDmg > 0 ){
					self.showDamage(animateSection);

					var progressBarWidth = self._calculateHpBarWidthForGivenCurrentAndMaxHp(currentHp, maxHp);
					self[animateSection + 'HpBarWidth'](progressBarWidth);

				}else{
					self.showNonDamage(animateSection);
				}
			}else{
				if(animateSection == "enemy"){
					self.logMessage('You try to strike the enemy, but miss!','combat');
				}else if(animateSection == "player"){
					self.logMessage('The enemy tries to strike you, but misses!','combat');
				}
				self.showNonDamage(animateSection);
			}

		}

		this.lootEnemy = function(){
			
			var square = self.level().getActiveSquare();
			var lootTable = "monster";

			if(square.type == "exit"){
				lootTable = "boss";
			}

			var numLoots = 1 + Math.floor(self.level().levelNum() / 4);
			var newLootItem;
			var thisItemString;
			var foundItemString = 'You find: ';
			self.currentContainer.removeAll(); //Make sure it's empty
			var numLootsFound = self.numBattlesWon() + self.numItemSquaresLooted();

			if( numLootsFound < 5){
				var lootFound = self.generateScheduledLootItem(1);

				for(var i = 0; i < lootFound.length; i++){
					thisItemString = '';
					newLootItem = lootFound[i];
					self.currentContainer.addItem(newLootItem);
					if(i > 0){
						thisItemString = ', ';
					}
					thisItemString += self._assembleLogMessageStringFromItem(newLootItem);

					foundItemString += thisItemString;
				}

			}else{

				for(var i=0; i < numLoots; i++){
					thisItemString = '';
					newLootItem = self.generateRandomLootItem(lootTable);
					self.currentContainer.addItem(newLootItem);
					if(i > 0){
						thisItemString = ', ';
					}
					thisItemString = self._assembleLogMessageStringFromItem(newLootItem);

					foundItemString += thisItemString;
				}

			}

			if(self.level().getActiveSquare().type == 'exit'){
				self.backButtonLabel("Onwards!");
			}

			self.manageTransitionToView("combat","container", function(){ self.logMessage(foundItemString, "item"); });

			self.level().drawMap();
		}

		this.leaveCombat = function(){
			self.level().drawMap();
			self.manageTransitionToView("combat","mainscreen", function(){ self.freezeMovement(false); });
		}

		this.hideModal = function(viewModel, event){
			self.modalWindow.modal('hide');
		}

		this.showModal = function(viewModel, event){
			self.modalWindow.modal('show');
		}

		this.setFullscreenContentFromSlideId = function(slideID){
			self.fullScreenContent(self.slides[slideID]);
		}

		this.transitionFullscreenContentToSlideId = function(slideID){
			$FULL_SCREEN_NOTICE_DIV.fadeOut(BASE_FADEOUT_SPEED, function(){
				self.setFullscreenContentFromSlideId(slideID);
				$FULL_SCREEN_NOTICE_DIV.fadeIn(BASE_FADEIN_SPEED);
			});
		}

		this.useActiveAbility = function(ability, event){
			self.playerActions[ability.id]();
		}

		this.showContainerWithContents = function(itemArray){

			itemArray == itemArray || [];

			self.currentContainer.removeAll(); //Make sure it's empty

			for(var i=0; i < itemArray.length; i++){
				self.currentContainer.addItem(itemArray[i]);
			}

			self.manageTransitionToView("mainscreen","container");

		}

		this.takeAllFromContainer = function(){
			for( var i=0; i < self.currentContainer.items().length; i++ ){
				//Skip the normal cap-checking rules
				if(self.currentContainer.items()[i].canEquip() && self.player().shouldAutoEquip(self.currentContainer.items()[i])){
					//Equip it
					self._equipItem(self.currentContainer.items()[i]);
					self.displayAcquiredAndEquippedItemMessageForItem(self.currentContainer.items()[i]);
				}else{
					self.player().inventory.addItem( self.currentContainer.items()[i] );
					self.displayAcquiredItemMessageForItem(self.currentContainer.items()[i]);
				}
				
			}
			self.currentContainer.removeAll();
			self._resetActiveItem();
		}

		this.squareItemAction = function(){

			self.freezeMovement(true);

			self.numItemSquaresLooted( self.numItemSquaresLooted() + 1 );

			var newItem;
			var numLootsFound = self.numBattlesWon() + self.numItemSquaresLooted();

			if( numLootsFound < 5){
				newItem = self.generateScheduledLootItem(1)[0];
			}else {
				newItem = self.generateRandomLootItem();
			}

			var container = Utils.chooseRandomly([
				"a crate sealed tightly with tar",
				"an upturned canoe concealing a pocket of air",
				"a waterproof oilskin bag",
				"a crevice between two large rocks",
				"an old boot",
				"a pile of fish bones",
				"an abandoned hermit crab shell",
				"a mound of broken coral",
				"a freshly dug nest",
			]);

			var numJustAdded;
			var messageString;

			if(newItem.canEquip() && self.player().shouldAutoEquip(newItem)){
				//Equip it
				self._equipItem(newItem);
				//Log acquisition
				messageString = "Inside " + container + " you find " + self._assembleLogMessageStringFromItem(newItem) + ". It was automatically equipped.";
				//Make sure the game knows it was properly picked up
				numJustAdded = 1;
			}else{
				numJustAdded = self.player().addItemToInventory(newItem);
				messageString = "Inside " + container + " you find " + self._assembleLogMessageStringFromItem(newItem);
			}

			if(numJustAdded != false && numJustAdded > 0){
			//if(self.player().inventorySlotsAvailable() > -1){
				self.logMessage(messageString, "item");
				self.freezeMovement(false);
			}else{
				self.logMessage(messageString + ", but your inventory is currently full", "item");
				self.showContainerWithContents([newItem]);
			}
		}

		this.generateScheduledLootItem = function(returnItems){
			returnItems = returnItems || 0;
			var returnItemsArray = [];
			var numLootsFound = self.numBattlesWon() + self.numItemSquaresLooted();
			var scheduledLootIdx = numLootsFound - 1;
			var initialLootSchedule = [
				"melee_weapon_01",
				"tail_armor_01",
				"head_armor_01",
				"body_armor_01",
			];
			var initialLootTypes = [
				"weapon",
				"armor",
				"armor",
				"armor",
			];
			var scheduledFoodItem = "qual_30_1";

			var itemToAdd, newLootItem, itemId;

			itemId = initialLootSchedule[scheduledLootIdx];

			itemToAdd = self.getAvailableItemById(itemId, initialLootTypes[scheduledLootIdx], 1);

			itemToAdd.fullyDynamicStats = 1;
			itemToAdd.level = 1;
			itemToAdd.quality = "good";
			if( initialLootTypes[scheduledLootIdx] == "weapon" ){
				newLootItem = new Weapon(itemToAdd);
			}else if( initialLootTypes[scheduledLootIdx] == "armor" ){
				newLootItem = new Armor(itemToAdd);
			}

			if(!returnItems){
				self.currentContainer.addItem(newLootItem);
			}else{
				returnItemsArray.push(newLootItem);
			}

			itemToAdd = self.itemDataCollection.getNode(["items", "consumables", "scroungables", "poor", scheduledFoodItem]);
			itemToAdd.qty = 2;
			itemToAdd.type = "consumables";
			itemToAdd.desc = "Restores %poorHpRestore% HP when consumed";
			newLootItem = new Consumable(itemToAdd);

			if(!returnItems){
				self.currentContainer.addItem(newLootItem);
			}else{
				returnItemsArray.push(newLootItem);
			}

			return returnItemsArray;

		}

		this.generateRandomLootItem = function(lootSet, overrideQuality, lootSetOverride, levelNum){

			lootSet = lootSet || "standard";
			var itemClass = "item";
			var itemToAdd = {};
			var qtyCoefficient = Math.ceil( self.level().levelNum() / 3 );
			var possibleItemTypes = {};
			var canAdd = true;
			levelNum = levelNum || self.level().levelNum();

			if( lootSet == "monster" ){
				qtyCoefficient = qtyCoefficient * 1.5;
				possibleItemTypes = {
					30 : [
						"gold",
						"misc",
					],
					40 : "gear",
				};
			}else if( lootSet == "trader" ){
				possibleItemTypes = {
					50 : [
						"misc",
						"gear",
					]
				};
			}else if( lootSet == "boss" ){
				possibleItemTypes = {
					100 : "gear"
				};
			}else{
				possibleItemTypes = {
					40 : [
						"gold",
						"misc",
					],
					20 : "gear",
				};
			}

			if(lootSetOverride !== undefined){
				possibleItemTypes = lootSetOverride;
			}

			var itemType = Utils.doBasedOnPercent(possibleItemTypes);

			if(itemType == "gold"){

				var baseGoldPerLevel = 50;
				var pctGoldVariance = 0.25;
				var unRandomizedGoldPerLevel = baseGoldPerLevel * levelNum;
				var lowerGoldBounds = Math.round(unRandomizedGoldPerLevel - (unRandomizedGoldPerLevel * pctGoldVariance)),
					upperGoldBounds = Math.round(unRandomizedGoldPerLevel + (unRandomizedGoldPerLevel * pctGoldVariance));

				var goldAmt = Utils.doRand(lowerGoldBounds, upperGoldBounds + 1);

				if(lootSet == "monster" || lootSet == "boss"){
					goldAmt = Math.round(goldAmt * self.currentEnemy().lootCoefficient());
				}else{
					if( self.player().hasPassiveAbility("improved_gold_finding") ){
						goldAmt = goldAmt * 2;
					}
				}

				itemToAdd = self.getAvailableItemById("gold", "misc", goldAmt);

			}else if(itemType == "misc"){

				var miscLootTypePossibilities = Array(
					"potion",
					"scrap"
				);

				if( lootSet != "trader" ){
					miscLootTypePossibilities.push("food");
					miscLootTypePossibilities.push("stone");
				}

				var miscType = Utils.chooseRandomly(miscLootTypePossibilities);

				if( miscType == "potion" ){

					itemClass = "consumable";
					//Select a potion at random

					var potion_id = Utils.chooseRandomly(self.itemDataCollection.getNode(["items", "consumables", "potions"], 1));

					itemToAdd = self.itemDataCollection.getNode(["items", "consumables", "potions", potion_id])

				}else if( miscType == "scrap" ){

					var scrapQty = Math.ceil(Utils.doRand(10,36) * qtyCoefficient);
					if(lootSet == "monster" || lootSet == "boss"){
						scrapQty = Math.round(scrapQty * self.currentEnemy().lootCoefficient());
					}

					if( self.player().hasPassiveAbility("improved_scrap_finding") ){
						scrapQty = scrapQty * 2;
					}

					var scrapType = Utils.chooseRandomly(["armor_scraps","weapon_scraps"]);

					itemToAdd = self.getAvailableItemById(scrapType, "crafting", scrapQty);

				}else if( miscType == "stone" ){

					var availableGems = self.getAvailableItemIdsByTypeForLevel("gems", levelNum);
					var gemId = Utils.chooseRandomly( availableGems );
					itemToAdd = self.getAvailableItemById(gemId, "gems", 1);
					if(levelNum <= 50){
						itemToAdd.qty = Utils.doRand(1,4);
					}else{
						itemToAdd.qty = Utils.doRand(1,4) + (levelNum - 50);
					}

				}else if( miscType == "food" ){

					itemClass = "consumable";

					itemToAdd = self.getRandomScroungable(undefined, 1);

				}

			}else if(itemType == "gear"){

				var gearType = Utils.doBasedOnPercent({
					40 : [
						"armor",
						"weapon",
					],
					20 : [
						"accessory"
					]

				});

				var quality = Utils.chooseRandomly(Utils.getPossibleQualities());

				if(lootSet == "boss"){
					quality = "great";
				}

				if(overrideQuality !== undefined){
					quality = overrideQuality;
				}

				if( gearType == "armor" ){

					itemClass = "armor";

					var armorId;

					var availableArmor = self.getAvailableItemIdsByTypeForLevel("armor", levelNum);
					availableArmor = availableArmor.concat( self.getAvailableItemIdsByTypeForLevel("shield", levelNum) );
					armorId = Utils.chooseRandomly( availableArmor );
					if( armorId.indexOf("shield_") === 0 ){
						itemClass = "shield";
						itemToAdd = self.getAvailableItemById(armorId, "shield", 1);
					}else{
						itemToAdd = self.getAvailableItemById(armorId, "armor", 1);
					}

				}else if( gearType == "weapon" ){

					itemClass = "weapon";

					var weaponId;

					var availableWeapons = self.getAvailableItemIdsByTypeForLevel("weapon", levelNum);
					weaponId = Utils.chooseRandomly( availableWeapons );

					itemToAdd = self.getAvailableItemById(weaponId, "weapon", 1);

				}else if( gearType == "accessory" ){

					itemClass = "accessory";

					var accId;

					var availableAccessories = self.getAvailableItemIdsByTypeForLevel("accessory", levelNum);
					accId = Utils.chooseRandomly( availableAccessories );

					itemToAdd = self.getAvailableItemById(accId, "accessory", 1);

				}

				itemToAdd.fullyDynamicStats = 1;
				itemToAdd.level = (lootSet == "boss" ? (levelNum + 1) : levelNum );
				itemToAdd.quality = quality;
				if(lootSet == "monster"){
					itemToAdd.monsterLootCoefficient = self.currentEnemy().lootCoefficient();
				}
			}

			var newItem;

			if(itemClass == "item"){
				newItem = new Item(itemToAdd);
			}else if(itemClass == "weapon"){
				newItem = new Weapon(itemToAdd);
			}else if(itemClass == "armor"){
				newItem = new Armor(itemToAdd);
			}else if(itemClass == "shield"){
				newItem = new Shield(itemToAdd);
			}else if(itemClass == "consumable"){
				newItem = new Consumable(itemToAdd);
			}else if(itemClass == "accessory"){
				newItem = new Accessory(itemToAdd);
			}else{
				newItem = itemToAdd;
			}

			return newItem;

		}

		this.squareCombatAction = function(){
			self.freezeMovement(true);

			//Generate "enemy appears" message
			/*var enemyMsg = Utils.doBasedOnPercent({
				25 : [
					"Suddenly, swimming out of the murky depths, a foe appears!",
					"A shadow looms over you. You turn around swiftly; it's an enemy!",
					"An enemy swims up to you, and attacks!",
					"You charge headfirst into an enemy!",
				]
			});*/
			var enemyMsg = "You've encountered an enemy! Time to fight!";

			//self.logMessage(enemyMsg, "combat");

			self.fullScreenContent({
				text: enemyMsg,
				buttons: [
					{
						title : "Continue",
						action : function(){
							self.manageTransitionToView("fullscreen","combat");

							/*self.spcAction = function(){
								buttons[0].action();
								self.spcAction = function(){ return 1 };
							}*/

							self.startCombat();
						}
					}
				]
			});

			self.manageTransitionToView("mainscreen","fullscreen");

			//Show our "pop-up", describing the enemy

		}

		this.squareEventAction = function(){

			self.freezeMovement(true);

			var eventSquarePercents = {
				"normal" : {
					30 : "trainer",
					40 : "trader",
					15 : "cooldown",
					10 : "stat",
					5 : "inventory",
				},
				"no_trainer" : {
					50 : "trader",
					25 : "cooldown",
					15 : "stat",
					10 : "inventory",
				}
			};
			var eventSquarePercentKey;
			var eventSquarePercentObject;

			//Don't let trainer squares show up if there's nothing to train in!
			$.each(self.player().activeAbilities(), function(idx, skill){
				if(skill.canTrainNextLevel()){
					eventSquarePercentKey = "normal";
					return false;
				}
			});
			
			eventSquarePercentKey = eventSquarePercentKey || "no_trainer";

			var eventType = Utils.doBasedOnPercent(eventSquarePercents[eventSquarePercentKey]);

			if (self.eventSquareTypeOverride() !== undefined && self.eventSquareTypeOverride() == "trainer" && eventSquarePercentKey == "no_trainer" ) {
				self.eventSquareTypeOverride(undefined);
			} else if( self.eventSquareTypeOverride() !== undefined ){
				eventType = self.eventSquareTypeOverride();
				self.eventSquareTypeOverride(undefined);
			}

			var text = "";
			var buttons;
			var afterLoad;

			//For stat/xp increase, cooldown resets, and inventory space increases, just show the message and move on
			buttons = new Array(
				{
					title : "Continue",
					action : function(){
						self.manageTransitionToView("fullscreen", "mainscreen", function(){ self.freezeMovement(false) });
					},
				}
			);

			if(eventType == "trader"){

				text = "You encounter a friendly trader who offers to show you his wares.";
				buttons = new Array(
					{
						title : "Continue",
						action : function(){

							self.currentContainer.removeAll();

							var itemArray = Array();

							var numItems = Utils.doRand(3,8);

							for(var i = 0; i < numItems; i++){
								self.currentContainer.addItem(self.generateRandomLootItem("trader"));
							}

							self.manageTransitionToView("fullscreen","merchant");

						},
					}
				);

			}else if( eventType == "trainer" ){

				var trainCost = 0;

				var improvableStats = Array(
					/*
					"str",
					"dex",
					"end",
					"speed",
					"hp"
					*/
				);

				$.each(self.player().activeAbilities(), function(idx, skill){
					if(skill.canTrainNextLevel()){
						improvableStats.push(skill.id)
					}
				});

				var trainSkillString = Utils.chooseRandomly(
					improvableStats
				);
				var trainSkill;
				var trainSkillAmt = 1;
				var trainSkillMax = false;
				var trainSkillSuccessDesc = "";
				var skillOrStat = "stat";

				text = "You encounter a wise old hermit crab who offers to teach you how to ";

				if(trainSkillString == "find_food"){
					text += "get better at scrounging for food";
					trainCost = self.player().activeAbilities()["find_food"].getTrainCost();
					trainSkill = "find_food";
					trainSkillSuccessDesc = "skill in finding food";
					skillOrStat = "skill";
				}else if(trainSkillString == "scan_squares"){
					text += "get better at surveying your surroundings";
					trainCost = self.player().activeAbilities()["scan_squares"].getTrainCost();
					trainSkill = "scan_squares";
					trainSkillSuccessDesc = "scan range";
					skillOrStat = "skill";
				}else if(trainSkillString == "find_treasure"){
					text += "get better at surveying your surroundings";
					trainCost = self.player().activeAbilities()["find_treasure"].getTrainCost();
					trainSkill = "find_treasure";
					trainSkillSuccessDesc = "skill in finding shiny treasure";
					skillOrStat = "skill";
				}else if( trainSkillString == "str" ){
					text += "become stronger";
					trainSkill = "str";
					trainCost = 800;
					trainSkillSuccessDesc = "strength (STR)";
				}else if( trainSkillString == "dex" ){
					text += "become more agile";
					trainSkill = "dex";
					trainCost = 800;
					trainSkillSuccessDesc = "dexterity (DEX)";
				}else if( trainSkillString == "end" ){
					text += "become more resilient";
					trainSkill = "end";
					trainCost = 800;
					trainSkillSuccessDesc = "endurance (END)";
				}else if( trainSkillString == "speed" ){
					text += "become quicker";
					trainSkill = "speed";
					trainCost = 800;
					trainSkillSuccessDesc = "speed (SPD)";
				}else if( trainSkillString == "hp" ){
					text += "become tougher";
					trainSkill = "baseHp";
					trainCost = 800;
					trainSkillAmt = 10;
					trainSkillSuccessDesc = "max HP bonus";
				}else {
					console.log(improvableStats);
					window.onerror.call(window, "Unknown train string: " + trainSkillString, document.location.toString(), 0);
				}

				text += " for " + trainCost + " GP";

				buttons = new Array(
					{
						title : "Buy (" + trainCost + " GP)",
						action : function(){

							var gold = self.player().inventory.getItemByID("gold");
							var trainSkill;

							gold.qty( gold.qty() - this.vars.trainCost );

							if(this.vars.skillOrStat == 'skill'){
								trainSkill = self.player().activeAbilities()[this.vars.trainSkill];
								trainSkill.makeProgress();
								self.logMessage("Your " + this.vars.trainSkillSuccessDesc + " has increased slightly" );
							}else if(this.vars.skillOrStat == 'stat'){
								trainSkill = self.player()[this.vars.trainSkill];
								trainSkill( trainSkill() + this.vars.trainSkillAmt );
								self.logMessage("Your " + this.vars.trainSkillSuccessDesc + " has increased to " + trainSkill() + ( this.vars.trainSkillMax ? "/" + this.vars.trainSkillMax : "" ));
							}

							self.manageTransitionToView("fullscreen","mainscreen", function(){ self.freezeMovement(false); });

						},
						css : function(){
							if( self.player().gp() < this.vars.trainCost ){
								return "disabled";
							}
							return "";
						},
						vars : {
							trainCost : trainCost,
							trainSkill : trainSkill,
							trainSkillAmt : trainSkillAmt,
							trainSkillSuccessDesc : trainSkillSuccessDesc,
							skillOrStat : skillOrStat,
						}
					},
					{
						title : "Leave",
						action : function(){

							self.manageTransitionToView("fullscreen","mainscreen", function(){ self.freezeMovement(false); });

						},
					}
				);

			}else if( eventType == "cooldown" ){

				afterLoad = function(){

					$.each(self.player().activeAbilities(), function(idx, skill){
						skill.cooldown(0);
					});

					self.logMessage(text);
				};

				var cooldownTextOptions = [
					"You take a moment to catch your breath and play FishVille on your phone, and become immediately engrossed in the game. When you decide to resume your journey, you realize that several hours have passed. All your cooldowns are instantly finished.",
					"You're thirsty, so you stop at a nearby Fishbucks and get a double-chocolate pumpkin spiced quadruple shot of espresso. (With whipped cream). You sip it quietly, and relax. All your cooldowns are instantly finished.",
					"You need to take a break and look up directions on your iFin. You spend 30 minutes just trying to get a good signal. Reception is terrible down here! It takes so much time that by the time you regain your bearings, all your cooldowns have finished.",
					"You take a quick power-nap. Your cooldowns are finished, AND you are totally ready to work on that homework assignment that's due tomorrow. You were planning on doing that, right?",
					"You just remembered a really funny thing you wanted to watch on FishTube. It's the one where a sea cucumber...no, wait, was it a salmon? The one where it's chasing a ball and then...no, it wasn't a ball, it was a frisbee. Wasn't it? Your cooldowns finish in the time it takes you to remember.",
					"You just remembered...you left the gas on! You quickly run home and turn it off. But wait, how can you run? You don't have legs! You wake up, short of breath. It was all a dream! Apparently you dozed off. Also, your stove is electric, not gas. Your cooldowns finished while you were asleep.",
				];

				text = Utils.chooseRandomly(cooldownTextOptions);

				buttons = new Array(
					{
						title : "Continue",
						action : function(){
							self.manageTransitionToView("fullscreen","mainscreen", function(){ self.freezeMovement(false); });
						},
					}
				);

			}else if( eventType == "stat" ){

				var stat = Utils.chooseRandomly(
					Array(
						"str",
						"dex",
						"end",
						"exp"
					)
				);

				var statIncreaseAmt = 1;

				var strTextOptions = [
					"You find your path blocked by a large rock. Instead of simply swimming around or over it, you decide to try and move it. After an hour of laborious work, you manage to move it out of the way. The experience empowers you, permanently giving you +1 STR.",
					"You encounter a pair of young fish who went into a crab pot on a dare, and now they can't get out. It takes every ounce of strength you have, but you manage to break open the trap, freeing them. They are eternally grateful for your efforts, and reward you with high-fins and an icepack. You permanently gain +1 STR.",
					"You decide you should finally make use of that year-long subscription you won to Eel A. Fitness. After an hour, you've never felt more sore, but you've never looked better! Permanently gain +1 STR.",
				];

				var dexTextOptions = [
					"While swimming along, you suddenly realize that you are about to crash right into a sharp metal hook just floating in the water in front of you. With quick thinking and maneuvering, you manage to barrel-roll to the side and avoid it. As you cruise past, you also snag a tasty-looking worm that someone apparently left just hanging on the hook. As you munch the delicious worm, you think you can probably figure out how to better avoid such water hazards in the future. Permanently gain +1 DEX.",
					"You take a 30-minute break and do some Yoga. You are particularly talented at the Leaping Fish position. You permently gain +1 DEX. The look of smug self-satisfaction is optional."
				];

				if( stat == "str" ){
					text = Utils.chooseRandomly(strTextOptions);
				}else if( stat == "dex" ){
					text = Utils.chooseRandomly(dexTextOptions);
				}else if( stat == "end" ){
					text = "A passing trout challenges you to an impromptu fin-wrestling contest. The ensuing match takes a full hour before your strength finally gives out and you are forced to concede victory to the other fish. Panting and visibly just as exhausted as you and thoroughly impressed with your determination, the trout tells you one of his fin-wrestling secrets. You gain +1 END.";
				}else if( stat == "exp" ){
					statIncreaseAmt = Math.ceil( self.player().expRequiredForNextLevel() / 2 );
					text = "You come across a water-logged journal lodged between two rocks. Nonchalantly flippering through the pages, you encounter some surprisingly useful advice. Gain " + statIncreaseAmt + " EXP.";
				}

				afterLoad = function(){
					if(stat != "exp"){
						self.player()[stat]( self.player()[stat]() + statIncreaseAmt );
					}else{
						self.player().addExp(statIncreaseAmt);
					}
					self.logMessage(text);

					if( self.player().hasLeveledUp() ){
						self.player().hasLeveledUp(false);
						self.showLevelUpModal();
						self.logMessage("You leveled up! Your stats have improved accordingly.", "combat");
					}
				};

				buttons = new Array(
					{
						title : "Continue",
						action : function(){
							self.manageTransitionToView("fullscreen","mainscreen", function(){ self.freezeMovement(false); });
						},
					}
				);

			}else if( eventType == "inventory" ){

				afterLoad = function(){
					self.player().inventoryMaxSlots( self.player().inventoryMaxSlots() + 1 );
					self.logMessage(text);
				};

				text = "You find a small leather satchel. While it appears to be empty, it still seems to be in pretty good condition, so you strap it onto your pack. Your maximum inventory space has increased by 1.";
				buttons = new Array(
					{
						title : "Continue",
						action : function(){
							self.manageTransitionToView("fullscreen","mainscreen", function(){ self.freezeMovement(false); });
						},
					}
				);

			}

			self.fullScreenContent({
				text : text,
				buttons: buttons
			});
			self.manageTransitionToView("mainscreen","fullscreen", afterLoad);
		}

		this.squareExitAction = function(){

			var square = self.level().getActiveSquare();
			self.freezeMovement(true);

			if(self.level().nextLevelID() == undefined){

				var newLevel = self.level().generateNextLevelIfNotSet(self._getNewLevelParams());

				if( newLevel ){
					self.levels.push(newLevel);
				}

			}

			var nextLevel = self.getLevelById( self.level().nextLevelID() );
			var currentLevel = self.level();

			if(square.isChallengeActive()){
				self.fullScreenContent({
					text: "The water around you grows chilly, and you are filled with a sense of foreboding. You think something big is coming your way...",
					buttons: [
						{
							title : "Actually, on second thought...",
							action : function(){
								self.manageTransitionToView("fullscreen","mainscreen");

								self.freezeMovement(false);

								self.temporarilyDisableActiveSquare(1);
							}
						},
						{
							title : "Let's do this!",
							action : function(){
								self.manageTransitionToView("fullscreen","combat");

								if(self.autoSaveBeforeBosses() == true){
									self.saveGame();
								}

								self.startCombat("boss");
							}
						}
					]
				});

				self.manageTransitionToView("mainscreen","fullscreen");
			}else{
				self.manageTransitionToView("mainscreen","mainscreen", function(){
					self.backButtonLabel("Back");
					self.freezeMovement(false);
					if(self.autoSaveBeforeBosses() == true){
						self.saveGame();
					}
				}, function(){
					nextLevel.isActive(true);
					currentLevel.isActive(false);
					nextLevel.setPlayerPos( nextLevel.entranceSquare()[0], nextLevel.entranceSquare()[1] );
					nextLevel.revealSquaresNearPlayer(1);
					self.level().scanSquaresNearPlayer(0);
					nextLevel.drawMap();
					self.temporarilyDisableActiveSquare(0);
				});
			}

		}

		this.squareEntranceAction = function(){

			self.freezeMovement(true);

			//This is unlikely, but we'd better account for it just to be safe
			if(self.level().prevLevelID() == undefined){

				var newLevel = self.level().generatePrevLevelIfNotSet(self._getNewLevelParams());

				if( newLevel ){
					self.levels.push(newLevel);
				}

			}

			var prevLevel = self.getLevelById( self.level().prevLevelID() );
			var currentLevel = self.level();

			self.manageTransitionToView("mainscreen","mainscreen", function(){
				self.freezeMovement(false);
			}, function(){
				prevLevel.isActive(true);
				currentLevel.isActive(false);
				prevLevel.setPlayerPos( prevLevel.exitSquare()[0], prevLevel.exitSquare()[1] );
				prevLevel.revealSquaresNearPlayer(0);
				prevLevel.drawMap();
			});
		}

		this.handleSquareAction = function(square){
			var type = square.type;

			if(type == "combat"){

				self.squareCombatAction();

			}else if(type == "item"){

				self.squareItemAction();

			}else if(type == "event"){

				self.squareEventAction();

			}else if(type == "exit"){

				self.squareExitAction(square);

			}else if(type == "entrance"){

				self.squareEntranceAction();

			}else{
				//Do nothing
			}
		}

		this._resetActiveItem = function(){

			self.activeItem().desc("");
			self.activeItem().id("");
			self.activeItem().canUse(0);
			self.activeItem().canEquip(0);
			self.activeItem().canBreakdown(0);
			self.activeItem().canDrop(0);
			self.activeItem().canSell(0);
			self.activeItem().canBuy(0);
			self.activeItem().canUnEquip(0);
			self.activeItem().canUpgrade(0);
			self.activeItem().moveDirection("right");
			self.activeItem().actualItem(undefined);

		}

		this.setContainerItemAsActiveItem = function(item, e){
			self._setAsActiveItem({ moveDirection : "left", canEquip : 0, canUse : 0, showQty: true, canBreakdown : 0}, item, e);
		}

		this.setInventoryItemAsActiveItem = function(item, e){
			self._setAsActiveItem({ moveDirection : "right" }, item, e);
		}

		this.setEquipmentItemAsActiveItem = function(item){
			if( !Utils.isEmptyObject(item) ){
				item.isEquipped(true);
				//This is not quite working yet...
				/*if( self.rightColContent() == "container" || self.rightColContent() == "merchant" ){
					self._setAsActiveItem({ moveDirection : "right", canEquip : 0, canUnEquip : 1 }, item);
				}else{
					self._setAsActiveItem({ moveDirection : "left", canEquip : 0, canUnEquip : 1 }, item);
				}*/
				self._setAsActiveItem({ moveDirection : "left", canEquip : 0, canUnEquip : 1, canBuy : 0, canSell : 0 }, item);
			}
		}

		this.setMerchantItemAsActiveItem = function(item, e){
			self._setAsActiveItem({ moveDirection : "left", canEquip : 0, canUse : 0, canBuy : 1 }, item, e);
		}

		this._setAsActiveItem = function(opts, item, e){

			opts = opts || {};
			opts.moveDirection = opts.moveDirection || "right";

			//Reset stuff first
			self._resetActiveItem();

			self.activeItem().id(item.id);
			self.activeItem().desc(item.desc);

			var type = item.type;
			if( type == "consumables" || (opts.canUse && opts.canUse == 1) ){
				self.activeItem().canUse(1);
			}else if ( (opts.moveDirection == "right" && item.canEquip() == 1) || (opts.canEquip && opts.canEquip == 1) ){
				self.activeItem().canEquip(1);
			}else if ( (self.rightColContent() == "equipment" && opts.moveDirection == "left" && item.canEquip() == 1) || (opts.canUnEquip && opts.canUnEquip == 1) ){
				self.activeItem().canUnEquip(1);
			}

			//If item can be salvaged and we are in one of the contexts where salvage is allowed
			if( ( item.canBreakdown() == 1 && (opts.moveDirection == "right" || self.rightColContent() == "equipment" ) ) || ( opts.canBreakdown && opts.canBreakdown == 1 ) ){
				self.activeItem().canBreakdown(1);
			}

			if( (opts.moveDirection == "left" && self.rightColContent() == "equipment") || (opts.canDrop && opts.canDrop == 0) ){
				self.activeItem().canDrop(0);
			}else if( opts.moveDirection == "left" && self.rightColContent() == "container" || (opts.canDrop && opts.canDrop == 1) ){
				self.activeItem().canDrop(1);
			}else if( type != "misc" || (opts.canDrop && opts.canDrop == 1) ){
				self.activeItem().canDrop(1);
			}

			if( ( opts.moveDirection == "left" && self.rightColContent() == "merchant" ) && ( opts.canBuy == undefined || opts.canBuy == 1 ) ){
				self.activeItem().canBuy(1);
			}else if( ( opts.moveDirection == "right" && self.rightColContent() == "merchant" ) || ( opts.canSell && opts.canSell == 1 ) ){
				self.activeItem().canSell(1);
			}

			if( ( item.canUpgrade() == 1 && (opts.moveDirection == "right" || self.rightColContent() == "equipment" ) ) || ( opts.canUpgrade && opts.canUpgrade == 1 ) ){
				self.activeItem().canUpgrade(1);
			}

			self.activeItem().moveDirection(opts.moveDirection);

			self.activeItem().actualItem(item);


		}

		this.equipActiveItem = function(game, event){

			var item = self.activeItem().actualItem(),
				type = item.type;

			var alreadyEquippedItem;

			alreadyEquippedItem = self._equipItem(item);

			self.player().inventory.removeItem(item);

			if( alreadyEquippedItem != undefined && !Utils.isEmptyObject(alreadyEquippedItem) ){
				//Skip the normal slot-checking logic to account for 2H weaps or 1H + shield combos
				self.player().inventory.addItem(alreadyEquippedItem);
				alreadyEquippedItem.isEquipped(false);
			}

			if( type == "weapon" && item.handsRequired == 2){ //We just equipped a 2H weapon, so unequip whatever shield we have equipped
				var existingItem = self.player().getEquippedShield();
				if( !Utils.isEmptyObject(existingItem) ){
					self.player().unEquipShield();
					existingItem.isEquipped(false);
					self.player().inventory.addItem(existingItem);
				}
			}else if( type == "shield" && !Utils.isEmptyObject(self.player().getEquippedWeapon()) && self.player().getEquippedWeapon().handsRequired == 2){
				self.player().inventory.addItem(self.player().getEquippedWeapon());
				self.player().unEquipWeapon();
			}

			self._resetActiveItem();
		}

		this.unEquipActiveItem = function(game, event){

			var item = self.activeItem().actualItem();

			if(item.type == "weapon"){
				self.player().unEquipWeapon(item);
			}else if(item.type == "shield"){
				self.player().unEquipShield(item);
			}else if(item.type == "armor"){
				self.player().unEquipArmor(item);
			}else if(item.type == "accessory"){
				self.player().unEquipAccessory(item);
			}

			item.isEquipped(false);
			self.player().inventory.addItem(item);
			self._resetActiveItem();

		}

		this._equipItem = function(item) {
			var type = item.type;
			var equippedItem;

			if(type == "weapon"){
				equippedItem = self.player().equipWeapon(item);
			}else if(type == "shield"){
				equippedItem = self.player().equipShield(item);
			}else if(type == "armor"){
				equippedItem = self.player().equipArmor(item);
			}else if(type == "accessory"){
				equippedItem = self.player().equipAccessory(item);
			}

			return equippedItem;
		}

		this.getEquipChangeText = function(){
			var actualItem = self.activeItem().actualItem();
			var changeString = "";

			if( actualItem instanceof Weapon){

				var existingMinDmg = 0;
				var existingMaxDmg = 0;
				var existingBonusDmg = 0;
				var minDmgChange = 0;
				var maxDmgChange = 0;
				var bonusDmgChange = 0;

				if( !Utils.isEmptyObject(self.player().getEquippedWeapon()) ){
					existingMinDmg = self.player().getEquippedWeapon().dmgMin();
					existingMaxDmg = self.player().getEquippedWeapon().dmgMax();
					existingBonusDmg = self.player().getEquippedWeapon().extraDamage();
				}

				minDmgChange = actualItem.dmgMin() - existingMinDmg;
				maxDmgChange = actualItem.dmgMax() - existingMaxDmg;
				bonusDmgChange = actualItem.extraDamage() - existingBonusDmg;

				minDmgChange = ( minDmgChange < 0 ) ? "<span class='negative'>" + minDmgChange + "</span>" : ( minDmgChange > 0 ? "<span class='positive'>+" + minDmgChange + "</span>" : "+" + minDmgChange ) ; //show 0 change as "+0"

				maxDmgChange = ( maxDmgChange < 0 ) ? "<span class='negative'>" + maxDmgChange + "</span>" : ( maxDmgChange > 0 ? "<span class='positive'>+" + maxDmgChange + "</span>" : "+" + maxDmgChange ) ; //show 0 change as "+0"

				bonusDmgChange = ( bonusDmgChange < 0 ) ? "<span class='negative'>" + bonusDmgChange + "</span>" : ( bonusDmgChange > 0 ? "<span class='positive'>+" + bonusDmgChange + "</span>" : "+" + bonusDmgChange ) ; //show 0 change as "+0"
				bonusDmgChange = " (" + bonusDmgChange + ")";

				changeString = minDmgChange + " - " + maxDmgChange + (existingBonusDmg > 0 || actualItem.extraDamage() > 0 ? bonusDmgChange : '') + " DMG";

				if( actualItem.handsRequired == 2 ){

					var equippedShield = self.player().getEquippedShield();
					if( equippedShield != undefined && !Utils.isEmptyObject(equippedShield) ) {
						changeString += " (<span class='negative'>-" + equippedShield.armorValue() + "</span> Armor)";
					}

				}

			}else if( actualItem instanceof Armor){

				var existingArmorValue = 0;
				var armorValueChange = 0;

				if( actualItem instanceof Shield ){
					if( !Utils.isEmptyObject(self.player().getEquippedShield()) ){
						existingArmorValue = self.player().getEquippedShield().armorValue();
					}
				}else{
					if( !Utils.isEmptyObject(self.player().getEquippedArmorBySlot(actualItem.armorSlot)) ){
						existingArmorValue = self.player().getEquippedArmorBySlot(actualItem.armorSlot).armorValue();
					}
				}

				armorValueChange = actualItem.armorValue() - existingArmorValue;

				armorValueChange = ( armorValueChange < 0 ) ? "<span class='negative'>" + armorValueChange + "</span>" : ( armorValueChange > 0 ? "<span class='positive'>+" + armorValueChange + "</span>" : "+" + armorValueChange ) ; //show 0 change as "+0"

				changeString = armorValueChange + " Armor";
			}else if( actualItem instanceof Accessory ){

				var currentAccessory = self.player().getEquippedAccessory();
				var existingStatType, existingStatAmt;
				var potentialStatType = actualItem.accessoryStat(),
					potentialStatAmt = actualItem.accessoryStatAmt();

				if( !Utils.isEmptyObject(currentAccessory) ){
					existingStatType = currentAccessory.accessoryStat();
					existingStatAmt = currentAccessory.accessoryStatAmt();
				}

				if(existingStatType){
					if(existingStatType == potentialStatType){
						var statDiff = potentialStatAmt - existingStatAmt;
						var changeType = false;

						if(statDiff > 0){
							changeType = "positive";
						}else if(statDiff < 0){
							changeType = "negative";
						}

						if(changeType){
							changeString = "<span class='" + changeType + "'>" + (changeType == "positive" ? "+" : "-") + Math.abs(statDiff) + "</span> " + potentialStatType;
						}else{
							changeString = "+0 " + potentialStatType;
						}

					}else{
						changeString = "<span class='positive'>+" + potentialStatAmt + "</span> " + potentialStatType + " (<span class='negative'>-" + existingStatAmt + "</span> " + existingStatType + ")";
					}
				}else {
					changeString = "<span class='positive'>+" + potentialStatAmt + "</span> " + potentialStatType;
				}

			}

			return changeString;
		}

		this.salvageActiveItem = function(game, event){

			var item = self.activeItem().actualItem(),
				itemToAdd,
				scrapQty = item.salvageValue() + (item.numUpgradesApplied() * 50);

			if( item instanceof Armor ){
				itemToAdd = self.getAvailableItemById("armor_scraps", "crafting", scrapQty);
			}else if( item instanceof Weapon ){
				itemToAdd = self.getAvailableItemById("weapon_scraps", "crafting", scrapQty);
			}

			if(self.rightColContent() == "equipment" && self.activeItem().moveDirection() == "left" ){ //If item is equipped

				if(item.type == "weapon"){
					self.player().unEquipWeapon(item);
				}else if(item.type == "shield"){
					self.player().unEquipShield(item);
				}else if(item.type == "armor"){
					self.player().unEquipArmor(item);
				}

			}else{
				self.player().inventory.removeItem(item);
			}

			self._resetActiveItem();

			self.player().inventory.addItem(new Item(itemToAdd) );
			var itemLogString = self._assembleLogMessageStringFromItem(item);
			self.logMessage("You gain " + scrapQty + "x " + itemToAdd.name + " from salvaging " + itemLogString + ".","crafting");

		}

		this.buyActiveItem = function(game, event){

			var item = self.activeItem().actualItem();
			var moveFrom = self.currentContainer;
			var moveTo = self.player().inventory;

			var gold = moveTo.getItemByID("gold");
			var itemCost = item.buyValue();

			if( self.player().hasPassiveAbility("improved_barter") ){
				itemCost = Math.floor(itemCost / 2);
			}

			if(gold && gold.qty() >= itemCost){
				gold.qty( gold.qty() - itemCost );

				var newItem = Utils.cloneObject(item);
				newItem.qty(1);

				var srcNumLeft = moveFrom.removeItem(item, 1);

				if(srcNumLeft == 0){
					self._resetActiveItem();
				}

				//Add to inventory
				moveTo.addItem(newItem);

			}

		}

		this.buyMaxActiveItem = function(game, event){

			var item = self.activeItem().actualItem();
			var moveFrom = self.currentContainer;
			var moveTo = self.player().inventory;

			var numPurchasable = Math.floor( self.player().gp() / item.buyValue() );
			var actualPurchasable = (numPurchasable <= item.qty()) ? numPurchasable : item.qty() ;
			var totalCost = actualPurchasable * item.buyValue();

			var gold = moveTo.getItemByID("gold");

			if(gold && gold.qty() >= totalCost){
				gold.qty( gold.qty() - totalCost );

				var newItem = Utils.cloneObject(item);
				newItem.qty(actualPurchasable);

				var srcNumLeft = moveFrom.removeItem(item, actualPurchasable);

				if(srcNumLeft == 0){
					self._resetActiveItem();
				}

				//Add to inventory
				moveTo.addItem(newItem);

			}

		}

		this.sellActiveItem = function(game, event, qty){

			qty = qty || 1;
			var item = self.activeItem().actualItem();
			var moveFrom = self.player().inventory;
			var moveTo = self.currentContainer;
			var goldItem = undefined;

			if(item.sellValue() > 0){
				var gold = self.getAvailableItemById("gold", "misc", (qty * item.sellValue()) );
				goldItem = new Item(gold);
				self.goldGained( self.goldGained() + goldItem.qty() );
			}

			var newItem = Utils.cloneObject(item);
			newItem.qty(qty);

			var srcNumLeft = moveFrom.removeItem(item, qty);

			if(srcNumLeft == 0){
				self._resetActiveItem();
			}

			//Add to inventory
			moveTo.addItem(newItem);
			if(goldItem !== undefined){
				moveFrom.addItem(goldItem);
			}
			self.displaySoldItemMessageForItem(newItem, qty, ( goldItem !== undefined ? goldItem.qty() : 0 ) );
		}

		this.sellAllActiveItem = function(game, event){
			self.sellActiveItem(game, event, self.activeItem().actualItem().qty());
		}
		
		this.useHealthPotion = function(game, event){
			self.useActiveItem(game, event, {id : "health_potion"});
			var playerHpBarWidth = self._calculateHpBarWidthForGivenCurrentAndMaxHp(self.player().hp(), self.player().maxHp());
			self.playerHpBarWidth(playerHpBarWidth);
		}

		this.useActiveItem = function(game, event, item){

			item = item || self.activeItem().actualItem();
			var srcNumLeft;

			if (item.id == "reset_stone"){

				srcNumLeft = self.removeActiveItem(game, event, 1);

				if(srcNumLeft == 0){
					self._resetActiveItem();
				}

				self._activateResetStone();

			}else if(item.id == "health_potion"){

				//TODO: Make this handle the case of consuming a potion in combat as well as outside of combat from either the inventory OR a container!
				var srcCollection = self._getSrcCollectionForActiveItem();
				var numPotsLeft = srcCollection.removeItem("health_potion", 1);
				var numHpToRestore = Math.round(self.player().maxHp() / 2);

				self.player().restoreHealth(0.5, 1);

				self.logMessage("Drinking a health potion restored " + numHpToRestore + " HP.", "player");

				if( numPotsLeft == 0 ){
					self._resetActiveItem();
				}
			}else if(item.isFood == 1){

				srcNumLeft = self.removeActiveItem(game, event, 1);

				if(srcNumLeft == 0){
					self._resetActiveItem();
				}

				self._playerEatFood(item.quality());

			}else if(item.subtype == "event_square_override"){

				srcNumLeft = self.removeActiveItem(game, event, 1);

				if(srcNumLeft == 0){
					self._resetActiveItem();
				}

				self.eventSquareTypeOverride(item.id);

				self.logMessage("You are confident that you will encounter the desired person at their earliest convenience.", "player");

			}else if(item.id == "cooldown_potion"){

				srcNumLeft = self.removeActiveItem(game, event, 1);

				if(srcNumLeft == 0){
					self._resetActiveItem();
				}

				$.each(self.player().activeAbilities(), function(idx, skill){
					skill.cooldown(0);
				});

				self.logMessage("Much like Madeline Kahn in Blazing Saddles, you feel 'wefweshed.'", "player");

			}else if(item.id == "stat_potion"){

				srcNumLeft = self.removeActiveItem(game, event, 1);

				if(srcNumLeft == 0){
					self._resetActiveItem();
				}

				//Choose a stat
				var improvableStats = Array(
					"str",
					"dex",
					"end",
					"speed",
					"baseHp"
				);

				var statStr = Utils.chooseRandomly(improvableStats);

				//Improve it
				var statToImprove = self.player()[statStr];
				var improveAmt = 1;

				if(statStr == "baseHp"){
					improveAmt = 5;
				}
				statToImprove( statToImprove() + improveAmt );

				if(statStr == "speed"){
					statStr = "Speed";
				}else if(statStr == 'baseHp'){
					statStr = "HP";
				}else{
					statStr = statStr.toUpperCase();
				}

				//Output message
				self.logMessage("Your " + statStr + " has increased by " + improveAmt + "!", "player");
			}

		}

		this.showSettingsArea = function(){
			self.temporaryPreferenceStorage = self.getPrefData();
			self.manageTransitionToView("mainscreen","settings");
		}

		this.backFromSettings = function(){

			if(self.resetPreferences()){
				self.initPrefs(self.temporaryPreferenceStorage);
			}else{
				self.resetPreferences(1);
			}

			self.temporaryPreferenceStorage = {};

			self.showContentArea();
		}

		this.switchNextSortOrder = function(data, event){
			var currentSort = self[data.optKey + "SortOrder"];
			var currentSortIdx = self.sortByPresetsList.indexOf(currentSort());
			var newSortIdx;

			if(currentSortIdx == (self.sortByPresetsList.length - 1)){
				newSortIdx = 0;
			}else{
				newSortIdx = currentSortIdx + 1;
			}

			currentSort( self.sortByPresetsList[newSortIdx] );
			//self._forceRecalculate.valueHasMutated();
		}

		this.switchInventoryEquipmentToggle = function(data, event){
			var currentSort = self.inventoryEquipmentToggle;
			var currentSortIdx = self.showInventoryEquipmentPresetsList.indexOf(currentSort());
			var newSortIdx;

			if(currentSortIdx == (self.showInventoryEquipmentPresetsList.length - 1)){
				newSortIdx = 0;
			}else{
				newSortIdx = currentSortIdx + 1;
			}

			currentSort( self.showInventoryEquipmentPresetsList[newSortIdx] );
			self._resetActiveItem();
			//self._forceRecalculate.valueHasMutated();
		}

		this._playerEatFood = function(quality){

			var hpRestored = self.player().restoreHealth( self[quality + 'HpRestore']() );

			self.logMessage("Eating some food restored " + hpRestored + " HP!", "player");

		}

		this._activateResetStone = function(){
			self.level().generateThisLevel(true);
			self.level().revealSquaresNearPlayer(0);
			self.level().drawMap();

			self.logMessage("The magical powers of the stone are expended, and it crumbles into dust before your very eyes. " +
							"With a quick glance around, you see that nothing is as it was just a few moments before.", "player");
		}

		this.upgradeActiveItem = function(game, event){
			var numScrapsLeft,
				qty = self.activeItem().actualItem().costForNextUpgradeLevel();
			if( self.activeItem().actualItem() instanceof Armor ){
				numScrapsLeft = self.player().removeItemFromInventory("armor_scraps", qty);
			}else if( self.activeItem().actualItem() instanceof Weapon ){
				numScrapsLeft = self.player().removeItemFromInventory("weapon_scraps", qty);
			}
			self.activeItem().actualItem().applyUpgrade();
			self.logMessage("Using your underwater welding gear, hammer, nails, duct tape, and " + qty + " scraps, you are able to improve the following attribute(s) of your " + self.activeItem().actualItem().name + ": " + self.activeItem().actualItem().attributesImprovedByLastCrafting + "." ,"crafting");
		}

		this._dropActiveItem = function(game, event, qty){

			var itemToMoveId = self.activeItem().actualItem().id,
				itemToMoveUniqueId = self.activeItem().actualItem().uniqueID,
				existingItem = undefined,
				newItem = undefined,
				moveFrom = "inventory",
				moveTo = false,
				srcCollection = self.player().inventory,
				tarCollection = undefined;

			//Do we have an active container?
			if(self.rightColContent() == 'container'){

				//Are we moving from inventory -> container OR container -> inventory?
				if(self.activeItem().moveDirection() == "right"){

					moveTo = "container";

					tarCollection = self.currentContainer;

				}else{

					moveFrom = "container";
					moveTo = "inventory";

					srcCollection = self.currentContainer;
					tarCollection = self.player().inventory;
				}
			}

			//Get the existing item we want to "move"
			existingItem = srcCollection.getItemByUniqueID(itemToMoveUniqueId);
			//Clone it so we're not writing to the same object from two different places
			if(moveTo){
				newItem = Utils.cloneObject(existingItem);

				//Set the right qty on the object we want to add
				if(qty == undefined || qty == "all"){
					newItem.qty(existingItem.qty());
				}else{
					newItem.qty(qty);
				}
			}

			//Remove the object from the source
			var srcNumLeft = srcCollection.removeItem(existingItem, qty);

			if(moveFrom == "container" && moveTo == "inventory"){

				if(srcNumLeft == 0){
					self._resetActiveItem();
				}

				if(newItem.canEquip() && self.player().shouldAutoEquip(newItem)){
					//Equip it
					self._equipItem(newItem);

					//Log acquisition
					self.displayAcquiredAndEquippedItemMessageForItem(newItem);
				}else{
					//Add to inventory
					tarCollection.addItem(newItem);

					//Log acquisition
					self.displayAcquiredItemMessageForItem(newItem);
				}

			}else if ( moveFrom == "inventory" ){

				if(srcNumLeft == 0){
					self._resetActiveItem();
				}

				if(moveTo){
					//Add to container
					tarCollection.addItem(newItem);
				}

				//Log dropping
				self.displayDroppedItemMessageForItem(existingItem, qty);
			}

		}

		this.moveActiveItem = function(game, event){

			self._dropActiveItem(game, event, 1);

		}

		this.moveAllActiveItem = function(game, event){

			self._dropActiveItem(game, event, "all");

		}

		this.removeActiveItem = function(game, event, qty){

			var actualItem = self.activeItem().actualItem(),
				srcCollection = undefined;

			srcCollection = self.player().inventory;

			//Do we have an active container?
			if(self.rightColContent() == 'container' && self.activeItem().moveDirection() == "left"){
				srcCollection = self.currentContainer;
			}

			var srcNumLeft = srcCollection.removeItem(actualItem, qty);

			return srcNumLeft;

		}

		this._shouldItemBeSelected = function(item){
			//If an item is actually active
			if( self.activeItem().actualItem() != undefined ){

				if(self.activeItem().actualItem().uniqueID == item.uniqueID){
					return true;
				}
				return false;

			}
			return false;
		}

		this.shouldLineItemBeHidden = function(item, sectionKey){
			if(item.id == "gold" && sectionKey != "container"){
				return true;
			}
			return false;
		}

		this.displayAcquiredItemMessageForItem = function(item){
			var itemString = 'You obtain: ';
			itemString += self._assembleLogMessageStringFromItem(item);
			self.logMessage(itemString);
		}

		this.displayAcquiredAndEquippedItemMessageForItem = function(item){
			var itemString = 'You obtain: ';
			itemString += self._assembleLogMessageStringFromItem(item);
			itemString += ". It was automatically equipped.";
			self.logMessage(itemString);
		}

		this.displayDroppedItemMessageForItem = function(item, qty){
			var itemString = 'You drop: ';
			itemString += self._assembleLogMessageStringFromItem(item, qty);
			self.logMessage(itemString);
		}

		this.displaySoldItemMessageForItem = function(item, qty, goldGained){
			var itemString = 'You gain ' + goldGained + ' GP from the sale of: ';
			itemString += self._assembleLogMessageStringFromItem(item, qty);
			self.logMessage(itemString);
		}

		this._shouldSkillBeSelected = function(skill){
			//If a skill is actually active
			if( self.activeSkill() != undefined ){

				if(self.activeSkill().id == skill.id){
					return true;
				}
				return false;

			}
			return false;
		}

		this.setSkillAsActiveSkill = function(skill, e){
			self.activeSkill(skill);
		}

		this.canPurchaseActiveSkill = function(){
			if(self.activeSkill().canPurchase == 1 && self.player().availablePerkPoints() > 0 && self.player().level() >= self.activeSkill().requiredLevel){
				return true;
			}
			return false;
		}

		this.purchaseActiveSkill = function(){
			if( self.activeSkill().node_path == 'active_abilities' ){
				self.player().addActiveAbility(self.activeSkill().id, self.activeSkill());
			}else if( self.activeSkill().node_path == 'combat_abilities' ){
				self.player().addCombatAbility(self.activeSkill().id, self.activeSkill());
			}else if( self.activeSkill().node_path == 'passive_abilities' ){
				self.player().addPassiveAbility(self.activeSkill().id, self.activeSkill());
			}
			self.player().availablePerkPoints( self.player().availablePerkPoints() - 1 );
			self.activeSkill(undefined);
		}

		this.manageTransitionToView = function(fromArea, toArea, afterTransitionCallback, extraMidTransitionCallback){

			var midTransitionCallback;
			extraMidTransitionCallback = (extraMidTransitionCallback !== undefined && typeof extraMidTransitionCallback === 'function') ? extraMidTransitionCallback : function(){};

			if(toArea == "equipment"){
				//For now it's assumed that one can only get here from Main Screen...
				midTransitionCallback = function(){
					self.setSectionContents("inventory", "item_desc", "equipment");
				}
			}else if(toArea == "mainscreen"){
				//Make sure we capture this value now, in case it changes later
				var isNew = self.isNew();
				midTransitionCallback = function(){
					self.setSectionContents("player_controls", "map_controls", "map");

					self._resetActiveItem();
					self.currentContainer.removeAll();
					self.currentEnemy(undefined);
					self.backButtonLabel("Back");

					if(isNew == true){
						$MESSAGE_LOG.fadeIn(BASE_FADEIN_SPEED);
						$PLAYER_STAT_HEADER.fadeIn(BASE_FADEIN_SPEED);
					}
				}
			}else if(toArea == "combat"){
				//For now it's assumed that one can only get here from Fullscreen Message...
				midTransitionCallback = function(){
					self.setSectionContents("combat_player", "combat_buttons", "combat_enemy");
				}
			}else if(toArea == "container"){
				midTransitionCallback = function(){
					self.setSectionContents("inventory", "item_desc", "container");
				}
			}else if(toArea == "merchant"){
				//For now it's assumed that one can only get here from Fullscreen Message...
				midTransitionCallback = function(){
					self.setSectionContents("inventory", "item_desc", "merchant");
				}
			}else if(toArea == "fullscreen"){
				//We're assuming that the fullscreen content has already been set...
				midTransitionCallback = function(){
					self.setSectionContents(undefined, "fullscreen_content", undefined);
				}
			}else if(toArea == "skills"){
				midTransitionCallback = function(){
					self.setSectionContents( "skills", "skills", "skills" );
				}
			}else if(toArea == "settings"){
				midTransitionCallback = function(){
					self.setSectionContents( "settings", "settings", undefined );
				}
			}

			self.replaceMainScreenContent(function() { midTransitionCallback(); extraMidTransitionCallback(); }, afterTransitionCallback);
		}

		this.setSectionContents = function(left, center, right){
			self.leftColContent(left);
			self.centerColContent(center);
			self.rightColContent(right);
		}

		this.replaceMainScreenContent = function(midTransitionCallback, postTransitionCallback){
			$MAIN_CONTENT_DIV.fadeOut(FAST_FADEOUT_SPEED, function(){

				if(typeof midTransitionCallback === 'function'){
					midTransitionCallback();
				}

				$MAIN_CONTENT_DIV.fadeIn(FAST_FADEIN_SPEED, function(){
					
					if(typeof postTransitionCallback === 'function'){
						postTransitionCallback();
					}
					
				});
			});
		}

		this.quickEatFood = function(){
			var sortOrder = (self.quickEatPriority() == 'asc') ? 'ASC' : 'DESC' ;
			var sortedFilteredItems = self.player().inventory.getSortedFilteredItems("isFood", 1, "qualityModifier", sortOrder);
			var foodItem = sortedFilteredItems[0];

			self.player().inventory.removeItem(foodItem, 1);

			self._playerEatFood(foodItem.quality());
		}

		this.logMessage = function(msgText, cssClass){
			self.logMessages.unshift( {text: msgText, cssClass: cssClass || "info"} );
			$(".message-log").stop(false, true).effect("highlight", { color: "#BEBEBE" }, 400);
		}

		this._assembleLogMessageStringFromItemCollection = function(itemArray){
			var itemArrayLength = itemArray.length();
			
			var foundItemString = '';
			var foundItem;

			for(var i=0; i < itemArrayLength; i++){
				foundItem = itemArray.getItemByIdx(i);
				
				if( i == (itemArrayLength - 1) && itemArrayLength > 1){
					foundItemString+=', and ';
				}else if(i > 0 && itemArrayLength > 1){
					foundItemString+=', ';
				}
				foundItemString+= self._assembleLogMessageStringFromItem(foundItem);
			}

			return foundItemString;
		}

		this.getLevelById = function(id){
			for(i = 0; i < self.levels().length; i++){
				if( id == self.levels()[i].levelID() ){
					return self.levels()[i];
				}
			}
			return false;
		}

		this._makeMagicReplacementsForItem = function(string, item){
			return Utils.makeMagicReplacements(string, [self, item]);
		}

		this._assembleLogMessageStringFromItem = function(item, qty){
			var showQty = (qty == 0) ? 0 : 1;

			if(qty && qty == "all"){
				qty = item.qty();
			}
			qty = qty || item.qty();
			var itemName = self._makeMagicReplacementsForItem(item.name, item);
			if( item.namedItem && typeof item.namedItem === "function" && item.namedItem() == 1 ){
				itemName = "<em>" + item.name + "</em>";
			}
			var itemString = (showQty ? qty + "x " : "") + "<span class='"
				+ ((item.hasQuality) ? item.quality() : "") + "'>" +  itemName + "</span>";
			return itemString;
		}

		this._getHtmlDisplayStringForItem = function(item, context){
			var displayString;
			if(context == "equipment"){
				if(item.name == undefined){
					displayString = "None";
				}else{
					displayString = self._assembleLogMessageStringFromItem(item, 0);
				}
			}else if(context == "inventory" || context == "merchant" || context == "container") {
				displayString = self._assembleLogMessageStringFromItem(item, 0);
			}else{

			}
			return displayString;
		}

		this._updateZoomSettings = function(){
			$('meta[name=viewport]').remove();
			if(self.enableZoom() == 1){
	    		$('head').prepend('<meta name="viewport" content="width=device-width, initial-scale=1">');
			}else{
				$('head').prepend('<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">');
			}
		}

		this.loadGame = function(){
			self.loadGameFromData(JSON.parse(localStorage.getItem("saveData"), function(k, v){
				if(v.constructor == String && v.match(/^function \(/)){
					eval("var rehydratedFunction = " + v);
					return rehydratedFunction;
				}
				return v;
			}));
		}

		this.saveGame = function(){
			var saveData = self.getExportData();
			localStorage.setItem("saveData", saveData);

			$SAVED_NOTICE.finish().show();
			$SAVED_NOTICE.delay(800).fadeOut(600);
		}

		this.loadPrefs = function(hideAnim){
			var prefData = JSON.parse(localStorage.getItem("prefData"));
			return prefData || false;
		}

		this.savePrefs = function(){
			var prefData = self.getExportData(true);
			localStorage.setItem("prefData", prefData);

			self.temporaryPreferenceStorage = self.getPrefData();

			$SAVED_PREF_NOTICE.finish().show();
			$SAVED_PREF_NOTICE.delay(800).fadeOut(600);

			//Update zoom controls
			self._updateZoomSettings();
		}

		this.getPrefData = function(){
			var exportObj = {
				wasdKeysControlPlayerPos : self.wasdKeysControlPlayerPos(),
				quickEatPriority : self.quickEatPriority(),
				autoSaveBeforeBosses : self.autoSaveBeforeBosses(),
				monsterSquareRates : self.monsterSquareRates(),
				pctEmptySquares : self.pctEmptySquares(),
				enableZoom : self.enableZoom(),
			};
			return exportObj;
		}

		this.getExportData = function(justPrefs){
			
			justPrefs = (justPrefs === undefined) ? 0 : justPrefs ;

			var exportObj = self.getPrefData();

			if(justPrefs == false){
				$.extend(
					exportObj,
					{
						player 				: self.player().getExportData(),
						levels 				: Array(),
						leftColContent 		: self.leftColContent(),
						centerColContent 	: self.centerColContent(),
						rightColContent		: self.rightColContent(),
						fullScreenContent 	: self.fullScreenContent(),
						isNew				: self.isNew(),
						logMessages			: self.logMessages(),
						wasdKeysControlPlayerPos : self.wasdKeysControlPlayerPos(),
						freezeMovement		: self.freezeMovement(),
						backButtonLabel : self.backButtonLabel(),
						currentEnemy	: self.currentEnemy() ? self.currentEnemy().getExportData() : undefined,
						currentContainer : self.currentContainer.getExportData(),
						playerHpBarWidth : self.playerHpBarWidth(),
						enemyHpBarWidth : self.enemyHpBarWidth(),
						goldGained : self.goldGained(),
						inventorySortOrder : self.inventorySortOrder(),
						containerSortOrder : self.containerSortOrder(),
						merchantSortOrder : self.merchantSortOrder(),
						inventoryEquipmentToggle : self.inventoryEquipmentToggle(),
						numBattlesWon : self.numBattlesWon(),
						numItemSquaresLooted : self.numItemSquaresLooted(),
						savedBuildVersion : BUILD_VERSION,
					}
				);

				for(i=0; i < self.levels().length; i++){
					var thisLevel = self.levels()[i];

					exportObj.levels.push(thisLevel.getExportData());
				}
			}

			return JSON.stringify(exportObj, function(k, v){
				if(typeof v === 'function'){
					return v.toString();
				}else{
					return v;
				}
			});
		}

		this.loadGameFromData = function(gameData){
			
			if(gameData == undefined){
				return false;
			}

			$.when($MAIN_CONTENT_DIV.add($PLAYER_STAT_HEADER).add($MESSAGE_LOG).fadeOut(FAST_FADEOUT_SPEED)).done(function(){
				self.initGame(gameData);
			});
		}

		this.getRandomVendorTrash = function(){

			var possibleTrash = self.itemDataCollection.getNode(["items", "trash"], 1);

			var trashKey = Utils.chooseRandomly(possibleTrash);

			var trashObj = self.itemDataCollection.getNode(["items", "trash", trashKey]);

			return trashObj;
		}

		this.getRandomScroungable = function(qualityCategory, justData){

			if(!qualityCategory){
				qualityCategory = Utils.chooseRandomly(Utils.getPossibleQualities());
			}

			var possibleFoods = self.itemDataCollection.getNode(["items", "consumables", "scroungables", qualityCategory], 1);

			var foodKey = Utils.chooseRandomly(possibleFoods);

			var foodObj = self.itemDataCollection.getNode(["items", "consumables", "scroungables", qualityCategory, foodKey]);

			var qty = 2;

			var descString = "Restores %" + qualityCategory + "HpRestore% HP when consumed";
			var itemData = $.extend(
				foodObj,
				{ qty : qty, type : "consumables", desc : descString }
			)

			if(justData){
				return itemData;
			}
			return new Consumable(itemData);
		}

		this.getAvailableItemsByType = function(type){
			return self.itemDataCollection.getNode(["items", type]) || false;
		}

		this.getAvailableItemIdsByTypeForLevel = function(type, level){
			var allItems = self.getAvailableItemsByType(type);
			var availableItemKeys = Object.keys(allItems);
			var availableItems = new Array();

			for(var i = 0; i < availableItemKeys.length; i++){
				if( self._itemCanAppearForLevel(allItems[availableItemKeys[i]], level) ){
					availableItems.push(allItems[availableItemKeys[i]].id);
				}
			}

			return availableItems;
		}

		this.getAvailableItemById = function(itemID, type, qty){

			var matchingItem;

			if(type != undefined){

				var availableItems = self.getAvailableItemsByType(type);
				if(availableItems){
					matchingItem = availableItems[itemID] || false;

					if( matchingItem ){

						if(qty){
							matchingItem.qty = qty;
						}
						return matchingItem;
					}
				}

			}else{

				var availableTypes = self.getAvailableItemTypes();
				matchingItem = undefined;

				for(i=0; i < availableTypes.length; i++){
					matchingItem = self.getAvailableItemsByType(availableTypes[i])[itemID];
					if( matchingItem ){

						if(qty){
							matchingItem.qty = qty;
						}
						return matchingItem;
					}
				}

				return false;
			}

		}

		this.getAvailableItemTypes = function(){
			return self.itemDataCollection.getNode(["items"], 1);
		}

		this.getAvailableArmorItemsBySlot = function(slot){
			return self.itemDataCollection.getNodeFilteredByField(["items", "armor"], "armorSlot", slot, "id");
		}

		this.getAvailableMonsterIdsByMonsterCategory = function(category){
			category = category || "regular";
			return self.monsterDataCollection.getNode([category], 1);
		}

		this.getAvailableMonsterDataByMonsterCategory = function(category, asArray){

			asArray = (asArray !== undefined) ? asArray : 0 ;
			category =  category || "regular";
			var monsterDataObjById = self.monsterDataFile[category];

			if(!asArray){
				return monsterDataObjById;
			}

			var monsterDataArray = [];
			var keys = Object.keys(monsterDataObjById);
			for (var i = 0; i < keys.length; i++) {
				monsterDataArray.push(monsterDataObjById[keys[i]]);
			}

			return monsterDataArray;
		}

		this.getMonsterDataByIdAndCategory = function(monsterId, category){
			return self.monsterDataCollection.getNode([category, monsterId]);
		}

		this.showLevelUpModal = function(){
			var options = {
				backdrop: 'static',
				keyboard: false
			}

			var trackChanges = self.player().levelUpChanges;

			//Prepare our stat notification
			var statChanges = '';

			if(trackChanges.hpRestored !== undefined && trackChanges.hpRestored > 0){
				if(self.player().hasPassiveAbility("improved_hp_leveling")){
					statChanges += 'Your HP has been fully restored';
				}else{
					statChanges += 'You have healed up to half of your total HP (gained +' + trackChanges.hpRestored + ' points)';
				}
			}else if( trackChanges.hpRestored == undefined || trackChanges.hpRestored < 0 ){
				if(self.player().hasPassiveAbility("improved_hp_leveling")){
					statChanges += 'No HP was restored, as you are already at full health.';
				}else{
					statChanges += 'No HP was restored, as you are already at or above half health.';
				}
			}

			if(trackChanges.baseHp !== undefined && trackChanges.baseHp > 0){
				statChanges += '<br/>Your base HP has increased by ' + trackChanges.baseHp;
			}

			if(trackChanges.endGain !== undefined && trackChanges.endGain > 0){
				statChanges += '<br/>Your Endurance (END) has increased by ' + trackChanges.endGain;
			}

			var playerHpBarWidth = self._calculateHpBarWidthForGivenCurrentAndMaxHp(self.player().hp(), self.player().maxHp());
			self.playerHpBarWidth(playerHpBarWidth);

			if(trackChanges.strGain !== undefined && trackChanges.strGain > 0){
				statChanges += '<br/>Your Strength (STR) has increased by ' + trackChanges.strGain;
			}

			if(trackChanges.dexGain !== undefined && trackChanges.dexGain > 0){
				statChanges += '<br/>Your Dexterity (DEX) has increased by ' + trackChanges.dexGain;
			}

			if(trackChanges.spdGain !== undefined && trackChanges.spdGain > 0){
				statChanges += '<br/>Your Speed (SPD) has increased by ' + trackChanges.spdGain;
			}

			if(trackChanges.inventorySlotGain !== undefined && trackChanges.inventorySlotGain > 0){
				statChanges += '<br/>Your Inventory capacity has increased by ' + trackChanges.inventorySlotGain;
			}

			if(trackChanges.perkPointGain !== undefined && trackChanges.perkPointGain > 0){
				statChanges += '<br/>You have gained ' + trackChanges.perkPointGain + ' new Perk Point to spend!';
			}

			if(trackChanges.abilityGains !== undefined){
				for (var ability_id in trackChanges.abilityGains) {
					if(trackChanges.abilityGains[ability_id].newSkillLevel !== undefined){
						//We leveled up
						statChanges += '<br/>Your ' + trackChanges.abilityGains[ability_id].name + ' ability has leveled up!';
					}else if(trackChanges.abilityGains[ability_id].newProgress !== undefined){
						statChanges += '<br/>Progress in your ' + trackChanges.abilityGains[ability_id].name + ' ability has increased to ' + trackChanges.abilityGains[ability_id].newProgress;
					}
				}
			}

			//self.showModalClose(false);

			self.modalWindowTitle("Woohoo!");
			self.showModalWindowFooter(false);
			self.modalWindowText("You have leveled up!<br/><br/>" + statChanges);
			self.showModal(options);
		}

		this.modalHidden = function(){
			self.modalWindowTitle("");
			self.modalWindowText("");
			self.showModalClose(true);
			self.showModalWindowFooter(true);
			self.modalWindow.data('bs.modal').options.backdrop = true;
			self.modalWindow.data('bs.modal').options.keyboard = true;
		}

		this.showFaq = function(){
			var options = {
				backdrop: 'static',
				keyboard: false
			}

			self.modalWindowTitle("Help/FAQ");
			self.showModalWindowFooter(false);
			self.modalWindowText($FAQ.html());
			self.showModal(options);
		}

		this._getSrcCollectionForActiveItem = function(){
			
			var srcCollection = self.player().inventory;

			if(self.rightColContent() == 'container' && self.activeItem().moveDirection() == "left"){
				srcCollection = self.currentContainer;
			}

			return srcCollection;
		}

		this._getNewLevelParams = function(overrideWithObj){
			var params = {};
			var genOptsOverrideObj = undefined;
			overrideWithObj = overrideWithObj || {};

			if(overrideWithObj.genOpts !== undefined){
				genOptsOverrideObj = overrideWithObj.genOpts;
				delete overrideWithObj.genOpts;
			}

			params.numSquares = 15;

			$.extend(
				params,
				overrideWithObj
			);

			params.genOpts = self._getLevelGenOpts(genOptsOverrideObj);

			return params;
		}

		this._getLevelGenOpts = function(overrideWithObj){
			var opts = {};
			overrideWithObj = overrideWithObj || {};

			if(self.pctEmptySquares() == 1){
				opts.percentEmpty = 25;
			}else if(self.pctEmptySquares() == 2){
				opts.percentEmpty = 50;
			}else if(self.pctEmptySquares() == 3){
				opts.percentEmpty = 75;
			}else if(self.pctEmptySquares() == 4){
				opts.percentEmpty = 100;
			}else{
				opts.percentEmpty = 50;
			}

			if(self.monsterSquareRates() == 1){
				opts.genPercents = {
					25 : "combat",
					33 : "item",
					42 : "event",
				};
			}else if(self.monsterSquareRates() == 2){
				opts.genPercents = {
					50 : "combat",
					20 : "item",
					30 : "event",
				};
			}else if(self.monsterSquareRates() == 3){
				opts.genPercents = {
					75 : "combat",
					8 : "item",
					17 : "event",
				};
			}else if(self.monsterSquareRates() == 4){
				opts.genPercents = {
					100 : "combat",
				};
			}else{
				opts.genPercents = {
					50 : "combat",
					20 : "item",
					30 : "event",
				};
			}

			$.extend(
				opts,
				overrideWithObj
			);

			return opts;
		}

		this._itemCanAppearForLevel = function(item, level){
			if( (item.minLevelRange <= level || item.minLevelRange == undefined) && (item.maxLevelRange > level || item.maxLevelRange == undefined) ){
				return true;
			}
			return false;
		}

		this._calculateHpBarWidthForGivenCurrentAndMaxHp = function(current, max){
			var hpBarTargetPercent = current / max;
			//It would be nice if the max width could be dynamically calculated...
			var progressBarWidth = hpBarTargetPercent * self.hpBarBaseWidth;
			return progressBarWidth;
		}

		this.testPotion = function(){

			var itemData = self.getAvailableItemById("health_potion", "consumables", 1);

			self.currentContainer.removeAll();

			self.currentContainer.addItem(new Consumable(itemData));

			self.manageTransitionToView("mainscreen","container");

		}

		this.testScrap = function(){

			itemToAdd = self.getAvailableItemById("weapon_scraps", "crafting", 400);
			self.player().addItemToInventory( new Item(itemToAdd) );
			itemToAdd = self.getAvailableItemById("armor_scraps", "crafting", 400);
			self.player().addItemToInventory( new Item(itemToAdd) );
		}

		this.testGold = function(){

			itemToAdd = self.getAvailableItemById("gold", "misc", 2000);
			self.player().addItemToInventory( new Item(itemToAdd) );
		}

		this.testEvent = function(){

			var eventType = "";
			var numTraders = 0;
			var numTrainers = 0;
			var numCooldowns = 0;
			var numStats = 0;

			for(var i=0; i < 1000; i++){

				eventType = Utils.doBasedOnPercent({
					30 : "trainer",
					40 : "trader",
					20 : "cooldown",
					10 : "stat",
				});

				if(eventType == "trainer"){
					numTrainers++;
				}else if(eventType == "trader"){
					numTraders++;
				}else if(eventType == "cooldown"){
					numCooldowns++;
				}else if(eventType == "stat"){
					numStats++;
				}

				console.log(eventType);
			}

			console.log("Total traders: " + numTraders);
			console.log("Total trainers: " + numTrainers);
			console.log("Total cooldowns: " + numCooldowns);
			console.log("Total stats: " + numStats);

		}

		this.testInventoryCapacity = function(levelNum){

			var currentLevelNum = self.level().levelNum();
			levelNum = levelNum || currentLevelNum;

			self.level().levelNum(levelNum);

			for(var i=0; i < self.player().inventoryMaxSlots(); i++){
				var newLootItem = self.generateRandomLootItem();
				self.player().addItemToInventory( newLootItem, 1 );
			}

			self.level().levelNum(currentLevelNum);

		}

		this.testScalingWeaponLoopAsCSV = function(){
			var results = self.testScalingWeaponLoop();

			var qualities = Utils.getPossibleQualities();

			//Order by level, quality, item ID
			var line = "";
			//var lines = [];
			var lines;
			var k;

			$.each(results, function(idx, elem){
				var lvlNum = (idx + 1);
				var quality = "";
				var itemName = "";

				for(k = 0; k < qualities.length; k++){
					quality = qualities[k];
					
					$.each(elem[quality], function(name, data){
						itemName = name;

						line = lvlNum + "," + quality + "," + itemName + "," + data.min + "," + data.max + "\n";

						//lines.push(line);
						lines += line;
					});
				}

			});

			console.log(lines);
		}

		this.testScalingWeaponLoop = function(){
			var output = [];
			var qualities = Utils.getPossibleQualities();
			var i, k;
			for(i = 1; i < 101; i++){
				var objectForLevel = {};
				for(k = 0; k < qualities.length; k++){
					objectForLevel[qualities[k]] = self.testScalingWeapon(i, qualities[k]);
				}
				output.push(objectForLevel);
			}
			//console.log(output);
			return output;
		}

		this.testScalingWeapon = function(levelNum, quality){
			var itemOne = self.getAvailableItemById("melee_weapon_01", "weapon", 1),
				itemTwo = self.getAvailableItemById("melee_weapon_02", "weapon", 1),
				itemThree = self.getAvailableItemById("melee_weapon_04", "weapon", 1);

			quality = quality || "poor";

			itemOne.fullyDynamicStats = 1;
			itemOne.level = levelNum;
			itemOne.quality = quality;
			itemTwo.fullyDynamicStats = 1;
			itemTwo.level = levelNum;
			itemTwo.quality = quality;
			itemThree.fullyDynamicStats = 1;
			itemThree.level = levelNum;
			itemThree.quality = quality;
			
			var newItemOne = new Weapon(itemOne),
				newItemTwo = new Weapon(itemTwo),
				newItemThree = new Weapon(itemThree);

			return {
				"01" : {
					"min" : newItemOne.dmgMin(),
					"max" : newItemOne.dmgMax(),
				},
				"02" : {
					"min" : newItemTwo.dmgMin(),
					"max" : newItemTwo.dmgMax(),
				},
				"04" : {
					"min" : newItemThree.dmgMin(),
					"max" : newItemThree.dmgMax(),
				},
			}
		}

		this.testScalingArmorLoopAsCSV = function(){
			var results = self.testScalingArmorLoop();

			var qualities = Utils.getPossibleQualities();

			//Order by level, quality, item ID
			var line = "";
			//var lines = [];
			var lines;
			var k;

			$.each(results, function(idx, elem){
				var lvlNum = (idx + 1);
				var quality = "";
				var itemName = "";

				for(k = 0; k < qualities.length; k++){
					quality = qualities[k];
					
					$.each(elem[quality], function(name, data){
						itemName = name;

						line = lvlNum + "," + quality + "," + itemName + "," + data.armor + "\n";

						//lines.push(line);
						lines += line;
					});
				}

			});

			console.log(lines);
		}

		this.testScalingArmorLoop = function(){
			var output = [];
			var qualities = Utils.getPossibleQualities();
			var i, k;
			for(i = 1; i < 101; i++){
				var objectForLevel = {};
				for(k = 0; k < qualities.length; k++){
					objectForLevel[qualities[k]] = self.testScalingArmor(i, qualities[k]);
				}
				output.push(objectForLevel);
			}
			//console.log(output);
			return output;
		}

		this.testScalingArmor = function(levelNum, quality){
			var itemOne = self.getAvailableItemById("tail_armor_01", "armor", 1),
				itemTwo = self.getAvailableItemById("fin_armor_01", "armor", 1),
				itemThree = self.getAvailableItemById("body_armor_01", "armor", 1);
				itemFour = self.getAvailableItemById("head_armor_01", "armor", 1);
				

			quality = quality || "poor";

			itemOne.fullyDynamicStats = 1;
			itemOne.level = levelNum;
			itemOne.quality = quality;
			itemTwo.fullyDynamicStats = 1;
			itemTwo.level = levelNum;
			itemTwo.quality = quality;
			itemThree.fullyDynamicStats = 1;
			itemThree.level = levelNum;
			itemThree.quality = quality;
			itemFour.fullyDynamicStats = 1;
			itemFour.level = levelNum;
			itemFour.quality = quality;
			
			var newItemOne = new Armor(itemOne),
				newItemTwo = new Armor(itemTwo),
				newItemThree = new Armor(itemThree),
				newItemFour = new Armor(itemFour);

			return {
				"tail_armor_01" : {
					"id"	: newItemOne.id,
					"armor" : newItemOne.armorValue(),
				},
				"fin_armor_01" : {
					"id"	: newItemTwo.id,
					"armor" : newItemTwo.armorValue(),
				},
				"body_armor_01" : {
					"id"	: newItemThree.id,
					"armor" : newItemThree.armorValue(),
				},
				"head_armor_01" : {
					"id"	: newItemFour.id,
					"armor" : newItemFour.armorValue(),
				},
			}
		}

		this.testVisionRange = function(){
			self.level().scanSquaresNearPlayer( 20 );
			self.level().drawMap();
		}

		this.testRaycast = function(radius){
			radius = radius || self.level().numSquares;
			self.level().rayCast(radius);
		}

		this.testAverages = function(targetI){
			targetI = targetI || 50;
			var i;
			var results = [];

			for(i=0; i < targetI; i++){
				results.push(Utils.calculateAveragesForLevel(i));
			}

			return results;
		}

		this.testMonster = function(){
			self.startCombat();
			var i;
			for(i=0; i < 100; i++){
				self.startCombat();
				console.log(game.currentEnemy().archetypeId);
			}
			//self.lootEnemy();
		}

		this.testGeneration = function(){
			self.level().generateThisLevel(true);
			self.level().scanSquaresNearPlayer( 10 );
			self.level().drawMap();
		}

		this.testPotions = function(){

			var potion_ids = self.itemDataCollection.getNode(["items", "consumables", "potions"], 1);
			var i;
			var itemToAdd;

			for(i = 0; i < potion_ids.length; i++){
				var potion_id = potion_ids[i];
				itemToAdd = self.itemDataCollection.getNode(["items", "consumables", "potions", potion_id]);
				itemToAdd.qty = 2;
				self.player().addItemToInventory( new Consumable(itemToAdd) );
			}

		}

		this.testWeapons = function(levelNum, quality, quantity){

			levelNum = levelNum || 1;
			quality = quality || "exceptional";
			quantity = quantity || 4;

			var i;
			for(i = 0; i < quantity; i++){

				var weaponId,
					itemToAdd,
					newItem;

				var availableWeapons = self.getAvailableItemIdsByTypeForLevel("weapon", self.level().levelNum());
				weaponId = Utils.chooseRandomly( availableWeapons );

				itemToAdd = self.getAvailableItemById(weaponId, "weapon", 1);

				itemToAdd.fullyDynamicStats = 1;
				itemToAdd.level = levelNum;
				itemToAdd.quality = quality;
				newItem = new Weapon(itemToAdd);

				self.player().addItemToInventory( newItem, 1 );
			}

		}

		this.testArmor = function(levelNum, quality, quantity){

			levelNum = levelNum || 1;
			quality = quality || "exceptional";
			quantity = quantity || 4;

			var i;
			for(i = 0; i < quantity; i++){

				var armorId,
					itemToAdd,
					newItem;

				var availableArmor = self.getAvailableItemIdsByTypeForLevel("armor", self.level().levelNum());
				var availableShields = self.getAvailableItemIdsByTypeForLevel("shield", self.level().levelNum());
				var availableItems = availableArmor.concat(availableShields);
				
				armorOrShieldId = Utils.chooseRandomly( availableItems );

				var isArmorOrShield = 'armor';
				itemToAdd = self.getAvailableItemById(armorOrShieldId, "armor", 1);

				if(itemToAdd === undefined){
					isArmorOrShield = 'shield';
					itemToAdd = self.getAvailableItemById(armorOrShieldId, "shield", 1);
				}

				itemToAdd.fullyDynamicStats = 1;
				itemToAdd.level = levelNum;
				itemToAdd.quality = quality;

				if( isArmorOrShield == 'armor' ){
					newItem = new Armor(itemToAdd);
				}else{
					newItem = new Shield(itemToAdd);
				}

				self.player().addItemToInventory( newItem, 1 );
			}

		}

		this.testEquipmentSetForLevel = function(level, quality, equip2H){
			level = level || 1;
			quality = quality || "good";
			equip2H = equip2H || 0;

			var	itemToAdd;
			var newItem;

			// --- Add weaps ---
			var weaponId;

			//1H
			weaponId = "melee_weapon_03";
			itemToAdd = self.getAvailableItemById(weaponId, "weapon", 1);

			itemToAdd.fullyDynamicStats = 1;
			itemToAdd.level = level;
			itemToAdd.quality = quality;
			newItem = new Weapon(itemToAdd);

			if(!equip2H){
				self._equipItem(newItem);
			}else{
				self.player().addItemToInventory( newItem, 1 );
			}

			//2H
			weaponId = "melee_weapon_04";
			itemToAdd = self.getAvailableItemById(weaponId, "weapon", 1);

			itemToAdd.fullyDynamicStats = 1;
			itemToAdd.level = level;
			itemToAdd.quality = quality;
			newItem = new Weapon(itemToAdd);

			if(equip2H){
				self._equipItem(newItem);
			}else{
				self.player().addItemToInventory( newItem, 1 );
			}
			
			// --- Add shield ---
			var shieldId = "shield_01";
			itemToAdd = self.getAvailableItemById(shieldId, "shield", 1);

			itemToAdd.fullyDynamicStats = 1;
			itemToAdd.level = level;
			itemToAdd.quality = quality;
			newItem = new Shield(itemToAdd);

			if(!equip2H){
				self._equipItem(newItem);
			}else{
				self.player().addItemToInventory( newItem, 1 );
			}

			// --- Add armor ---
			var armorIds = [
				"tail_armor_01",
				"body_armor_01",
				"head_armor_01",
			];
			if(level >= 5){
				armorIds.push("fin_armor_01");
			}

			var armorId;
			var i;
			for(i = 0; i < armorIds.length; i++){
				armorId = armorIds[i];

				itemToAdd = self.getAvailableItemById(armorId, "armor", 1);

				itemToAdd.fullyDynamicStats = 1;
				itemToAdd.level = level;
				itemToAdd.quality = quality;

				newItem = new Armor(itemToAdd);

				//self.player().addItemToInventory( newItem, 1 );
				self._equipItem(newItem);
			}
		}

		this.testGiveAndEquipShield = function(level, quality){
			level = level || 1;
			quality = quality || "good";

			var	itemToAdd;
			var newItem;
			
			// --- Add shield ---
			var shieldId = "shield_01";
			itemToAdd = self.getAvailableItemById(shieldId, "shield", 1);

			itemToAdd.fullyDynamicStats = 1;
			itemToAdd.level = level;
			itemToAdd.quality = quality;
			newItem = new Shield(itemToAdd);

			//This should fail if player already has a 2H weapon equipped
			if( self.player().shouldAutoEquip(newItem) ){
				self._equipItem(newItem);
			}else{
				self.player().addItemToInventory( newItem, 1 );
			}
		}

		this.testApplyEffectToPlayer = function(combat_effect_id){
			combat_effect_id = combat_effect_id || 'stun';
			combatEffectToApply = new CombatEffect(self.skillDataCollection.getNode(["combat_effects", combat_effect_id]));
			self.player().applyCombatEffect(combatEffectToApply);
		}

		this.testFood = function(){

			var newFoodItem = self.getRandomScroungable("poor");
			self.player().addItemToInventory( newFoodItem );
			newFoodItem = self.getRandomScroungable("good");
			self.player().addItemToInventory( newFoodItem );
			newFoodItem = self.getRandomScroungable("great");
			self.player().addItemToInventory( newFoodItem );
			newFoodItem = self.getRandomScroungable("exceptional");
			self.player().addItemToInventory( newFoodItem );

		}

		this.testResetLevel = function(){
			self._activateResetStone();
			self.testVisionRange();
		}

		this.testHideMap = function(){
			self.level().hideMap();
		}

		this.testLevelUp = function(logStats){
			self.player().level( self.player().level() + 1 );
			self.player().levelUp();
			self.showLevelUpModal();
			if(logStats){
				console.log('Level: ' + self.player().level());
				console.log('Max HP: ' + self.player().maxHp());
			}
		}

		this.testAddLevels = function(numLevels, logStats){
			if(logStats){
				console.log('Level: ' + self.player().level());
				console.log('Max HP: ' + self.player().maxHp());
			}
			numLevels = numLevels || 10;
			for(var i = 0; i < numLevels; i++){
				self.player().level( self.player().level() + 1 );
				self.player().levelUp();
				if(logStats){
					console.log('Level: ' + self.player().level());
					console.log('Max HP: ' + self.player().maxHp());
				}
			}
		}

		this.testPlayerStatsWithGearForLevel = function(level, gearQuality, showAverages) {
			gearQuality = gearQuality || "good";
			showAverages = showAverages || 0 ;
			var levelsToAdd = level - self.player().level();
			if(levelsToAdd > 0){
				self.testAddLevels(levelsToAdd);
			}
			self.testEquipmentSetForLevel(level, gearQuality);

			var armorWithShield = self.player().totalArmor();
			self.player().unEquipShield();
			var armorWithoutShield = self.player().totalArmor();
			console.log("HP: " + self.player().maxHp());
			console.log("AC: " + armorWithoutShield + " - " + armorWithShield);
			var avgArmor = Math.round((armorWithoutShield + armorWithShield) / 2);
			console.log("AC (AVG): " + avgArmor);
			console.log("DMG: " + self.player().minDmg() + ' - ' + self.player().maxDmg() + ( self.player().bonusDmg() > 0 ? ' (+' + self.player().bonusDmg() + ')' : '' ));
			var avgDmg = Math.round(( (self.player().minDmg() + self.player().maxDmg()) / 2 ) + self.player().bonusDmg());
			console.log("DMG (AVG): " + avgDmg);

			var averages = Utils.calculateAveragesForLevel(level);

			var actualDmgPerMonsterHit = Utils.calculateDmgForArmorAndLevel(Math.round(averages.avgMonsterDmg * 1), avgArmor, level);

			averages.actualDmgPerMonsterHit = actualDmgPerMonsterHit;

			if(showAverages){
				console.log( averages );
			}
		}

		this.testAddAccessory = function(level, quality, accessoryStat, accessoryStatAmt){
			level = level || 1;
			quality = quality || "good";

			var	itemToAdd;
			var newItem;

			var accId;

			/*
			"Speed",
			"Armor",
			"Strength",
			"Dexterity",
			"Endurance",
			"Health"
			*/

			accId = "acc_01";
			itemToAdd = self.getAvailableItemById(accId, "accessory", 1);

			itemToAdd.fullyDynamicStats = 1;
			itemToAdd.level = level;
			itemToAdd.quality = quality;
			itemToAdd.accessoryStat = accessoryStat;
			itemToAdd.accessoryStatAmt = accessoryStatAmt;
			newItem = new Accessory(itemToAdd);

			self.player().addItemToInventory( newItem, 1 );
		}

		this.testPerkPoints = function(numPoints){
			numPoints = numPoints || 1;
			self.player().availablePerkPoints(numPoints);
		}

		this.testMerchantSquare = function(levelNum, numItems){
			self.currentContainer.removeAll();

			var itemArray = Array();

			var numItems = numItems || Utils.doRand(3,8);

			for(var i = 0; i < numItems; i++){
				self.currentContainer.addItem(self.generateRandomLootItem("trader", undefined, undefined, levelNum));
			}

			self.manageTransitionToView("fullscreen","merchant");
		}

		this.testCooldownSquare = function(levelNum, numItems){
			
			var currentOverride = self.eventSquareTypeOverride();
			self.eventSquareTypeOverride("cooldown");
			self.squareEventAction();
			self.eventSquareTypeOverride(currentOverride);
		}

		this.testTrainSkillSquare = function(levelNum, numItems){
			var currentOverride = self.eventSquareTypeOverride();
			self.eventSquareTypeOverride("trainer");
			self.squareEventAction();
			self.eventSquareTypeOverride(currentOverride);
		}

		this.testSquareItemAction = function(){
			self.squareItemAction();
		}

		self.init();

	};

	Game.prototype.constructor = Game;

	ko.bindingHandlers.animateNumbers = {
		init: function(element, valueAccessor){
			//Don't do anything on init, I think
			$(element).val(valueAccessor());
		},
		update: function(element, valueAccessor){
			$(element).stop(false, true).animateNumbers(valueAccessor(), false, 300);
		}
	}

	ko.bindingHandlers.animateWidth = {
		init: function(element, valueAccessor){
			$(element).width(valueAccessor());
		},
		update: function(element, valueAccessor){
			$(element).stop(false, true).animate({ width: valueAccessor() }, 500);
		}
	}

	return Game;

/*

PROBLEMS NEEDING SOLUTIONS:
- When player moves into a level entrance square, they are automatically dumped back
	into the prev. level, but with the new maze structure sometimes it's not possible
	to avoid those squares so they basically have to do a little tango into the prev.
	level and back to get to the other side of the square. Some ideas are: only activate
	level transitions when the player hits "Enter" while standing on the entrance/exit squares
	(but that won't work for mobile devices -- maybe a double-click/tap?); Or have a dialog pop
	up each time the player enters a transition square asking if they want to enter/exit or keep
	going (but this still adds an extra step/disruption in player movement, although not as much
	of one as if they have to go to the previous level, hop off, hop on, back to the current level,
	so that would still be a slight improvement)


BUGS:
- Reset skill appears on the list of levelable abilities
- When a skill's level is improved as a result of player leveling, it says the skill proficiency has improved to 0
- logsave gives error
- Log displays extra, inaccurate messages when player loots item square + inventory is full
- Sometimes scan does not reveal squares that I think should be revealed near the player
- Sometimes stun does not apply (cannot reliably recreate! possibly a conditional breakpoint...?)
- After changing level preferences, game.level().generateThisLevel(1,1) doesn't read changes until reload?

GAME CHANGES:
- Might be a little too intense on lvl 2 still (adjusted, let's see how it goes...)

UI CHANGES:


CODE CHANGES:


GAME IDEAS:
- Shell cracker doesn't seem that useful when speed is too low
- Replace overworld cooldown system with a finite resource system
- Add quests
- Add some tutorial-type stuff in the intro slides
- Speed necklaces might be OP
- Flurry might be OP
- Bosses still might hit too hard
- Allow item usage from merchant screen
- When necklace is equipped, increase current HP by appropriate amount, MAYBE (ask Matt)
- Ask Matt about "bonus" dmg
- Ask Matt about limiting back-and-forth spamming to run down the clock
- Add a "reveal unvisited squares" button when most of level visited?
- Add in "skip to exit square" button, maybe costs 25% GP (maybe not), possibly unlocks after player is >1 level higher than current dungeon level
- Add in gem merchants that accept gems as currency (ask Matt)
- Make skill trainers cost less, OR improve base skill rather than progress
- Add intermittent passives?
- Should combat abilities level up + improve on use, same as active abilities?
- Gambling squares! X gold for Y nice thing, Z chance of success
- Battle arena event?
- Bosses every x levels + minibosses in between

UI IDEAS:
- Make unrevealed squares more obvious
- Change color of exit squares (and maybe entrance squares, accordingly)
- Make log filterable
- Make inventory sortable
- Color code log
- Make sure skills that cannot be leveled up are properly represented in list
- Dynamic container name
- Allow equip from loot container -- maybe (or make it more obvious that inventory can be temporarily overloaded)
- Allow for a variable number of items to be purchased from merchant
- Play sound on level up?
- Minor sound FX on square events
- Add help/feedback interface
- Keyboard shortcuts for "continue" buttons

CODE IDEAS:
- Not really happy with the way _setAsActiveItem is structured; the whole moveDirection concept could probably be redone
- Don't save and rehydrate functions
- Improve the skill training stuff somehow so it doesn't always break whenever a new skill is added
- Fix testAddLevel function so it properly increases skill progress
- Put a cap on leveling
- Conditionally force CSS clearing
- Remove or comment-out now-deprecated reset stone references
- Save game version in localstorage; When loading, if version is different from current version, reload JSON files + classes from src
- Prevent enemy HP from going below 0 (maybe)
- Make Gold a "stat" rather than an inventory item?
- Maybe only redraw relevant sections of the map? i.e. - player vision/scan radius - write test to see if it's actually faster
- Write combat simulator for testing balancing stuff

GOOD IDEAS WITHOUT KNOWN IMPLEMENTATIONS:
- Making the turn-based nature of combat more visually apparent (i.e. - you go, then they go, etc.),
	but it might be a good idea to make this toggle-able via setting, because it might prevent the
	player from just attacking as fast as they like (i.e. - attack button spam if they're in a hurry)

POSSIBLE IDEAS/FEEDBACK:
- Some sort of "penalty" to prevent players from just running down the clock by going back and forth between squares
- Always have exit square visible? (to always give player a general guide as to direction)
- Make food quality independent of name (e.g. - you can have poor quality scampi or medium or whatever) (discuss with Matt)
- Balance item value + dmg/armor + num salvage (discuss with Matt)
- Think about floor as a whole instead of just fight-to-fight

Perk Ideas
- Allow 1H weapons to be wielded 2H (costs 2)
- Dual-wielding 1H weapons (costs 2)
- Reduced cooldown on scan
- Reduced cooldown on find food + treasure
- Better odds of winning gambling squares
- Passive HP regen
- More contribution from armor
- Improve min weapon dmg when crafting instead of just max (change so it's just max by default)
- Sword 'n' Board (don't know what it does yet, but we need to have one called this!)

Feedback

Too easy. Contributing factors:
- Monster strength is calculated based on an unarmored/unequipped player (I think)
- Monster strength goes by dungeon level, regardless of what level the player is
- Players get a lot of HP on level-up -- too much?
- Monsters might reward too much XP?
- Players spend too much time on level (always show exit square?)
- Definitely add a difficulty selector
- Control first set of loot drops so player gets a set of gear
More text variance

LINKS FOR RESEARCH:
http://jsfiddle.net/tPm3s/1/ (http://stackoverflow.com/questions/23530756/maze-recursive-division-algorithm-design)
http://weblog.jamisbuck.org/2011/1/12/maze-generation-recursive-division-algorithm
http://weblog.jamisbuck.org/2015/1/15/better-recursive-division-algorithm.html

http://weblog.jamisbuck.org/2011/2/7/maze-generation-algorithm-recap
http://dstromberg.com/2013/07/tutorial-random-maze-generation-algorithm-in-javascript/

https://github.com/felipecsl/random-maze-generator
http://stackoverflow.com/questions/16150255/javascript-maze-generator
http://xefer.com//maze-generator

*/

});
