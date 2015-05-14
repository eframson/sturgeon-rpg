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
], function($, ko, Player, Level, Item, Weapon, Armor, ItemCollection, Monster, itemDataFile, monsterDataFile, Utils) {

	function Game() {

		var self = this;

		this.itemDataFile = itemDataFile;
		this.monsterDataFile = monsterDataFile;

		this.player = undefined;
		this.states = {
			start: {
				beforeText: "<p>You are in an egg, nestled in a layer of rocks at the bottom of a creek bed. It is a comfortable 16 degrees Celsius. You've been in here for a week already. You are bored.</p>",
				buttons: [
					[
						{
							text: "Let's bust outta here!",
							action: function(){ self.setState("d1"); }
						},
					]
				],
				location: "Unknown",
				hideMap: ko.observable(true),
				hidePlayerStats: ko.observable(true),
			},
			d1: {
				beforeText: "<p>With a loud crack, you emerge from your egg like the Kool-Aid man through a brick wall.</p>",
				buttons: [
					[
						{
							text: "OH YEAH!!!",
							action: function(){ self.setState("d2"); }
						},
					]
				],
				location: "Unknown",
				hideMap: ko.observable(true),
				hidePlayerStats: ko.observable(true),
			},
			d2: {
				beforeText: "<p>You feel cool water rush past your face like a refreshing breeze.</p>",
				buttons: [
					[
						{
							text: "Continue",
							action: function(){ self.setState("idle"); }
						},
					]
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
								self.showSkillsArea();
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
				Utils.doBasedOnPercent(percentages,
				function(rand){
					//console.log("rand: " + rand + " ; temp bonus: " + self.tempFoodFindBonus + " ; findPercent: " + findPercent);
					message = "You attempt to smoothly swim to the bottom of the riverbed, but you miscalculate the strength of your mighty fins and crash down on some fish biscuits, destroying them completely.";

					if( self.player().data().skills().findFood() + self.tempFoodFindBonus <= 60 ){
						self.tempFoodFindBonus += 2;
					}

				});

				self.logMessage(message);

				var skillIncrease = 0;

				if( self.player().data().skills().findFood() < 40 ){
					skillIncrease = Utils.doBasedOnPercent({
						70 : 1,
						30 : 2,
					});
				}else if( self.player().data().skills().findFood() < 80 ){
					skillIncrease = Utils.doBasedOnPercent({
						90 : 1,
						10 : 2,
					});
				}else{
					skillIncrease = Utils.doBasedOnPercent({
						80 : 1,
					});
				}

				if(skillIncrease){
					self.player().data().skills().findFood( self.player().data().skills().findFood() + skillIncrease );

					self.logMessage("Your skill in finding food has increased to " + self.player().data().skills().findFood() + "/100");
				}
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
				canUpgrade : ko.observable(0),
				moveDirection : ko.observable("right"),
				actualItem : ko.observable(undefined),
			});
			self.arrowKeysControlPlayerPos = ko.observable(true);
			self.currentInventoryRightSide = ko.observable("equipment");
			self.freezeMovement = ko.observable(false);
			self.currentContainer = new ItemCollection(Array());
			self.fullScreenNotice = ko.observable(undefined);
			self.fullScreenNoticeButtons = ko.observableArray(undefined);
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

			self._activeItemCanBeUpgraded = ko.computed(function(){
				if( self.activeItem().actualItem() instanceof Armor ){
					return self.player().armorScraps() >= self.activeItem().actualItem().costForNextUpgradeLevel();
				}else if( self.activeItem().actualItem() instanceof Weapon ){
					return self.player().weaponScraps() >= self.activeItem().actualItem().costForNextUpgradeLevel();
				}
				return false;
			});

			self.activeItemButtons = ko.computed(function(){
				var buttons = new Array();

				if( self.activeItem().actualItem() != undefined ){
					var actualItem = self.activeItem().actualItem();

					if( self.activeItem().canEquip() && self.currentInventoryRightSide() == "equipment" ){
						buttons.push({
							css: "",
							text: "Equip",
							click: self.equipActiveItem
						});
					}

					if( self.activeItem().canUnEquip() && self.currentInventoryRightSide() == "equipment" ){
						buttons.push({
							css: "",
							text: "Un-Equip",
							click: self.unEquipActiveItem
						});
					}

					//It's not actually dependent on the equipment screen, it just can't be used while looting a container or trading with a merchant
					if( self.activeItem().canUse() && self.currentInventoryRightSide() == "equipment" ){
						buttons.push({
							css: "",
							text: "Use",
							click: self.useActiveItem
						});
					}

					if( self.activeItem().canBuy() && self.currentInventoryRightSide() == "merchant" ){

						if( actualItem.qty() == 1 ){

							buttons.push({
								css: ( self.player().gp() < actualItem.buyValue() ) ? "disabled" : "",
								text: "Buy (" + actualItem.buyValue() + " GP)",
								click: self.buyActiveItem
							});

						}else if( actualItem.qty() > 1 ){

							buttons.push({
								css: ( self.player().gp() < actualItem.buyValue() ) ? "disabled" : "",
								text: "Buy 1x (" + actualItem.buyValue() + " GP)",
								click: self.buyActiveItem
							});

							var numPurchasable = Math.floor( self.player().gp() / actualItem.buyValue() );
							var actualPurchasable = (numPurchasable <= actualItem.qty()) ? numPurchasable : actualItem.qty() ;

							if(actualPurchasable > 0){

								buttons.push({
									css: ( self.player().gp() < (actualPurchasable * actualItem.buyValue()) ) ? "disabled" : "",
									text: "Buy " + actualPurchasable + "x (" + (actualPurchasable * actualItem.buyValue()) + " GP)",
									click: self.buyMaxActiveItem
								});

							}
						}

					}

					if( self.activeItem().canSell() && self.currentInventoryRightSide() == "merchant" ){

						if( self.activeItem().actualItem().qty() == 1 ){

							buttons.push({
								css: "",
								text: "Sell (" + self.activeItem().actualItem().sellValue() + " GP)",
								click: self.sellActiveItem
							});

						}else if( self.activeItem().actualItem().qty() > 1 ){

							buttons.push({
								css: "",
								text: "Sell 1x (" + actualItem.sellValue() + " GP)",
								click: self.sellActiveItem
							});

							buttons.push({
								css: "",
								text: "Sell All (" + (actualItem.qty() * actualItem.sellValue()) + " GP)",
								click: self.sellAllActiveItem
							});

						}

					}

					if( self.activeItem().canUpgrade() && self.currentInventoryRightSide() == "equipment" ){

						buttons.push({
							css: (self._activeItemCanBeUpgraded()) ? "" : "disabled",
							text: "Upgrade (" + actualItem.costForNextUpgradeLevel() + " scrap)",
							click: self.upgradeActiveItem
						});

					}

					if( self.activeItem().canDrop() && self.currentInventoryRightSide() != 'merchant'){
						
						if( self.currentInventoryRightSide() == 'container' ){ //We're moving something

							if( self.activeItem().moveDirection() == "left" ){ //We're moving from the container to the inventory

								if(actualItem.qty() > 1){

									if( actualItem.id != "gold" ){
										buttons.push({
											css: "",
											text: "Take 1x",
											click: self.dropActiveItem
										});
									}

									buttons.push({
										css: "",
										text: "Take All",
										click: self.dropAllActiveItem
									});

								}else if(actualItem.qty() == 1){
									buttons.push({
										css: "",
										text: "Take",
										click: self.dropActiveItem
									});
								}

							}else if( self.activeItem().moveDirection() == "right" ){ //We're moving from the inventory to the container
								
								if( actualItem.id != "gold" ){

									if( actualItem.qty() > 1 ){

										buttons.push({
											css: "",
											text: "Put 1x",
											click: self.dropActiveItem
										});

										buttons.push({
											css: "",
											text: "Put All",
											click: self.dropAllActiveItem
										});

									}else if( actualItem.qty() == 1 ){
										
										buttons.push({
											css: "",
											text: "Put",
											click: self.dropActiveItem
										});

									}

								}

							}
							
						}else { //We're dropping something

							if(actualItem.qty() > 1){

								buttons.push({
									css: "",
									text: "Drop 1x",
									click: self.dropActiveItem
								});

								buttons.push({
									css: "",
									text: "Drop All",
									click: self.dropAllActiveItem
								});

							}else if(actualItem.qty() == 1){
								buttons.push({
									css: "",
									text: "Drop",
									click: self.dropActiveItem
								});
							}

						}
					}

				}

				return buttons;
			});
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

			$.each(["content-area","inventory-equipment","skills-area","full-screen-notice","combat-area"], function(idx, elem){
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
			//$("#skills-area").fadeOut(300);
			$("#skills-area").hide();
			$("#inventory-equipment").fadeOut(300, function(){
				self.currentContainer.removeAll();
				self.currentInventoryRightSide("equipment");
				$("#content-area").fadeIn(300);
				self.freezeMovement(false);
			});
			self._resetActiveItem();
		}

		this.showSkillsArea = function(){
			self.visibleSection("skills-area");
			$("#content-area").fadeOut(300, function(){
				$("#skills-area").fadeIn(300);
			});
		}

		self.showDamage = function(which){
			if(which == "enemy"){
				$("#combat-area > .row > .enemy .hp").stop(false, true).effect("highlight", { color: "#FF3939" }, 800);
			}else if(which == "player"){
				$("#combat-area > .row > .player .hp").stop(false, true).effect("highlight", { color: "#FF3939" }, 800);
			}
		}

		this.showCombatMessage = function(msg, buttons){
			self.visibleSection("full-screen-notice");
			$("#content-area").fadeOut(300, function(){
				self.fullScreenNotice(msg);
				self.fullScreenNoticeButtons(buttons);
				$("#full-screen-notice").fadeIn(300);
			});
		}

		this.startCombat = function(){

			//Initialize a monster
			var newMonsterID = Utils.doBasedOnPercent({
				25 : [
					"monster_01",
					"monster_02",
					"monster_03",
					"monster_04",
				]
			});

			self.currentEnemy(new Monster(
				$.extend(
					self.getMonsterById(newMonsterID),
					{ level : self.level().levelNum() }
				)
			));

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
					goesFirst = (Utils.doRand(0,2) == 1) ? "enemy" : "player" ;
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
			if( self.player().isDead() ){
				self.logMessage("You were defeated in combat! Better luck next time...", "combat");
			}else if(self.currentEnemy().isDead()){
				self.player().addExp(self.currentEnemy().expValue());
				self.logMessage("You defeated the enemy! You gain " + self.currentEnemy().expValue() + " XP!", "combat");

				if( self.player().hasLeveledUp() ){
					self.player().hasLeveledUp(false);
					self.logMessage("You leveled up! Your stats have improved accordingly.", "combat");
				}
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

			var container = Utils.doBasedOnPercent({
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

		this.generateRandomLootItem = function(quality, doGold){

			quality = quality || "standard";
			doGold = (doGold != undefined) ? doGold : true ;
			var itemClass = "item";
			var itemToAdd = {};
			var qtyCoefficient = Math.ceil( self.level().levelNum() / 5 );
			var canAdd = true;

			var possibleItemTypes = {
				40 : "gold",
				35 : "misc",
				25 : "gear",
			};

			if(!doGold){
				possibleItemTypes = {
					50 : [
						"misc",
						"gear",
					]
				};
			}

			var itemType = Utils.doBasedOnPercent(possibleItemTypes);

			if(itemType == "gold"){

				//60% of getting 80-120, 30% of getting 160 - 240, 9% of getting 320 - 480, 1% of getting 2000
				var goldSize = Utils.doBasedOnPercent({
					1 : "hoard",
					9 : "large",
					30 : "medium",
					60 : "small"
				});

				var goldAmt = 0;

				if( goldSize == "small" ){
					goldAmt = Utils.doRand(80, 121);
				}else if( goldSize == "medium" ){
					goldAmt = Utils.doRand(160, 241);
				}else if( goldSize == "large" ){
					goldAmt = Utils.doRand(320, 481);
				}else if( goldSize == "hoard" ){
					goldAmt = 2000;
				}

				goldAmt * qtyCoefficient;

				itemToAdd = self.getAvailableItemById("gold", "currency", goldAmt);

			}else if(itemType == "misc"){

				var miscType = Utils.doBasedOnPercent({
					25 : [
						"stone",
						"food",
						"weapon",
						"armor",
					]
				});

				var scrapQty = Utils.doRand(1,26) * qtyCoefficient;
				var foodQty = 1 * qtyCoefficient;

				if( miscType == "armor" ){

					itemToAdd = self.getAvailableItemById("armor_scraps", "crafting", scrapQty);

				}else if( miscType == "weapon" ){

					itemToAdd = self.getAvailableItemById("weapon_scraps", "crafting", scrapQty);

				}else if( miscType == "stone" ){

					itemToAdd = self.getAvailableItemById("reset_stone", "consumables", 1);

				}else if( miscType == "food" ){
					var consumableType = Utils.doBasedOnPercent({
						50 : [
							"health_potion",
							"biscuit_food",
						]
					});
					itemToAdd = self.getAvailableItemById(consumableType, "consumables", foodQty);
				}

			}else if(itemType == "gear"){

				var gearType = Utils.doBasedOnPercent({
					50 : [
						"armor",
						"weapon",
					],

				});

				if( gearType == "armor" ){

					itemClass = "armor";

					var armorId;

					var availableArmor = self.getAvailableItemIdsByTypeForLevel("armor", self.level().levelNum());
					armorId = Utils.chooseRandomly( availableArmor );
					if(armorId == "shield_01" || armorId == "shield_02"){
						itemClass = "shield";
						itemToAdd = self.getAvailableItemById(armorId, "shield", 1);
					}else{
						itemToAdd = self.getAvailableItemById(armorId, "armor", 1);
					}

				}else if( gearType == "weapon" ){

					itemClass = "weapon";

					var weaponId;

					var availableWeapons = self.getAvailableItemIdsByTypeForLevel("weapon", self.level().levelNum());
					weaponId = Utils.chooseRandomly( availableWeapons );

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
			var enemyMsg = Utils.doBasedOnPercent({
				25 : [
					"Suddenly, swimming out of the murky depths, a foe appears!",
					"A shadow looms over you. You turn around swiftly; it's an enemy!",
					"An enemy swims up to you, and attacks!",
					"You charge headfirst into an enemy!",
				]
			});

			self.logMessage(enemyMsg, "combat");

			self.showCombatMessage(
				enemyMsg,
				new Array(
					{
						title : "Continue",
						action : function(){
							self.startCombat();
							/*if( self.getGoesFirst() == "enemy" ){
								self.doCombatRound(false, true);
							}*/
						},
					}
				)
			);

			//Show our "pop-up", describing the enemy

		}

		this.squareEventAction = function(){

			self.freezeMovement(true);

			var eventType = Utils.doBasedOnPercent({
				30 : "trainer",
				40 : "trader",
				25 : "cooldown",
				5 : "stat",
			});

			var msg = "";
			var buttons;

			buttons = new Array(
				{
					title : "Continue",
					action : function(){

						self.visibleSection("content-area");
						$("#full-screen-notice").fadeOut(300, function(){
							$("#content-area").fadeIn(300);
							self.freezeMovement(false);
						});
					},
				}
			);

			if(eventType == "trader"){

				msg = "You encounter a friendly trader who offers to show you his wares.";
				buttons = new Array(
					{
						title : "Continue",
						action : function(){

							self.currentContainer.removeAll();

							var itemArray = Array();

							var numItems = Utils.doRand(3,8);

							for(var i = 0; i < numItems; i++){
								self.currentContainer.addItem(self.generateRandomLootItem(undefined, false));
							}

							self.currentInventoryRightSide("merchant");

							self.visibleSection("inventory-equipment");
							$("#full-screen-notice").fadeOut(300, function(){
								$("#inventory-equipment").fadeIn(300);
							});

						},
					}
				);

			}else if( eventType == "trainer" ){

				var trainCost = 0;

				var trainSkillString = Utils.chooseRandomly(
					Array(
						"findFood",
						"scanSquares",
						"visionRange"
					)
				);
				var trainSkill;

				msg = "You encounter a wise old hermit crab who offers to teach you how to ";

				if(trainSkillString == "findFood"){
					msg += "get better at scrounging for food";
					trainCost = (self.player().data().skills().findFood() + 1) * 10;
					trainSkill = self.player().data().skills().findFood;
				}else if(trainSkillString == "scanSquares"){
					msg += "get better at surveying your surroundings";
					trainCost = (self.player().data().skills().scanSquares() * 1000);
					trainSkill = self.player().data().skills().scanSquares;
				}else if(trainSkillString == "visionRange"){
					msg += "sharpen your vision";
					trainCost = (self.player().data().skills().visionRange() * 1000);
					trainSkill = self.player().data().skills().visionRange;
				}

				msg += " for " + trainCost + " GP";

				buttons = new Array(
					{
						title : "Buy (" + trainCost + " GP)",
						action : function(){

							var gold = self.player().data().inventory.getItemByID("gold");
							gold.qty( gold.qty() - this.trainCost );

							this.trainSkill( this.trainSkill() + 1 );

							if(trainSkillString == "findFood"){
								self.logMessage("Your skill in finding food has increased to " + this.trainSkill() + "/100" );
							}else if(trainSkillString == "scanSquares"){
								self.logMessage("Your scan range has increased to " + this.trainSkill() + "/10" );
							}else if(trainSkillString == "visionRange"){
								self.logMessage("Your vision range has increased to " + this.trainSkill() + "/10" );
							}

							self.visibleSection("content-area");
							$("#full-screen-notice").fadeOut(300, function(){
								$("#content-area").fadeIn(300);
								self.freezeMovement(false);
							});

						},
						css : function(){
							if( self.player().gp() < this.trainCost ){
								return "disabled";
							}
							return "";
						},
						skillIncrease : 1,
						trainSkill : trainSkill,
						trainSkillString : trainSkillString,
						trainCost : trainCost,
					},
					{
						title : "Leave",
						action : function(){

							self.visibleSection("content-area");
							$("#full-screen-notice").fadeOut(300, function(){
								$("#content-area").fadeIn(300);
								self.freezeMovement(false);
							});

						},
					}
				);

			}else if( eventType == "cooldown" ){

				msg = "You take a moment to catch your breath and play FishVille on your phone, and become immediately engrossed in the game. When you decide to resume your journey, you realize that several hours have passed. All your cooldowns are instantly finished.";
				buttons = new Array(
					{
						title : "Continue",
						action : function(){

							self.logMessage(this.msg);

							self.player().data().skillCooldowns().findFood(0);
							self.player().data().skillCooldowns().scanSquares(0);

							self.visibleSection("content-area");
							$("#full-screen-notice").fadeOut(300, function(){
								$("#content-area").fadeIn(300);
								self.freezeMovement(false);
							});
						},
						msg : msg,
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

				msg = "";
				var statIncreaseAmt = 1;
				var doExpGain = false;

				if( stat == "str" ){
					msg = "You find your path blocked by a large rock. Instead of simply swimming around or over it, you decide to try and move it. After an hour of laborious work, you manage to move it out of the way. The experience empowers you, permanently giving you +1 STR.";
				}else if( stat == "dex" ){
					msg = "While swimming along, you suddenly realize that you are about to crash right into a sharp metal hook just floating in the water in front of you. With quick thinking and maneuvering, you manage to barrel-roll to the side and avoid it.  As you cruise past, you also snag a tasty-looking worm that someone apparently left just hanging on the hook. As you munch the delicious worm, you think you can probably figure out how to better avoid such water hazards in the future. Gain +1 DEX."
				}else if( stat == "end" ){
					msg = "A passing trout challenges you to an impromptu fin-wrestling contest. The ensuing match takes a full hour before your strength finally gives out and you are forced to concede victory to the other fish. Panting and visibly just as exhausted as you and thoroughly impressed with your determination, the trout tells you one of his fin-wrestling secrets. You gain +1 END.";
				}else if( stat == "exp" ){
					msg = "You come across a water-logged journal lodged between two rocks. Nonchalantly flippering through the pages, you encounter some surprisingly useful advice.";
					statIncreaseAmt = Math.ceil( self.player().expRequiredForNextLevel() / 2 );
					doExpGain = true;
				}


				buttons = new Array(
					{
						title : "Continue",
						action : function(){

							self.logMessage(this.msg);

							if(!doExpGain){
								statToIncrease( statToIncrease() + statIncreaseValue );
							}else{
								self.player().addExp(statIncreaseValue);
							}



							self.visibleSection("content-area");
							$("#full-screen-notice").fadeOut(300, function(){
								$("#content-area").fadeIn(300);
								self.freezeMovement(false);
							});
						},
						doExpGain : doExpGain, //I'm sure there's a better way to do this, derp
						msg : msg,
						statToIncrease : self.player().data()[stat],
						statIncreaseValue : statIncreaseAmt,
					}
				);

			}

			self.visibleSection("full-screen-notice");
			$("#content-area").fadeOut(300, function(){
				self.fullScreenNotice(msg);
				self.fullScreenNoticeButtons(buttons);
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
			self.activeItem().canUpgrade(0);
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
			if( !Utils.isEmptyObject(item) ){
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

			if( ( item.canUpgrade == 1 && self.currentInventoryRightSide() == "equipment" ) || ( opts.canUpgrade && opts.canUpgrade == 1 ) ){
				self.activeItem().canUpgrade(1);
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

			if( alreadyEquippedItem != undefined && !Utils.isEmptyObject(alreadyEquippedItem) ){
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

		this.getEquipChangeText = function(){
			var actualItem = self.activeItem().actualItem();
			var changeString = "";

			if( actualItem instanceof Weapon){

				var existingMinDmg = 0;
				var existingMaxDmg = 0;
				var minDmgChange = 0;
				var maxDmgChange = 0;

				if( !Utils.isEmptyObject(self.player().getEquippedWeapon()) ){
					existingMinDmg = self.player().getEquippedWeapon().minDmg();
					existingMaxDmg = self.player().getEquippedWeapon().maxDmg();
					minDmgChange = actualItem.dmgMin() - existingMinDmg;
					maxDmgChange = actualItem.dmgMax() - existingMaxDmg;
				}

				changeString = (minDmgChange < 0 ? "-" : "+") + minDmgChange + " - " + (maxDmgChange < 0 ? "-" : "+") + maxDmgChange + " DMG";

			}else if( actualItem instanceof Armor){
				var existingArmorValue = 0;

				changeString = ( actualItem.armorValue() - existingArmorValue ) + " Armor";
			}

			return changeString;
		}

		this.buyActiveItem = function(game, event){

			var item = self.activeItem().actualItem();
			var moveFrom = self.currentContainer;
			var moveTo = self.player().data().inventory;

			var gold = moveTo.getItemByID("gold");

			if(gold && gold.qty() >= item.buyValue()){
				gold.qty( gold.qty() - item.buyValue() );

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
			var moveTo = self.player().data().inventory;

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

			var qty = qty || 1;
			var item = self.activeItem().actualItem();
			var moveFrom = self.player().data().inventory;
			var moveTo = self.currentContainer;

			var gold = self.getAvailableItemById("gold", "currency", (qty * item.sellValue()) );
			goldItem = new Item(gold);

			var newItem = Utils.cloneObject(item);
			newItem.qty(qty);

			var srcNumLeft = moveFrom.removeItem(item, qty);

			if(srcNumLeft == 0){
				self._resetActiveItem();
			}

			//Add to inventory
			moveTo.addItem(newItem);
			moveFrom.addItem(goldItem);
		}

		this.sellAllActiveItem = function(game, event){
			self.sellActiveItem(game, event, self.activeItem().actualItem().qty());
		}

		this.useActiveItem = function(game, event){

			var item = self.activeItem().actualItem();

			if(item.id == "biscuit_food" ){

				self._dropActiveItem(game, event, 1);

				self.player().data().hp( self.player().maxHp() );

				self.logMessage("Eating some fish biscuits restored you to full HP!", "player");
			}else if (item.id == "reset_stone"){

				self._dropActiveItem(game, event, 1);

				self.level().generateThisLevel(true);
				self.level().revealSquaresNearPlayer(self.player().data().skills().visionRange());
				self.level().drawMap();

				self.logMessage("The magical powers of the stone are expended, and it crumbles into dust before your very eyes. With a quick glance around, you see that nothing is as it was just a few moments before.", "player");
			}else if(item.id == "health_potion"){
				self.useHealthPotion();
				if( self.player().numPotionsAvailable() == 0 ){
					self._resetActiveItem();
				}
			}

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

		this.dropAllActiveItem = function(game, event){

			self._dropActiveItem(game, event, "all");

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

		this.useHealthPotion = function(){
			var numPotsLeft = self.player().removeItemFromInventory("health_potion", 1);
			var numHpToRestore = Math.ceil(self.player().maxHp() / 2);
			var potentialHp = self.player().data().hp() + numHpToRestore;
			if( potentialHp > self.player().maxHp() ){
				potentialHp = self.player().maxHp();
				numHpToRestore = self.player().maxHp() - self.player().data().hp();
			}

			self.player().data().hp( potentialHp );
			self.logMessage("Drinking a health potion restored " + numHpToRestore + " HP.", "player");
		}

		this.logMessage = function(msgText, cssClass){
			self.logMessages.unshift( {text: msgText, cssClass: cssClass || "info"} );
			$(".message-log").stop(false, true).effect("highlight", { color: "#BEBEBE" }, 400);
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
			return Object.keys(self.itemDataFile.items);
		}

		this._itemCanAppearForLevel = function(item, level){
			if( (item.minLevelRange <= level || item.minLevelRange == undefined) && (item.maxLevelRange > level || item.maxLevelRange == undefined) ){
				return true;
			}
			return false;
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

			itemData = self.getAvailableItemById("armor_scraps", "crafting", Utils.doRand(1,26));
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

			/*
			var itemData = self.getAvailableItemById("melee_weapon_01", "weapon", 1);
			if(itemData){
				var weap = new Weapon(itemData);
			}
			self.showContainerWithContents([weap]);
			*/


			var itemData = self.getAvailableItemById("health_potion", "consumables", 1);
			if(itemData){
				self.player().addItemToInventory( new Item(itemData) );
			}

			/*itemData = self.getAvailableItemById("body_armor_01", "armor", 1);
			if(itemData){
				self.player().data().inventory.addItem( new Armor(itemData) );
			}
			*/
		}

		this.armorTest = function(){
			var armorId;

			var availableArmor = self.getAvailableItemIdsByTypeForLevel("armor", self.level().levelNum());
			armorId = Utils.chooseRandomly( availableArmor );
			if(armorId == "shield_01" || armorId == "shield_02"){
				itemToAdd = self.getAvailableItemById(armorId, "shield", 1);
			}else{
				itemToAdd = self.getAvailableItemById(armorId, "armor", 1);
			}

			self.player().addItemToInventory( new Armor(itemToAdd) );
		}

		this.scrapTest = function(){

			itemToAdd = self.getAvailableItemById("weapon_scraps", "crafting", 400);
			self.player().addItemToInventory( new Item(itemToAdd) );
			itemToAdd = self.getAvailableItemById("armor_scraps", "crafting", 400);
			self.player().addItemToInventory( new Item(itemToAdd) );
		}

		this.goldTest = function(){

			itemToAdd = self.getAvailableItemById("gold", "currency", 2000);
			self.player().addItemToInventory( new Item(itemToAdd) );
		}

		self.init();

	};

	Game.prototype.constructor = Game;

	return Game;

/* TODOs
- Crafting, make new stuff?
- Implement class for Skills to get them more cohesive
- More obvious turn-based combat
- Dynamic loot generation (a la Diablo III)
- Give player persistent porta-stash as of lvl 5+? Maybe drops from boss or something; boss is triggered when player tries to exit the level
- Dynamic level scaling (better odds of items on higher levels, tougher enemies, etc.)
- More obvious when level up
- See at-a-glance if equipment is better or worse
- Equip items from merchant screen
- Break down weapons/armor into scrap
- Fix crafting button so text fits
- Scale loot with monster level
- Fix weapon instantiation error (merchant screen, lvl 5+ ?)
- Keyboard shortcuts for "continue" buttons
- Better loot from monsters than item squares
- Maybe tweak % chance of cooldowns refreshed vs trader vs other stuff
- Skill up scanning ability with usage/level-up
- Make armor reduce dmg by a percent rather than flat amount
- "Empty inventory" line should show up if the player's inventory contains only gold
- When cloning item, generate new uniqueID
- Add combat loots to message log
- Dynamic container name
*/

});
