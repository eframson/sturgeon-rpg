define([
	'jquery',
	'knockout',
	'classes/Player',
	'classes/Level',
	'classes/Item',
	'classes/Weapon',
	'classes/Armor',
	'classes/ItemCollection',
	'classes/Monster',
	'json!data/items.json',
	'json!data/monsters.json',

	'Utils',
], function($, ko, Player, Level, Item, Weapon, Armor, ItemCollection, Monster, itemDataFile, monsterDataFile) {

	function Game() {

		var self = this;

		this.itemDataFile = itemDataFile;
		this.monsterDataFile = monsterDataFile;

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
					[
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
								text += " (" + self.player().inventorySlotsOccupied() + "/" + self.player().data().inventoryMaxSlots() + ")";
								return text;
							},
							action: function(){
								self.toggleInventory();
							},
						},
					],
					[

						{
							text: "View Skills/Stats",
							action: function(){
								self.toggleInventory();
							},
						},

					]
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
					var qty = self.addFoodToPlayerInventory();
					message = "You gracefully float to the bottom of the river and successfully scrounge up " + qty + " fish biscuits using your kick-ass mouth feelers.";
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
		this.fullScreenNoticeContinueAction;
		this._goesFirst;

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
				canSell : ko.observable(0),
				canBuy : ko.observable(0),
				moveDirection : ko.observable("right"),
				actualItem : ko.observable(undefined),
			});
			self.arrowKeysControlPlayerPos = ko.observable(true);
			self.currentInventoryRightSide = ko.observable("equipment");
			self.freezeMovement = ko.observable(false);
			self.currentContainer = new ItemCollection(Array());
			self.fullScreenNotice = ko.observable(undefined);
			self.currentEnemy = ko.observable(undefined);

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

			$.each(["content-area","inventory-equipment","event-area","full-screen-notice","combat-area"], function(idx, elem){
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
			var qty = Math.ceil(self.player().data().skills().findFood() / 10);
			var itemData = self.getAvailableItemById("biscuit_food", "consumables", qty);
			if(itemData){
				self.player().addItemToInventory( new Item(itemData) );
			}
			return qty;
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
			self.freezeMovement(true);
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
				self.currentInventoryRightSide("equipment");
				$("#content-area").fadeIn(300);
				self.freezeMovement(false);
			});
			self._resetActiveItem();
		}
		
		self.showDamage = function(which){
			if(which == "enemy"){
				$("#combat-area .enemy").stop(false, true).effect("highlight", { color: "#FF3939" }, 800);
			}else if(which == "player"){
				$("#combat-area .player").stop(false, true).effect("highlight", { color: "#FF3939" }, 800);
			}
		}

		this.showCombatMessage = function(msg, action){
			self.visibleSection("full-screen-notice");
			$("#content-area").fadeOut(300, function(){
				self.fullScreenNotice(msg);
				self.fullScreenNoticeContinueAction = action;
				$("#full-screen-notice").fadeIn(300);
			});
		}

		this.startCombat = function(){

			//Initialize a monster
			var newMonsterID = doBasedOnPercent({
				25 : [
					"monster_01",
					"monster_02",
					"monster_03",
					"monster_04",
				]
			});
			
			self.currentEnemy(new Monster( self.getMonsterById(newMonsterID) ));
			//Reset our "goes first" tracker
			self._goesFirst = undefined;

			self.visibleSection("combat-area");
			$("#full-screen-notice").fadeOut(300, function(){
				$("#combat-area").fadeIn(300);
			});
		}
		
		this.getGoesFirst = function(){
			
			if( self._goesFirst == undefined ){

				var goesFirst;
	
				if( self.player().data().speed() > self.currentEnemy().speed() ){
					goesFirst = "player";
				}else if( self.player().data().speed() < self.currentEnemy().speed() ){
					goesFirst = "enemy";
				}else{
					goesFirst = (doRand(0,2) == 1) ? "enemy" : "player" ;
				}
				
				self._goesFirst = goesFirst;
			}
			
			return self._goesFirst;

		}
		
		this.playerAttacks = function(game, event){
			self.doCombatRound();
		}
		
		this.doCombatRound = function(playerAttacks, enemyAttacks){
			
			playerAttacks = ( playerAttacks != undefined ) ? playerAttacks : true ;
			enemyAttacks = ( enemyAttacks != undefined) ? enemyAttacks : true ;
			
			var goesFirst = self.getGoesFirst();
			
			var playerDmg = self.player().doAttack();
			var enemyDmg = self.currentEnemy().doAttack();
			var playerDidDmg = false;
			var enemyDidDmg = false;
			
			if( goesFirst == "player" ){
				
				if( playerAttacks ){
					self.currentEnemy().takeDmg(playerDmg);
					self.showDamage("enemy");
					playerDidDmg = true;
				}
				
				if(!self.currentEnemy().isDead() && enemyAttacks){
					self.player().takeDmg(enemyDmg);
					self.showDamage("player");
					enemyDidDmg = true;
				}
			}else{

				if( enemyAttacks ){
					self.player().takeDmg(enemyDmg);
					self.showDamage("player");
					enemyDidDmg = true;
				}
				
				if(!self.player().isDead() && playerAttacks){
					self.currentEnemy().takeDmg(playerDmg);
					self.showDamage("enemy");
					playerDidDmg = true;
				}
				
			}
			
			if(playerDidDmg){
				self.logMessage("You strike the enemy for " + playerDmg + " points of damage!", "combat");
			}
			if(enemyDidDmg){
				self.logMessage("The enemy strikes you for " + enemyDmg + " points of damage!", "combat");				
			}
			if(self.currentEnemy().isDead()){
				self.logMessage("You defeated the enemy! You gain (TBD) amount of XP!", "combat");
			}
			
		}

		this.lootEnemy = function(){
			self.freezeMovement(true);

			self.currentContainer([self.generateRandomLootItem()]);
			self.currentInventoryRightSide("container");

			self.visibleSection("inventory-equipment");
			$("#combat-area").fadeOut(300, function(){
				$("#inventory-equipment").fadeIn(300);
			});
		}

		this.leaveCombat = function(){
			self.visibleSection("content-area");
			$("#combat-area").fadeOut(300, function(){
				$("#content-area").fadeIn(300);
				self.freezeMovement(false);
			});
		}

		this.fullScreenNoticeContinue = function(){
			if(typeof self.fullScreenNoticeContinueAction === 'function'){
				self.fullScreenNoticeContinueAction();
			}
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
			self.currentInventoryRightSide("container");

			self.toggleInventory();
		}

		this.squareItemAction = function(){

			self.freezeMovement(true);

			var newItem = self.generateRandomLootItem();

			var container = doBasedOnPercent({
				25 : [
					"a crate sealed tightly with tar",
					"an upturned canoe concealing a pocket of air",
					"a waterproof oilskin bag",
					"a crevice between two large rocks",
				]
			});

			var itemQtyInInventory = self.player().addItemToInventory(newItem);

			if(itemQtyInInventory != false && itemQtyInInventory > 0){

				self.logMessage("Inside " + container + " you find " + newItem.qty() + " " + newItem.name, "item");
				self.freezeMovement(false);
			}else{
				self.logMessage("Inside " + container + " you find " + newItem.qty() + " " + newItem.name + ", but your inventory is currently full", "item");
				self.showContainerWithContents([newItem]);
			}
		}
		
		this.generateRandomLootItem = function(doGold){

			var itemClass = "item";

			var itemToAdd = {};

			var canAdd = true;
			
			doGold = (doGold != undefined) ? doGold : true ;

			var possibleItemTypes = {
				50 : "gold",
				25 : [
					"misc",
					"gear",
				]
			};
			
			if(!doGold){
				possibleItemTypes = {
					50 : [
						"misc",
						"gear",
					]
				};
			}

			var itemType = doBasedOnPercent(possibleItemTypes);

			if(itemType == "gold"){

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

				itemToAdd = self.getAvailableItemById("gold", "currency", goldAmt);

			}else if(itemType == "misc"){

				//41% armor scraps, 39% weapon scraps, 20% stone of reset
				var miscType = doBasedOnPercent({
					20 : [
						"stone",
						"food",
					],
					30 : [
						"weapon",
						"armor",
					]
				});

				if( miscType == "armor" ){

					itemToAdd = self.getAvailableItemById("armor_scraps", "crafting", doRand(1,26));

				}else if( miscType == "weapon" ){

					itemToAdd = self.getAvailableItemById("weapon_scraps", "crafting", doRand(1,26));

				}else if( miscType == "stone" ){

					itemToAdd = self.getAvailableItemById("reset_stone", "consumables", 1);

				}else if( miscType == "food" ){
					itemToAdd = self.getAvailableItemById("biscuit_food", "consumables", 1);
				}

			}else if(itemType == "gear"){

				var gearType = doBasedOnPercent({
					50 : [
						"armor",
						"weapon",
					],
					
				});

				//Eventually these will be randomized, but let's keep it simple for now...
				if( gearType == "armor" ){

					itemClass = "armor";
					
					var armorId;
					
					if(self.level().levelNum() < 5){

						armorId = doBasedOnPercent({
							25 : [
								"body_armor_01",
								"head_armor_01",
								"shield_01",
								"tail_armor_01",
							],
						});
						
					}else if( self.level().levelNum() > 5 ){
						armorId = doBasedOnPercent({
							25 : [
								"body_armor_02",
								"head_armor_02",
								"shield_02",
								"fin_armor_01",
							],
						});
					}
					
					if(armorId == "shield_01" || armorId == "shield_02"){
						itemClass = "shield";
						itemToAdd = self.getAvailableItemById(armorId, "shield", 1);
					}else{
						itemToAdd = self.getAvailableItemById(armorId, "armor", 1);
					}

				}else if( gearType == "weapon" ){

					itemClass = "weapon";
					
					
					
					var weaponId;
					
					if(self.level().levelNum() < 5){

						weaponId = doBasedOnPercent({
							50 : [
								"melee_weapon_01",
								"melee_weapon_02",
							],
						});
						
					}else if( self.level().levelNum() > 5 ){
						weaponId = doBasedOnPercent({
							50 : [
								"melee_weapon_03",
								"melee_weapon_04",
							],
						});
					}					

					itemToAdd = self.getAvailableItemById(weaponId, "weapon", 1);

				}

			}

			var newItem;

			if(itemClass == "item"){
				newItem = new Item(itemToAdd);
			}else if(itemClass == "weapon"){
				newItem = new Weapon(itemToAdd);
			}else if(itemClass == "armor" || itemClass == "shield"){
				newItem = new Armor(itemToAdd);
			}
			
			return newItem;

		}

		this.squareCombatAction = function(){
			self.freezeMovement(true);
			console.log("trigger a combat action");

			//Generate "enemy appears" message
			var enemyMsg = doBasedOnPercent({
				25 : [
					"Suddenly, swimming out of the murky depths, a foe appears!",
					"A shadow looms over you. You turn around swiftly; it's an enemy!",
					"An enemy swims up to you, and attacks!",
					"You charge headfirst into an enemy!",
				]
			});
			
			self.logMessage(enemyMsg, "combat");

			self.showCombatMessage(enemyMsg, function(){
				self.startCombat();
				/*if( self.getGoesFirst() == "enemy" ){
					self.doCombatRound(false, true);
				}*/
			});

			//Show our "pop-up", describing the enemy

		}

		this.squareEventAction = function(){
			
			var eventType = doBasedOnPercent({
				40 : "skill",
				30 : "trader",
				20 : "cooldown",
				10 : "stat",
			});
			
			var msg = "";
			var action;
			
			action = function(){

				self.visibleSection("content-area");
				$("#event-area").fadeOut(300);
				$("#inventory-equipment").fadeOut(300, function(){
					$("#content-area").fadeIn(300);
					self.freezeMovement(false);
				});

			}
			
			if(eventType == "trader"){
				msg = "You encounter a friendly trader who offers to show you his wares.";
				action = function(){
					
					var itemArray = Array();
					
					var numItems = doRand(3,8);
					
					for(var i = 0; i < numItems; i++){
						itemArray.push(self.generateRandomLootItem(false));
					}

					self.currentContainer(itemArray);
					self.currentInventoryRightSide("merchant");
	
					self.visibleSection("inventory-equipment");
					$("#full-screen-notice").fadeOut(300, function(){
						$("#inventory-equipment").fadeIn(300);
					});
				}
			}else if( eventType == "skill" ){
				
			}else if( eventType == "cooldown" ){
				
			}else if( eventType == "stat" ){
				
			}
			
			self.visibleSection("full-screen-notice");
			$("#content-area").fadeOut(300, function(){
				self.fullScreenNotice(msg);
				self.fullScreenNoticeContinueAction = action;
				$("#full-screen-notice").fadeIn(300);
			});
			
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
			self.activeItem().canSell(0);
			self.activeItem().canBuy(0);
			self.activeItem().canUnEquip(0);
			self.activeItem().moveDirection("right");
			self.activeItem().actualItem(undefined);

		}

		this.setContainerItemAsActiveItem = function(item, e){
			self._setAsActiveItem({ moveDirection : "left", canEquip : 0, canUse : 0 }, item, e);
		}

		this.setInventoryItemAsActiveItem = function(item, e){
			self._setAsActiveItem({ moveDirection : "right" }, item, e);
		}

		this.setEquipmentItemAsActiveItem = function(item){
			if( !isEmptyObject(item) ){
				self._setAsActiveItem({ moveDirection : "left", canEquip : 0, canUnEquip : 1 }, item);
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
			if( ( self.currentContainer().length == 0 && type == "consumables") || (opts.canUse && opts.canUse == 1) ){
				self.activeItem().canUse(1);
			}else if ( (self.currentInventoryRightSide() == "equipment" && opts.moveDirection == "right" && (type == "armor" || type == "weapon" || type == "shield")) || (opts.canEquip && opts.canEquip == 1) ){
				//For now, if a container is open, we just plain can't equip stuff
				self.activeItem().canEquip(1);
			}else if ( (self.currentInventoryRightSide() == "equipment" && opts.moveDirection == "left" && (type == "armor" || type == "weapon" || type == "shield")) || (opts.canUnEquip && opts.canUnEquip == 1) ){
				self.activeItem().canUnEquip(1);
			}

			if( (opts.moveDirection == "left" && self.currentInventoryRightSide() == "equipment") || (opts.canDrop && opts.canDrop == 0) ){
				self.activeItem().canDrop(0);
			}else if( opts.moveDirection == "left" && self.currentInventoryRightSide() == "container" || (opts.canDrop && opts.canDrop == 1) ){
				self.activeItem().canDrop(1);				
			}else if( type != "currency" || (opts.canDrop && opts.canDrop == 1) ){
				self.activeItem().canDrop(1);
			}
			
			if( ( opts.moveDirection == "left" && self.currentInventoryRightSide() == "merchant" ) || ( opts.canBuy && opts.canBuy == 1 ) ){
				self.activeItem().canBuy(1);
			}else if( ( opts.moveDirection == "right" && self.currentInventoryRightSide() == "merchant" ) || ( opts.canSell && opts.canSell == 1 ) ){
				self.activeItem().canSell(1);
			}

			self.activeItem().moveDirection(opts.moveDirection);

			self.activeItem().actualItem(item);

			//self.activeItem().canUnEquip(1);


		}

		this.equipActiveItem = function(game, event){

			var item = self.activeItem().actualItem();
			
			var alreadyEquippedItem;

			if(item.type == "weapon"){
				alreadyEquippedItem = self.player().equipWeapon(item);
			}else if(item.type == "shield"){
				alreadyEquippedItem = self.player().equipShield(item);
			}else if(item.type == "armor"){
				alreadyEquippedItem = self.player().equipArmor(item);
			}

			self.player().data().inventory.removeItem(item);
			
			if( alreadyEquippedItem != undefined ){
				self.player().addItemToInventory(alreadyEquippedItem);
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
			}

			self.player().data().inventory.addItem(item);
			self._resetActiveItem();

		}
		
		this.buyActiveItem = function(game, event){

			var item = self.activeItem().actualItem();
			var moveFrom = self.currentContainer;
			var moveTo = self.player().data().inventory;
			
			var gold = moveTo.getItemByID("gold");
			
			if(gold && gold.qty() >= item.buyValue){
				gold.qty( gold.qty() - item.buyValue );
				
				var newItem = cloneObject(item);
				newItem.qty(1);
				
				var srcNumLeft = moveFrom.removeItem(item, 1);
	
				if(srcNumLeft == 0){
					self._resetActiveItem();
				}
	
				//Add to inventory
				moveTo.addItem(newItem);
				
			}

		}
		
		this.sellActiveItem = function(game, event){

			var item = self.activeItem().actualItem();
			var moveFrom = self.player().data().inventory;
			var moveTo = self.currentContainer;
			
			var gold = self.getAvailableItemById("gold", "currency", item.sellValue());
			goldItem = new Item(gold);
			
			var newItem = cloneObject(item);
			newItem.qty(1);
			
			var srcNumLeft = moveFrom.removeItem(item, 1);

			if(srcNumLeft == 0){
				self._resetActiveItem();
			}

			//Add to inventory
			moveTo.addItem(newItem);
			moveFrom.addItem(goldItem);
		}

		this.useActiveItem = function(game, event){

			var item = self.activeItem().actualItem();
			
			if(item.id == "biscuit_food" ){
				
				self._dropActiveItem(game, event, 1);
				
				self.player().data().hp( self.player().data().maxHp() );
				self.logMessage("Eating some fish biscuits restored you to full HP!", "player");
			}

		}

		this._dropActiveItem = function(game, event, qty){

			var itemToMoveId = self.activeItem().id(),
				existingItem = undefined,
				newItem = undefined,
				moveFrom = "inventory",
				moveTo = false,
				srcCollection = undefined,
				tarCollection = undefined;

			srcCollection = self.player().data().inventory;

			//Do we have an active container?
			if(self.currentInventoryRightSide() == 'container'){				

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
			newItem = cloneObject(existingItem);
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
				tarCollection.addItem(newItem);

			}else if ( moveFrom == "inventory" ){

				if(srcNumLeft == 0){
					self._resetActiveItem();
				}

				if(moveTo){
					//Add to container
					tarCollection.addItem(newItem);
				}
			}

		}

		this.dropActiveItem = function(game, event){

			self._dropActiveItem(game, event, 1);

		}

		this.dropAllActiveItem = function(item, event){
			
			self._dropActiveItem(item, event, "all");

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

		this.getAvailableItemsByType = function(type){
			return self.itemDataFile.items[type] || false;
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
			return Object.keys(self.itemDataFile.items);
		}
		
		this.getMonsterById = function(monsterId){
			var monsterIDs = Object.keys(self.monsterDataFile);
			for(i=0; i < monsterIDs.length; i++){
				if(monsterIDs[i] == monsterId){
					return self.monsterDataFile[monsterIDs[i]];
				}
			}
		}

		this.itemTest = function(){

			var itemData = {};

			/*var itemData = self.getAvailableItemById("biscuit_food", "consumables", 1);
			if(itemData){
				self.player().addItemToInventory( new Item(itemData) );

				//Add 3 more
				itemData.qty = 3;
				self.player().addItemToInventory( new Item(itemData) );
			}

			var itemOne, itemTwo;

			itemData = self.getAvailableItemById("armor_scraps", "crafting", doRand(1,26));
			if(itemData){
				itemOne = new Item(itemData);
			}

			itemData = self.getAvailableItemById("body_armor_01", "armor", 1);
			if(itemData){
				itemTwo = new Armor(itemData);
			}

			if(itemOne && itemTwo){
				self.showContainerWithContents([itemOne, itemTwo]);
			}*/
			
			var itemData = self.getAvailableItemById("melee_weapon_01", "weapon", 1);
			if(itemData){
				var weap = new Weapon(itemData);
			}
			self.showContainerWithContents([weap]);

			/*
				var itemData = self.getAvailableItemById("melee_weapon_01", "weapon", 1);
			if(itemData){
				self.player().addItemToInventory( new Weapon(itemData) );
			}

			itemData = self.getAvailableItemById("body_armor_01", "armor", 1);
			if(itemData){
				self.player().data().inventory.addItem( new Armor(itemData) );
			}
			*/
		}

		self.init();

	};

	Game.prototype.constructor = Game;

	return Game;

});
