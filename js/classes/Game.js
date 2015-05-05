define([
	'jquery',
	'knockout',
	'classes/Player',
	'classes/Level',
	'classes/Item',
	'classes/Weapon',

	'Utils',
], function($, ko, Player, Level, Item, Weapon){

	var Game = function() {

		var self = this;

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
				self.lastActionMessage("You scan your surroundings using your fish-powers!");
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
					message = "You try to delicately float to the bottom of the riverbed, but you miscalculate the strength of your mighty fins and crash down on some fish biscuits, destroying them completely.";
					self.tempFoodFindBonus += 2;
				});
				
				self.lastActionMessage(message);
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
			self.lastActionMessage = ko.observable("");
			self.visibleSection = ko.observable("content-area");
			self.currentDescItem = ko.observable({
				id : ko.observable(""),
				desc : ko.observable(""),
				canEquip : ko.observable(0),
				canUnEquip : ko.observable(0),
				canUse : ko.observable(0),
				canDrop : ko.observable(0),
			});

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
				desc : "Fish Biscuits are small, compacted squares of delicious berries, bugs, bacon, and high fructose corn syrup. \"Fish Biscuits: They're what fish crave!\"<br />Cook thoroughly. Do not consume while pregnant.",
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
			var newPos = self.level().movePlayer(direction, 1);

			self.lastActionMessage("");
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
				$("#content-area").fadeIn(300);
			});
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

		this.handleSquareAction = function(square){
			var type = square.type;

			if(type == "combat"){

			}else if(type == "item"){
				
				var itemClass = "item";
				
				var itemToAdd = {};

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
					
					//60% of getting 80-120, 30% of getting 160 - 240, 9% of getting 320 - 480, 1% of getting 1000
					var goldSize = doBasedOnPercent({
						1 : "hoard",
						9 : "large",
						30 : "medium",
						60 : "small"
					});
					
					var goldAmt = 0;
					
					if( goldSize == "small" ){
						goldAmt = rand(80, 121);
					}else if( goldSize == "medium" ){
						goldAmt = rand(160, 241);
					}else if( goldSize == "large" ){
						goldAmt = rand(320, 481);
					}else if( goldSize == "hoard" ){
						goldAmt = 1000;
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
						
						itemToAdd.qty = rand(1,26);
						
					}else if( miscType == "weapon" ){
						
						itemToAdd.id = "weapon_scraps";
						itemToAdd.name = "Weapon Scraps";
						itemToAdd.type = "crafting";
						itemToAdd.slotsRequired = 1;
						itemToAdd.stackable = 1;
						itemToAdd.desc = "Scraps of leather, iron, steel. Formerly part of someone's weapon. Maybe you could use it to make your own weapons better...";
						
						itemToAdd.qty = rand(1,26);
						
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
				
				self.lastActionMessage("Inside " + container + " you find " + newItem.qty() + " " + newItem.name);
				
				self.player().addItemToInventory(newItem);

			}else if(type == "event"){
				
				//30% trader
				//40% skill increase
				//10% stat increase
				//20% cooldowns reset
				
			}else if(type == "exit"){

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

					$(this).fadeIn(400);
				});
				
				
			}else if(type == "entrance"){

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

					$(this).fadeIn(400);
				});
				
			}else{
				//Do nothing
			}
		}
		
		this._resetActiveDescItem = function(){

			self.currentDescItem().desc("");
			self.currentDescItem().id("");
			self.currentDescItem().canUse(0);
			self.currentDescItem().canEquip(0);
			self.currentDescItem().canDrop(0);
			self.currentDescItem().canUnEquip(0);
			
		}

		this.setAsActiveDescItem = function(item, event){
			
			//Reset stuff first
			self._resetActiveDescItem();

			self.currentDescItem().id(item.id);
			self.currentDescItem().desc(item.desc);
			
			var type = item.type;
			if( type == "consumables" ){
				self.currentDescItem().canUse(1);
			}else if ( type == "armor" || type == "weapon" ){
				self.currentDescItem().canEquip(1);				
			}
			
			if( type != "currency" ){
				self.currentDescItem().canDrop(1);				
			}

			//self.currentDescItem().canUnEquip(1);


		}
		
		this.equipDescItem = function(item, event){
			
		}
		
		this.unEquipDescItem = function(item, event){
			
		}
		
		this.useDescItem = function(item, event){
			
		}
		
		this.dropDescItem = function(item, event){
			var itemId = self.currentDescItem().id();
			
			var numLeft = self.player().removeItemFromInventory(itemId, 1);
			if( numLeft == 0 ){
				self._resetActiveDescItem();
			}
		}
		
		this.dropAllDescItem = function(item, event){
			var itemId = self.currentDescItem().id();
			
			self.player().removeItemFromInventory(itemId);
			self._resetActiveDescItem();
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

		self.init();

	};

	return Game;

});
