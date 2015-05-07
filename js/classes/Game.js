define([
	'jquery',
	'knockout',
	'classes/Player',
	'classes/Level',
	'classes/Item',
	'classes/Weapon',
	'classes/ItemCollection',
	'json!data/items.json',

	'Utils',
], function($, ko, Player, Level, Item, Weapon, ItemCollection, itemDataFile) {

	var Game = function() {

		var self = this;

		this.itemDataFile = itemDataFile;

		this.player = undefined;
		this.states = {
			start: {
				beforeText: "<p>You are in an egg, nestled in a layer of rocks at the bottom of a creek bed. It is a comfortable 16 degrees Celsius. You've been in here for a week already. You are bored.</p>",
				buttons: [
					{
						text: "Let's bust outta here!",
						action: function(){ self.setState("d1"); }
					},
				],
				location: "Unknown",
				hidePlayerData: true,
				hideMap: ko.observable(true),
				hidePlayerStats: ko.observable(true),
			},
			d1: {
				beforeText: "<p>With a loud crack, you emerge from your egg like the Kool-Aid man through a brick wall.</p>",
				buttons: [
					{
						text: "OH YEAH!!!",
						action: function(){ self.setState("d2"); }
					},
				],
				location: "Unknown",
				hidePlayerData: true,
				hideMap: ko.observable(true),
				hidePlayerStats: ko.observable(true),
			},
			d2: {
				beforeText: "<p>You feel cool water rush past your face like a refreshing breeze.</p>",
				buttons: [
					{
						text: "Continue",
						action: function(){ self.setState("idle"); }
					},
				],
				location: "Unknown",
				hidePlayerData: true,
				hideMap: ko.observable(true),
				hidePlayerStats: ko.observable(true),
			},
			idle: {
				beforeChange: function(){

				},
				afterRender : function(){
					self.level().drawMap();
				},
				beforeText: "<p>You decide to...</p>",
				buttons: ko.observableArray([
					{
						text: function(){
							var text = "Scrounge for food";
							if(self.player().data().skillCooldowns().findFood()){
								text += " (" + self.player().data().skillCooldowns().findFood() + ")";
							}
							return text;
						},
						action: function(){
							self.playerActions.findFood();
						},
						css: function(){
							return {
								disabled : self.player().data().skillCooldowns().findFood() > 0
							}
						},
					},
					{
						text: function(){
							var text = "Scan surroundings";
							if(self.player().data().skillCooldowns().scanSquares()){
								text += " (" + self.player().data().skillCooldowns().scanSquares() + ")";
							}
							return text;
						},
						action: function(){
							self.playerActions.scanSquares();
						},
						css: function(){
							return {
								disabled : self.player().data().skillCooldowns().scanSquares() > 0
							}
						},
					},
					{
						text: function(){
							var text = "Check Inventory";
							text += " (" + self.player().data().inventorySlotsOccupied() + "/" + self.player().data().inventoryMaxSlots() + ")";
							return text;
						},
						action: function(){
							self.toggleInventory();
						},
					},
				]),
				location: "Midstream",
			},
		};

		this.tempFoodFindBonus = 0;
		this.defaultCooldown = 10;
		this.playerActions = {
			scanSquares: function(){
				self.player().data().skillCooldowns().scanSquares(self.defaultCooldown);
				self.level().scanSquaresNearPlayer( self.player().data().skills().scanSquares() );
				self.level().drawMap();
				self.player().data().skillProgress().scanSquares( self.player().data().skillProgress().scanSquares() + 1 );
				self.logMessage("By holding very still and concentrating, you are able to thoroughly survey your surroundings.");
			},
			findFood: function(){

				self.player().data().skillCooldowns().findFood(self.defaultCooldown);
				self.player().data().skillProgress().findFood( self.player().data().skillProgress().findFood() + 1 );
				var message = "";

				var percentages = {};
				var findPercent = self.player().data().skills().findFood() + self.tempFoodFindBonus;
				percentages[findPercent] = function(){
					self.addFoodToPlayerInventory();
					message = "You gracefully float to the bottom of the river and successfully scrounge up some fish biscuits using your kick-ass mouth feelers.";
					self.tempFoodFindBonus = 0;
				};
				doBasedOnPercent(percentages,
				function(rand){
					//console.log("rand: " + rand + " ; temp bonus: " + self.tempFoodFindBonus + " ; findPercent: " + findPercent);
					message = "You attempt to smoothly swim to the bottom of the riverbed, but you miscalculate the strength of your mighty fins and crash down on some fish biscuits, destroying them completely.";
					self.tempFoodFindBonus += 2;
				});

				self.logMessage(message);
			}
		};

		this.init = function(){
			self.initObservables();
			self.initGame();
		}

		this.initObservables = function(){

			self.showLoading = ko.observable(false);
			self.stateID = ko.observable();
			self.state = ko.observable(undefined);
			self.player = ko.observable();
			self.showPlayerData = ko.observable(false);
			self.location = ko.observable();
			self.levels = ko.observableArray(Array());
			self.logMessages = ko.observableArray();
			self.visibleSection = ko.observable("content-area");
			self.activeItem = ko.observable({
				id : ko.observable(""),
				desc : ko.observable(""),
				canEquip : ko.observable(0),
				canUnEquip : ko.observable(0),
				canUse : ko.observable(0),
				canDrop : ko.observable(0),
				moveDirection : ko.observable("right"),
			});
			self.arrowKeysControlPlayerPos = ko.observable(true);
			self.showInventoryEquipment = ko.observable(true);
			self.showContainerScreen = ko.observable(false);
			self.freezeMovement = ko.observable(false);
			self.currentContainer = new ItemCollection(Array());

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
		}

		this.initGame = function(gameData){

			var level;
			var player;
			var stateID;

			if(gameData != undefined){

				var levelArray = Array();
				for(i = 0; i < gameData.levels.length; i++){
					levelArray.push( new Level(gameData.levels[i]) );
				}
				self.levels(levelArray);
				player = new Player(gameData.player);
				stateID = gameData.stateID;
				self.visibleSection(gameData.visibleSection);
			}else{
				player = new Player();
				level = new Level({ genOpts : { quadsWithPotentialEntrances : [] }, isActive : true });
				stateID = "idle";
				self.levels.push(level);
				//stateID = "idle";
			}

			$.each(["content-area","inventory-equipment","event-area"], function(idx, elem){
				if(elem != self.visibleSection()){
					$("#" + elem).hide();
				}else{
					$("#" + elem).show();
				}
			});

			var newLevel = self.level().generateNextLevel();

			if( newLevel ){
				self.levels.push(newLevel);
			}

			self.player(player);
			self.stateID(stateID);
			self.setState(stateID);

			self.level().revealSquaresNearPlayer(player.data().skills().visionRange());
			self.level().drawMap();
		}

		this.addFoodToPlayerInventory = function(){
			var qty = self.player().data().skills().findFood();
			var food = new Item({
				id : 'biscuit_food',
				name : "Fish Biscuits",
				type : "consumables",
				desc : "Restores all HP when consumed. Fish Biscuits are small, compact wafers made of delicious wild berries, soy protein, bacon fat, and high fructose corn syrup. \"Fish Biscuits: They're what fish crave!\"<br />Cook thoroughly before eating. Do not consume while pregnant. Consult your doctor before use. Fish Biscuits cannot be used as a tourniquet.",
				qty : qty,
			});
			self.player().addItemToInventory(food);
		}

		this.loadFromData = function(gameData){
			if(gameData == undefined){
				return false;
			}

			self.initGame(gameData);
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
					self.updateCooldowns();
					self.player().data().skillProgress().speed( self.player().data().skillProgress().speed() + 1 );

					self.level().revealSquaresNearPlayer(self.player().data().skills().visionRange());
					self.level().drawMap();

					var square = self.level().getSquare(newPos.x, newPos.y);

					if(square.notEmpty && square.isDone == false){

						self.handleSquareAction(square);

						if(square.type != "exit" && square.type != "entrance"){
							square.setDone(true);
						}
					}

					self.level().drawMap();

				}

			}

		}

		this.updateCooldowns = function(){
			$.each(self.player().data().skillCooldowns(), function(skill, cooldown){
				var cooldownValue = cooldown();
				if(cooldownValue > 0){
					cooldown(cooldownValue - 1);
				}
			});
		}

		this.toggleInventory = function(){
			//game.player().itemTest();
			self.visibleSection("inventory-equipment");
			$("#content-area").fadeOut(300, function(){
				$("#inventory-equipment").fadeIn(300);
			});
		}

		this.showContentArea = function(){
			self.visibleSection("content-area");
			$("#event-area").fadeOut(300);
			$("#inventory-equipment").fadeOut(300, function(){
				self.currentContainer.removeAll();
				$("#content-area").fadeIn(300);
			});
			self._resetActiveItem();
		}

		this.hideModal = function(viewModel, event){
			self.modalIsShown = false;
			$('#myModal').modal('hide');
			$('#myModal .modal-content').hide();
		}

		this.setState = function(stateID, extraCallback){

			self.stateID(stateID);

			var no_slide =
			{
				text: "<p>This part doesn't exist yet, dummy!</p>",
				buttons: [
					{
						text: "Sorry!",
						action: function(){ console.log("All is forgiven"); }
					},
				]
			};

			var state = no_slide;

			if(self.states.hasOwnProperty(stateID)){
				state = self.states[stateID];
			}

			$("#content-area").fadeOut(600, function(){

				if(state.beforeChange && typeof state.beforeChange === 'function'){
					state.beforeChange();
				}

				self.state(state);

				if(state.afterChange && typeof state.afterChange === 'function'){
					state.afterChange();
				}

				$(this).fadeIn(400, function(){

					if(state.afterRender && typeof state.afterRender === 'function'){
						state.afterRender();
					}

					if(extraCallback && typeof extraCallback === 'function'){
						extraCallback();
					}

				});
			});
		}

		this.showContainerWithContents = function(itemArray){
			
			itemArray == itemArray || [];

			self.currentContainer(itemArray);
			self.showEquipmentOrContainer("container");

			self.toggleInventory();
		}

		this.squareItemAction = function(){

			var itemClass = "item";

			var itemToAdd = {};

			var canAdd = true;

			var possibleItemTypes = {
				50 : "gold",
				40 : "misc",
				10 : "gear",
			};

			var itemType = doBasedOnPercent(possibleItemTypes);

			if(itemType == "gold"){

				itemToAdd.id = "gold";
				itemToAdd.name = "Gold Pieces (GP)";
				itemToAdd.type = "currency";
				itemToAdd.slotsRequired = 0;
				itemToAdd.stackable = 1;
				itemToAdd.desc = "Shiny gold pieces, worth a pretty penny. Actually, worth several thousand pretty pennies. Don't spend it all in one place.";

				//60% of getting 80-120, 30% of getting 160 - 240, 9% of getting 320 - 480, 1% of getting 2000
				var goldSize = doBasedOnPercent({
					1 : "hoard",
					9 : "large",
					30 : "medium",
					60 : "small"
				});

				var goldAmt = 0;

				if( goldSize == "small" ){
					goldAmt = doRand(80, 121);
				}else if( goldSize == "medium" ){
					goldAmt = doRand(160, 241);
				}else if( goldSize == "large" ){
					goldAmt = doRand(320, 481);
				}else if( goldSize == "hoard" ){
					goldAmt = 2000;
				}

				itemToAdd.qty = goldAmt;

			}else if(itemType == "misc"){

				//41% armor scraps, 39% weapon scraps, 20% stone of reset
				var miscType = doBasedOnPercent({
					20 : "stone",
					39 : "weapon",
					41 : "armor",
				});

				if( miscType == "armor" ){

					itemToAdd.id = "armor_scraps";
					itemToAdd.name = "Armor Scraps";
					itemToAdd.type = "crafting";
					itemToAdd.slotsRequired = 1;
					itemToAdd.stackable = 1;
					itemToAdd.desc = "Scraps of leather, iron, scales, or cloth. Formerly part of someone's adventuring gear. Maybe you could use it to reinforce your own armor somehow...";

					itemToAdd.qty = doRand(1,26);

				}else if( miscType == "weapon" ){

					itemToAdd.id = "weapon_scraps";
					itemToAdd.name = "Weapon Scraps";
					itemToAdd.type = "crafting";
					itemToAdd.slotsRequired = 1;
					itemToAdd.stackable = 1;
					itemToAdd.desc = "Scraps of leather, iron, steel. Formerly part of someone's weapon. Maybe you could use it to make your own weapons better...";

					itemToAdd.qty = doRand(1,26);

				}else if( miscType == "stone" ){

					itemToAdd.id = "reset_stone";
					itemToAdd.name = "Reset Stone";
					itemToAdd.type = "consumables";
					itemToAdd.slotsRequired = 1;
					itemToAdd.stackable = 1;
					itemToAdd.desc = "A stone imbued with magical energies. It has the power to regenerate the current dungeon level, letting you experience a brand new set of events, search for new treasures, and fight new monsters.";
					itemToAdd.qty = 1;

				}

			}else if(itemType == "gear"){

				var gearType = doBasedOnPercent({
					51 : "armor",
					49 : "weapon"
				});

				//Eventually these will be randomized, but let's keep it simple for now...
				if( gearType == "armor" ){

					itemToAdd.id = "body_armor_01";
					itemToAdd.name = "Leather Armor";
					itemToAdd.type = "armor";
					itemToAdd.slotsRequired = 1;
					itemToAdd.stackable = 0;
					itemToAdd.desc = "A set of leather armor. Gives +3 Armor when worn. Gives 0 Armor when it's just sitting in your bag.";
					itemToAdd.qty = 1;

				}else if( gearType == "weapon" ){

					itemClass = "weapon";

					itemToAdd.id = "melee_weapon_01";
					itemToAdd.name = "Razor-sharp Dagger";
					itemToAdd.type = "weapon";
					itemToAdd.slotsRequired = 1;
					itemToAdd.stackable = 0;
					itemToAdd.desc = "A shiny dagger. You could fillet someone with this. +3 DMG when equipped.";
					itemToAdd.qty = 1;

				}

			}

			var newItem;

			if(itemClass == "item"){
				newItem = new Item(itemToAdd);
			}else if(itemClass == "weapon"){
				newItem = new Weapon(itemToAdd);
			}

			var container = doBasedOnPercent({
				25 : "a crate sealed tightly with tar",
				24 : "an upturned canoe concealing a pocket of air",
				28 : "a waterproof oilskin bag",
				23 : "a crevice between two large rocks",
			});

			var itemQtyInInventory = self.player().addItemToInventory(newItem);

			if(itemQtyInInventory != false && itemQtyInInventory > 0){

				if(newItem.id == "gold"){
					self.player().data().gp(itemQtyInInventory);
				}

				self.logMessage("Inside " + container + " you find " + newItem.qty() + " " + newItem.name, "item");
			}else{

				self.logMessage("Inside " + container + " you find " + newItem.qty() + " " + newItem.name + ", but your inventory is currently full", "item");
				self.showContainerWithContents([newItem]);

			}
		}

		this.squareCombatAction = function(){
			console.log("trigger a combat action");
		}

		this.squareEventAction = function(){
			//30% trader
			//40% skill increase
			//10% stat increase
			//20% cooldowns reset
			console.log("trigger an event action");
		}

		this.squareExitAction = function(){

			self.freezeMovement(true);

			if(self.level().nextLevelID() == undefined){

				var newLevel = self.level().generateNextLevel();

				if( newLevel ){
					self.levels.push(newLevel);
				}

			}

			var nextLevel = self.getLevelById( self.level().nextLevelID() );
			var currentLevel = self.level();

			$(".map-inner-container").fadeOut(400, function(){
				nextLevel.isActive(true);
				currentLevel.isActive(false);
				nextLevel.setPlayerPos( nextLevel.entranceSquare()[0], nextLevel.entranceSquare()[1] );
				nextLevel.revealSquaresNearPlayer(self.player().data().skills().visionRange());
				nextLevel.drawMap();

				$(this).fadeIn(400, function(){
					self.freezeMovement(false);
				});
			});

		}

		this.squareEntranceAction = function(){
			
			self.freezeMovement(true);

			//This is unlikely, but we'd better account for it just to be safe
			if(self.level().prevLevelID() == undefined){

				var newLevel = self.level().generatePrevLevel();

				if( newLevel ){
					self.levels.push(newLevel);
				}

			}

			var prevLevel = self.getLevelById( self.level().prevLevelID() );
			var currentLevel = self.level();

			$(".map-inner-container").fadeOut(400, function(){
				prevLevel.isActive(true);
				currentLevel.isActive(false);
				prevLevel.setPlayerPos( prevLevel.exitSquare()[0], prevLevel.exitSquare()[1] );
				prevLevel.revealSquaresNearPlayer(self.player().data().skills().visionRange());
				prevLevel.drawMap();

				$(this).fadeIn(400, function(){
					self.freezeMovement(false);
				});
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

				self.squareExitAction();

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
			self.activeItem().canDrop(0);
			self.activeItem().canUnEquip(0);
			self.activeItem().moveDirection("right");

		}

		this.setContainerItemAsActiveItem = function(item, e){
			self._setAsActiveItem("left", item, e);
		}

		this.setInventoryItemAsActiveItem = function(item, e){
			self._setAsActiveItem("right", item, e);
		}

		this._setAsActiveItem = function(moveDirection, item, e){

			//Reset stuff first
			self._resetActiveItem();

			self.activeItem().id(item.id);
			self.activeItem().desc(item.desc);

			var type = item.type;
			if( type == "consumables" ){
				self.activeItem().canUse(1);
			}else if ( type == "armor" || type == "weapon" ){
				self.activeItem().canEquip(1);
			}

			if( type != "currency" ){
				self.activeItem().canDrop(1);
			}

			self.activeItem().moveDirection(moveDirection);

			//self.activeItem().canUnEquip(1);


		}

		this.equipActiveItem = function(item, event){

		}

		this.unEquipActiveItem = function(item, event){

		}

		this.useActiveItem = function(item, event){

		}

		this._dropActiveItem = function(item, event, qty){

			var itemToMoveId = self.activeItem().id(),
				existingItem = undefined,
				newItem = undefined,
				moveFrom = "inventory",
				moveTo = false,
				srcCollection = undefined,
				tarCollection = undefined;

			//Do we have an active container?
			if(self.showContainerScreen()){

				srcCollection = self.player().data().inventory;

				//Are we moving from inventory -> container OR container -> inventory?
				if(self.activeItem().moveDirection() == "right"){
					
					moveTo = "container";

					tarCollection = self.currentContainer;

				}else{

					moveFrom = "container";
					moveTo = "inventory";

					srcCollection = self.currentContainer;
					tarCollection = self.player().data().inventory;
				}
			}

			//Get the existing item we want to "move"
			existingItem = srcCollection.getItemByID(itemToMoveId);
			//Clone it so we're not writing to the same object from two different places
			newItem = existingItem.clone();
			//Set the right qty on the object we want to add
			if(qty == undefined || qty == "all"){
				newItem.qty(existingItem.qty());
			}else{
				newItem.qty(qty);
			}
			

			//Remove the object from the source
			var srcNumLeft = srcCollection.removeItem(existingItem, qty);

			if(moveFrom == "container" && moveTo == "inventory"){

				if(srcNumLeft == 0){
					self._resetActiveItem();
				}

				//Add to inventory
				tarCollection.addItem(newItem, undefined, function(){
					self.player().data().inventorySlotsOccupied( self.player().data().inventorySlotsOccupied() + newItem.slotsRequired );
				});

			}else if ( moveFrom == "inventory" ){

				if(srcNumLeft == 0){
					self.player().data().inventorySlotsOccupied( self.player().data().inventorySlotsOccupied() - newItem.slotsRequired );
					self._resetActiveItem();
				}

				if(moveTo){
					//Add to container
					tarCollection.addItem(newItem);
				}
			}

		}

		this.dropActiveItem = function(item, event){

			self._dropActiveItem(item, event, 1);

		}

		this.dropAllActiveItem = function(item, event){
			
			self._dropActiveItem(item, event, "all");

		}

		this.showEquipmentOrContainer = function(toShow){
			if( toShow == "equipment" ){
				self.showContainerScreen(false);
				self.showInventoryEquipment(true);
			}else if (toShow == "container"){
				self.showInventoryEquipment(false);
				self.showContainerScreen(true);
			}
		}

		this.logMessage = function(msgText, cssClass){
			self.logMessages.unshift( {text: msgText, cssClass: cssClass || "info"} );
		}

		this.getLevelById = function(id){
			for(i = 0; i < self.levels().length; i++){
				if( id == self.levels()[i].levelID() ){
					return self.levels()[i];
				}
			}
			return false;
		}

		this.importData = function(){
			$('#importSavedGame').click();
		}

		this.exportData = function(){

			var exportData = self.getExportData();
			var blob = new Blob([exportData], {type: "text/json;charset=utf-8"});
			saveAs(blob, "export.json");

		}

		this.processFile = function(e){
			var file = e.target.files[0];

			if(file){

				var reader = new FileReader();
				reader.onload = function(e){
					var saveData = $.parseJSON(e.target.result);
					self.loadFromData(saveData);
				}
				reader.onerror = function(){
					console.log(arguments);
				}

				reader.readAsText(file);
			}
		}

		this.getExportData = function(){
			var exportObj = {
				player : self.player().getExportData(),
				stateID : self.stateID(),
				levels : Array(),
			}

			for(i=0; i < self.levels().length; i++){
				var thisLevel = self.levels()[i];

				exportObj.levels.push(thisLevel.getExportData());
			}

			return JSON.stringify(exportObj);
		}

		this.itemTest = function(){

			var food = new Item({
				id : 'biscuit_food',
				name : "Fish Biscuits",
				type : "food",
				desc : "Fish Biscuits are small, compacted squares of delicious berries, bugs, bacon, and high fructose corn syrup. \"Fish Biscuits: They're what fish crave!\"",
				qty : 1,
			});

			self.player().addItemToInventory(food);

			var moreFood = new Item({
				id : 'biscuit_food',
				name : "Fish Biscuits",
				type : "food",
				qty : 3,
			});

			self.player().addItemToInventory(moreFood);

			var someItem = new Item({
				id : 'rock',
				name : "Rocks",
				type : "misc",
				qty : 1,
			});

			self.player().addItemToInventory(someItem);

			var someOtherItem = new Item({
				id : 'dirt',
				name : "Dirt",
				type : "misc",
				qty : 4,
			});

			self.player().addItemToInventory(someOtherItem);

			var itemOne = {},
				itemTwo = {};
			itemOne.id = "armor_scraps";
			itemOne.name = "Armor Scraps";
			itemOne.type = "crafting";
			itemOne.slotsRequired = 1;
			itemOne.stackable = 1;
			itemOne.desc = "Scraps of leather, iron, scales, or cloth. Formerly part of someone's adventuring gear. Maybe you could use it to reinforce your own armor somehow...";
			itemOne.qty = doRand(1,26);

			itemTwo.id = "body_armor_01";
			itemTwo.name = "Leather Armor";
			itemTwo.type = "armor";
			itemTwo.slotsRequired = 1;
			itemTwo.stackable = 0;
			itemTwo.desc = "A set of leather armor. Gives +3 Armor when worn. Gives 0 Armor when it's just sitting in your bag.";
			itemTwo.qty = 1;

			self.showContainerWithContents([new Item(itemOne), new Item(itemTwo)]);
		}

		self.init();

	};

	return Game;

});
