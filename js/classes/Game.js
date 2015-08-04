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
	'classes/ItemCollection',
	'classes/Monster',
	'json!data/items.json',
	'json!data/monsters.json',
	'Utils',

	'jquery.animateNumbers'
], function($, ko, Player, Level, Item, Consumable, Weapon, Armor, Shield, ItemCollection, Monster, itemDataFile, monsterDataFile, Utils) {

	var $FULL_SCREEN_NOTICE_DIV = $(".full-screen-row");
	var $MAIN_CONTENT_DIV = $(".main-content-row");
	var $PLAYER_STAT_HEADER = $(".player-stat-row");
	var $MESSAGE_LOG = $(".log-area");
	var $SAVED_NOTICE = $(".saved-notice");
	var BASE_FADEOUT_SPEED = 600;
	var BASE_FADEIN_SPEED = 400;
	var FAST_FADEOUT_SPEED = 300;
	var FAST_FADEIN_SPEED = 300;

	function Game() {

		var self = this;

		this.itemDataFile = itemDataFile;
		this.monsterDataFile = monsterDataFile;

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
			scanSquares: function(){
				self.player().skillCooldowns().scanSquares(self.defaultCooldown);
				self.level().scanSquaresNearPlayer( self.player().skills().scanSquares() );
				self.level().drawMap();
				self.player().skillProgress().scanSquares( self.player().skillProgress().scanSquares() + 1 );
				self.logMessage("By holding very still and concentrating, you are able to thoroughly survey your surroundings.");

				//Quick-and-dirty
				if( self.player().skillProgress().scanSquares() > 0 && self.player().skillProgress().scanSquares() % 25 == 0 ){
					self.player().skillProgress().scanSquares(0);
					self.player().skills().scanSquares( self.player().skills().scanSquares() + 1 );
					self.logMessage("Your skill in scanning has increased.");
				}
			},
			findFood: function(){

				self.player().skillCooldowns().findFood(self.defaultCooldown);

				var findFoodSkill = self.player().skillProgress().findFood();

				//See if we get a high quality food item
				var isHighQuality = Utils.doBasedOnPercent({
					findFoodSkill : 1,
				}, function(){
					return 0;
				});

				var lowerBounds = (isHighQuality) ? 7 : 1;
				//Pick a number between 1 and 10 (OR 7 and 10)
				var consumableItem = self.getRandomScroungable(lowerBounds);

				self.player().skillProgress().findFood( self.player().skillProgress().findFood() + 1 );
				var message = "";

				var qty = self.addFoodToPlayerInventory(consumableItem);
				message = "You gracefully float to the bottom of the river and successfully scrounge up " + qty + " food using your kick-ass mouth feelers.";

				/*var percentages = {};
				var findPercent = self.player().skills().findFood();
				percentages[findPercent] = function(){
					var qty = self.addFoodToPlayerInventory(foodObj);
					message = "You gracefully float to the bottom of the river and successfully scrounge up " + qty + " fish biscuits using your kick-ass mouth feelers.";
				};
				Utils.doBasedOnPercent(percentages,
				function(rand){
					message = "You attempt to smoothly swim to the bottom of the riverbed, but you miscalculate the strength of your mighty fins and crash down on some fish biscuits, destroying them completely.";
				});*/

				self.logMessage(message);

				var skillIncrease = 0;

				if( self.player().skills().findFood() < 40 ){
					skillIncrease = Utils.doBasedOnPercent({
						70 : 1,
						30 : 2,
					});
				}else if( self.player().skills().findFood() < 80 ){
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
					self.player().skills().findFood( self.player().skills().findFood() + skillIncrease );

					self.logMessage("Your skill in finding food has increased to " + self.player().skills().findFood() + "/100");
				}
			}
		};
		
		this._goesFirst;
		this.wAction = function() { return self.movePlayerUp() };
		this.aAction = function() { return self.movePlayerLeft() };
		this.sAction = function() { return self.movePlayerDown() };
		this.dAction = function() { return self.movePlayerRight() };
		this.spcAction = function(){ return 1 };

		this.init = function(){
			self.initObservables();
			self.initGame();
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
				canDrop : ko.observable(0),
				canSell : ko.observable(0),
				canBuy : ko.observable(0),
				canUpgrade : ko.observable(0),
				moveDirection : ko.observable("right"),
				actualItem : ko.observable(undefined),
			});
			self.arrowKeysControlPlayerPos = ko.observable(true);
			self.rightColContent = ko.observable("equipment");
			self.freezeMovement = ko.observable(false);
			self.currentContainer = new ItemCollection(Array());
			self.currentEnemy = ko.observable(undefined);
			self.backButtonLabel = ko.observable("Back");
			self.isNew = ko.observable(true);
			self.eventSquareTypeOverride = ko.observable(undefined);

			//Keep track of what is displayed where
			self.fullScreenContent = ko.observable(undefined);
			/*self.leftColContent = ko.observable("player_controls");
			self.centerColContent = ko.observable("map_controls");
			self.rightColContent = ko.observable("map");*/
			self.leftColContent = ko.observable(undefined);
			self.centerColContent = ko.observable("fullscreen_content");
			self.rightColContent = ko.observable(undefined);

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
							css: defaultCss,
							text: "Use",
							click: self.useActiveItem
						});
					}

					if( self.activeItem().canBuy() && self.rightColContent() == "merchant" ){

						if( actualItem.qty() == 1 ){

							buttons.push({
								css: defaultCss + (( self.player().gp() < actualItem.buyValue() ) ? " disabled" : ""),
								text: "Buy (" + actualItem.buyValue() + " GP)",
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

							if( self.activeItem().moveDirection() == "left" ){ //We're moving from the container to the inventory

								if(actualItem.qty() > 1){

									if( actualItem.id != "gold" ){
										buttons.push({
											css: defaultCss,
											text: "<< Take 1x",
											click: self.dropActiveItem
										});
									}

									buttons.push({
										css: defaultCss,
										text: "<< Take All",
										click: self.dropAllActiveItem
									});

								}else if(actualItem.qty() == 1){
									buttons.push({
										css: defaultCss,
										text: "<< Take",
										click: self.dropActiveItem
									});
								}

							}else if( self.activeItem().moveDirection() == "right" ){ //We're moving from the inventory to the container

								if( actualItem.id != "gold" ){

									if( actualItem.qty() > 1 ){

										buttons.push({
											css: defaultCss,
											text: "Put 1x >>",
											click: self.dropActiveItem
										});

										buttons.push({
											css: defaultCss,
											text: "Put All >>",
											click: self.dropAllActiveItem
										});

									}else if( actualItem.qty() == 1 ){

										buttons.push({
											css: defaultCss,
											text: "Put >>",
											click: self.dropActiveItem
										});

									}

								}

							}

						}else { //We're dropping something

							if(actualItem.qty() > 1){

								buttons.push({
									css: defaultCss,
									text: "Drop 1x",
									click: self.dropActiveItem
								});

								buttons.push({
									css: defaultCss,
									text: "Drop All",
									click: self.dropAllActiveItem
								});

							}else if(actualItem.qty() == 1){
								buttons.push({
									css: defaultCss,
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
				self.arrowKeysControlPlayerPos(gameData.arrowKeysControlPlayerPos);
				self.freezeMovement(gameData.freezeMovement);
				self.backButtonLabel(gameData.backButtonLabel);
				if(gameData.currentEnemy){
					self.currentEnemy(new Monster(gameData.currentEnemy));
				}

				var itemArray = Array();
				for(i = 0; i < gameData.currentContainer.length; i++){
					if(gameData.currentContainer[i]._classNameForLoad){
						itemArray.push(  eval("new " + gameData.currentContainer[i]._classNameForLoad +"(gameData.currentContainer[i])")  );
					}else{
						itemArray.push( new Item(gameData.currentContainer[i]) );
					}
				}
				self.currentContainer.items(itemArray);

			}else{

				player = new Player( {str: 2, dex: 2, end: 2} );
				level = new Level({ genOpts : { quadsWithPotentialEntrances : [] }, isActive : true });
				self.levels.push(level);

			}

			//Whether this is a new or existing game, make sure we have the next level preloaded
			var newLevel = self.level().generateNextLevelIfNotSet();

			if( newLevel ){
				self.levels.push(newLevel);
			}

			self.player(player);

			self.level().revealSquaresNearPlayer(player.skills().visionRange());
			self.level().drawMap();

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

		this.loadFromData = function(gameData){
			
			if(gameData == undefined){
				return false;
			}

			$.when($MAIN_CONTENT_DIV.add($PLAYER_STAT_HEADER).add($MESSAGE_LOG).fadeOut(FAST_FADEOUT_SPEED)).done(function(){
				self.initGame(gameData);
			});
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
					self.player().skillProgress().speed( self.player().skillProgress().speed() + 1 );

					self.level().scanSquaresNearPlayer(0);
					self.level().revealSquaresNearPlayer(self.player().skills().visionRange());
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
			$.each(self.player().skillCooldowns(), function(skill, cooldown){
				var cooldownValue = cooldown();
				if(cooldownValue > 0){
					cooldown(cooldownValue - 1);
				}
			});
		}

		this.toggleInventory = function(){

			self.freezeMovement(true);
			self.manageTransitionToView("mainscreen","equipment");
			
		}

		this.showContentArea = function(){
			
			self.manageTransitionToView("equipment","mainscreen", function(){
				self.freezeMovement(false);
			});

		}

		self.showDamage = function(which){
			if(which == "enemy"){
				$(".combat.enemy .hp").stop(false, true).effect("highlight", { color: "#FF3939" }, 800);
			}else if(which == "player"){
				$(".combat.player .hp").stop(false, true).effect("highlight", { color: "#FF3939" }, 800);
			}
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
					{ level : self.level().levelNum(), fullyDynamicStats : 1 }
				)
			));

			//Reset our "goes first" tracker
			self._goesFirst = undefined;
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

		this.playerAttacks = function(game, event){
			self.doCombatRound("basic","attack");
		}

		this.doCombatRound = function(playerAction, playerActionType){

			var goesFirst = self.getGoesFirst();
			var attacker = (goesFirst == "player") ? self.player() : self.currentEnemy() ;
			var defender = (goesFirst == "player") ? self.currentEnemy() : self.player() ;

			var monsterAttackName = Utils.doBasedOnPercent(
				self.currentEnemy().availableAttacks
			);
			var monsterAction = {
				actionName : monsterAttackName,
				actionType : "attack"
			};
			var playerAction = {
				actionName : playerAction,
				actionType : playerActionType
			};

			var action = (goesFirst == "player") ? playerAction : monsterAction ;

			//Attacker does something (optionally) to the defender, and UI is updated accordingly
			attacker.takeCombatAction(action, defender, self);

			//If defender is alive, defender does something (optionally) to the attacker, and UI is updated accordingly
			if(!defender.isDead()){

				action = (goesFirst == "player") ? monsterAction : playerAction ;
				defender.takeCombatAction(action, attacker, self);

			}

			if( self.player().isDead() ){
				self.logMessage("You were defeated in combat! Better luck next time...", "combat");
			}

			if( self.currentEnemy().isDead() ){
				self.player().addExp(self.currentEnemy().expValue());
				self.logMessage("You defeated the enemy! You gain " + self.currentEnemy().expValue() + " XP!", "combat");

				if( self.player().hasLeveledUp() ){
					self.player().hasLeveledUp(false);
					self.logMessage("You leveled up! Your stats have improved accordingly.", "combat");
				}
			}

		}

		this.registerAttack = function(attacker, defender, attackResults){

			var combatLogString = "";
			var animateSection = "";

			if(defender instanceof Monster){
				combatLogString = "The enemy is";
				animateSection = "enemy";
			}else if(defender instanceof Player){
				combatLogString = "You are";
				animateSection = "player";
			}

			if(attackResults.hitType != 'miss'){
				self.showDamage(animateSection);
				self.logMessage(combatLogString + ( attackResults.hitType == 'crit' ? ' critically' : '' ) + " struck for " + attackResults.actualDmg + " points of damage! An additional " + (attackResults.attemptedDmg - attackResults.actualDmg) + " points were absorbed by armor.", "combat");
			}else{
				if(defender instanceof Monster){
					self.logMessage('You try to strike the enemy, but miss!','combat');
				}else if(defender instanceof Player){
					self.logMessage('The enemy tries to strike you, but misses!','combat');
				}
			}

		}

		this.lootEnemy = function(){
			self.freezeMovement(true);

			var numLoots = 1 + Math.floor(self.level().levelNum() / 4);
			var newLootItem;
			self.currentContainer.removeAll(); //Make sure it's empty

			for(var i=0; i < numLoots; i++){
				newLootItem = self.generateRandomLootItem("monster");
				self.currentContainer.addItem(newLootItem);
			}

			self.manageTransitionToView("combat","container");
		}

		this.leaveCombat = function(){
			self.manageTransitionToView("combat","mainscreen", function(){ self.freezeMovement(false); });
		}

		this.hideModal = function(viewModel, event){
			self.modalIsShown = false;
			$('#myModal').modal('hide');
			$('#myModal .modal-content').hide();
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
				self.player().inventory.addItem( self.currentContainer.items()[i] );
			}
			self.currentContainer.removeAll();
			self._resetActiveItem();
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

			var numJustAdded = self.player().addItemToInventory(newItem);

			if(numJustAdded != false && numJustAdded > 0){
			//if(self.player().inventorySlotsAvailable() > -1){
				self.logMessage("Inside " + container + " you find " + newItem.qty() + " " + newItem.name, "item");
				self.freezeMovement(false);
			}else{
				self.logMessage("Inside " + container + " you find " + newItem.qty() + " " + newItem.name + ", but your inventory is currently full", "item");
				self.showContainerWithContents([newItem]);
			}
		}

		this.generateRandomLootItem = function(lootSet){

			lootSet = lootSet || "standard";
			var itemClass = "item";
			var itemToAdd = {};
			var qtyCoefficient = Math.ceil( self.level().levelNum() / 3 );
			var possibleItemTypes = {};
			var canAdd = true;

			if( lootSet == "monster" ){
				qtyCoefficient = qtyCoefficient * 1.5;
				possibleItemTypes = {
					40 : "gold",
					35 : "misc",
					25 : "gear",
				};
			}else if( lootSet == "trader" ){
				possibleItemTypes = {
					50 : [
						"misc",
						"gear",
					]
				};
			}else{
				possibleItemTypes = {
					40 : "gold",
					35 : "misc",
					25 : "gear",
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

				goldAmt = Math.ceil(goldAmt * qtyCoefficient);

				if(lootSet == "monster"){
					goldAmt = Math.round(goldAmt * self.currentEnemy().lootCoefficient());
				}

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

				var scrapQty = Math.ceil(Utils.doRand(10,36) * qtyCoefficient);
				if(lootSet == "monster"){
					scrapQty = Math.round(scrapQty * self.currentEnemy().lootCoefficient());
				}

				if( miscType == "armor" ){

					itemToAdd = self.getAvailableItemById("armor_scraps", "crafting", scrapQty);

				}else if( miscType == "weapon" ){

					itemToAdd = self.getAvailableItemById("weapon_scraps", "crafting", scrapQty);

				}else if( miscType == "stone" ){

					itemToAdd = self.getAvailableItemById("reset_stone", "consumables", 1);

				}else if( miscType == "food" ){

					var consumableType = Utils.doBasedOnPercent({
						25 : "health_potion",
						75 : "food",
					});

					if(consumableType == "health_potion"){
						foodQty = Utils.doRand(1, (1 + Math.floor(self.level().levelNum() / 2) ));
						if(lootSet == "monster"){
							foodQty = Math.round(foodQty * self.currentEnemy().lootCoefficient());
						}
						itemToAdd = self.getAvailableItemById(consumableType, "consumables", foodQty);
					}else{
						itemToAdd = self.getRandomScroungable(10);
					}

					itemClass = "consumable";
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
					availableArmor = availableArmor.concat( self.getAvailableItemIdsByTypeForLevel("shield", self.level().levelNum()) );
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

				itemToAdd.fullyDynamicStats = 1;
				itemToAdd.level = self.level().levelNum();
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
			}else{
				newItem = itemToAdd;
			}

			return newItem;

		}

		this.squareCombatAction = function(){
			self.freezeMovement(true);

			//Generate "enemy appears" message
			var enemyMsg = Utils.doBasedOnPercent({
				25 : [
					"Suddenly, swimming out of the murky depths, a foe appears!",
					"A shadow looms over you. You turn around swiftly; it's an enemy!",
					"An enemy swims up to you, and attacks!",
					"You charge headfirst into an enemy!",
				]
			});

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

			var eventType = Utils.doBasedOnPercent({
				30 : "trainer",
				40 : "trader",
				15 : "cooldown",
				10 : "stat",
				5 : "inventory",
			});

			if( self.eventSquareTypeOverride() !== undefined ){
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

				var trainSkillString = Utils.chooseRandomly(
					Array(
						"findFood",
						"scanSquares"/*,
						"str",
						"dex",
						"end",
						"speed",
						"hp"*/
					)
				);
				var trainSkill;
				var trainSkillAmt = 1;
				var trainSkillMax = false;
				var trainSkillSuccessDesc = "";
				var skillOrStat = "stat";

				text = "You encounter a wise old hermit crab who offers to teach you how to ";

				if(trainSkillString == "findFood"){
					text += "get better at scrounging for food";
					trainCost = (self.player().skills().findFood() + 1) * 10;
					trainSkill = self.player().skills().findFood;
					trainSkill = "findFood";
					trainSkillSuccessDesc = "skill in finding food";
					skillOrStat = "skill";
				}else if(trainSkillString == "scanSquares"){
					text += "get better at surveying your surroundings";
					trainCost = (self.player().skills().scanSquares() * 1000);
					trainSkill = self.player().skills().scanSquares;
					trainSkill = "scanSquares";
					trainSkillSuccessDesc = "scan range";
					skillOrStat = "skill";
				}else if( trainSkillString == "str" ){
					text += "become stronger";
					trainSkill = self.player().str;
					trainSkill = "str";
					trainCost = 800;
					trainSkillSuccessDesc = "strength (STR)";
				}else if( trainSkillString == "dex" ){
					text += "become more agile";
					trainSkill = self.player().dex;
					trainSkill = "dex";
					trainCost = 800;
					trainSkillSuccessDesc = "dexterity (DEX)";
				}else if( trainSkillString == "end" ){
					text += "become more resilient";
					trainSkill = self.player().end;
					trainSkill = "end";
					trainCost = 800;
					trainSkillSuccessDesc = "endurance (END)";
				}else if( trainSkillString == "speed" ){
					text += "become quicker";
					trainSkill = self.player().speed;
					trainSkill = "speed";
					trainCost = 800;
					trainSkillSuccessDesc = "speed (SPD)";
				}else if( trainSkillString == "hp" ){
					text += "become tougher";
					trainSkill = self.player().baseHp;
					trainSkill = "baseHp";
					trainCost = 800;
					trainSkillAmt = 10;
					trainSkillSuccessDesc = "max HP bonus";
				}

				text += " for " + trainCost + " GP";

				buttons = new Array(
					{
						title : "Buy (" + trainCost + " GP)",
						action : function(){

							var gold = self.player().inventory.getItemByID("gold");
							var trainSkill;
							if(this.vars.skillOrStat == 'skill'){
								trainSkill = self.player().skills()[this.vars.trainSkill];
							}else if(this.vars.skillOrStat == 'stat'){
								trainSkill = self.player().data()[this.vars.trainSkill];
							}
							gold.qty( gold.qty() - this.vars.trainCost );

							trainSkill( trainSkill() + this.vars.trainSkillAmt );

							self.logMessage("Your " + this.vars.trainSkillSuccessDesc + " has increased to " + trainSkill() + ( this.vars.trainSkillMax ? "/" + this.vars.trainSkillMax : "" ));

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
					self.player().skillCooldowns().findFood(0);
					self.player().skillCooldowns().scanSquares(0);
					self.logMessage(text);
				};

				text = "You take a moment to catch your breath and play FishVille on your phone, and become immediately engrossed in the game. When you decide to resume your journey, you realize that several hours have passed. All your cooldowns are instantly finished.";
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

				if( stat == "str" ){
					text = "You find your path blocked by a large rock. Instead of simply swimming around or over it, you decide to try and move it. After an hour of laborious work, you manage to move it out of the way. The experience empowers you, permanently giving you +1 STR.";
				}else if( stat == "dex" ){
					text = "While swimming along, you suddenly realize that you are about to crash right into a sharp metal hook just floating in the water in front of you. With quick thinking and maneuvering, you manage to barrel-roll to the side and avoid it.  As you cruise past, you also snag a tasty-looking worm that someone apparently left just hanging on the hook. As you munch the delicious worm, you think you can probably figure out how to better avoid such water hazards in the future. Gain +1 DEX."
				}else if( stat == "end" ){
					text = "A passing trout challenges you to an impromptu fin-wrestling contest. The ensuing match takes a full hour before your strength finally gives out and you are forced to concede victory to the other fish. Panting and visibly just as exhausted as you and thoroughly impressed with your determination, the trout tells you one of his fin-wrestling secrets. You gain +1 END.";
				}else if( stat == "exp" ){
					statIncreaseAmt = Math.ceil( self.player().expRequiredForNextLevel() / 2 );
					text = "You come across a water-logged journal lodged between two rocks. Nonchalantly flippering through the pages, you encounter some surprisingly useful advice. Gain " + statIncreaseAmt + " EXP.";
				}

				afterLoad = function(){
					if(stat != "exp"){
						self.player().data()[stat]( self.player().data()[stat]() + statIncreaseAmt );
					}else{
						self.player().addExp(statIncreaseAmt);
					}
					self.logMessage(text);
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

			self.freezeMovement(true);

			if(self.level().nextLevelID() == undefined){

				var newLevel = self.level().generateNextLevelIfNotSet();

				if( newLevel ){
					self.levels.push(newLevel);
				}

			}

			var nextLevel = self.getLevelById( self.level().nextLevelID() );
			var currentLevel = self.level();

			self.manageTransitionToView("mainscreen","mainscreen", function(){
				self.freezeMovement(false);
			}, function(){
				nextLevel.isActive(true);
				currentLevel.isActive(false);
				nextLevel.setPlayerPos( nextLevel.entranceSquare()[0], nextLevel.entranceSquare()[1] );
				nextLevel.revealSquaresNearPlayer(self.player().skills().visionRange());
				self.level().scanSquaresNearPlayer();
				nextLevel.drawMap();
			});

		}

		this.squareEntranceAction = function(){

			self.freezeMovement(true);

			//This is unlikely, but we'd better account for it just to be safe
			if(self.level().prevLevelID() == undefined){

				var newLevel = self.level().generatePrevLevelIfNotSet();

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
				prevLevel.revealSquaresNearPlayer(self.player().skills().visionRange());
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
			self._setAsActiveItem({ moveDirection : "left", canEquip : 0, canUse : 1, showQty: true}, item, e);
		}

		this.setInventoryItemAsActiveItem = function(item, e){
			self._setAsActiveItem({ moveDirection : "right" }, item, e);
		}

		this.setEquipmentItemAsActiveItem = function(item){
			if( !Utils.isEmptyObject(item) ){
				item.isEquipped(true);
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
			if( type == "consumables" || (opts.canUse && opts.canUse == 1) ){
				self.activeItem().canUse(1);
			}else if ( (opts.moveDirection == "right" && (type == "armor" || type == "weapon" || type == "shield")) || (opts.canEquip && opts.canEquip == 1) ){
				self.activeItem().canEquip(1);
			}else if ( (self.rightColContent() == "equipment" && opts.moveDirection == "left" && (type == "armor" || type == "weapon" || type == "shield")) || (opts.canUnEquip && opts.canUnEquip == 1) ){
				self.activeItem().canUnEquip(1);
			}

			if( ( item.canBreakdown == 1 && (opts.moveDirection == "right" || self.rightColContent() == "equipment" ) ) || ( opts.canBreakdown && opts.canBreakdown == 1 ) ){
				self.activeItem().canBreakdown(1);
			}

			if( (opts.moveDirection == "left" && self.rightColContent() == "equipment") || (opts.canDrop && opts.canDrop == 0) ){
				self.activeItem().canDrop(0);
			}else if( opts.moveDirection == "left" && self.rightColContent() == "container" || (opts.canDrop && opts.canDrop == 1) ){
				self.activeItem().canDrop(1);
			}else if( type != "currency" || (opts.canDrop && opts.canDrop == 1) ){
				self.activeItem().canDrop(1);
			}

			if( ( opts.moveDirection == "left" && self.rightColContent() == "merchant" ) || ( opts.canBuy && opts.canBuy == 1 ) ){
				self.activeItem().canBuy(1);
			}else if( ( opts.moveDirection == "right" && self.rightColContent() == "merchant" ) || ( opts.canSell && opts.canSell == 1 ) ){
				self.activeItem().canSell(1);
			}

			if( ( item.canUpgrade == 1 && (opts.moveDirection == "right" || self.rightColContent() == "equipment" ) ) || ( opts.canUpgrade && opts.canUpgrade == 1 ) ){
				self.activeItem().canUpgrade(1);
			}

			self.activeItem().moveDirection(opts.moveDirection);

			self.activeItem().actualItem(item);


		}

		this.equipActiveItem = function(game, event){

			var item = self.activeItem().actualItem(),
				type = item.type;

			var alreadyEquippedItem;

			if(type == "weapon"){
				alreadyEquippedItem = self.player().equipWeapon(item);
			}else if(type == "shield"){
				alreadyEquippedItem = self.player().equipShield(item);
			}else if(type == "armor"){
				alreadyEquippedItem = self.player().equipArmor(item);
			}

			self.player().inventory.removeItem(item);

			if( alreadyEquippedItem != undefined && !Utils.isEmptyObject(alreadyEquippedItem) ){
				//Skip the normal slot-checking logic to account for 2H weaps or 1H + shield combos
				self.player().inventory.addItem(alreadyEquippedItem);
				var equippedWeapon = self.player().getEquippedWeapon();
			}

			if( type == "weapon" && item.handsRequired == 2){ //We just equipped a 2H weapon, so unequip whatever shield we have equipped
				var existingItem = self.player().getEquippedShield();
				if( !Utils.isEmptyObject(existingItem) ){
					self.player().unEquipShield();
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
			}

			self.player().inventory.addItem(item);
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
					existingMinDmg = self.player().getEquippedWeapon().dmgMin();
					existingMaxDmg = self.player().getEquippedWeapon().dmgMax();
				}

				minDmgChange = actualItem.dmgMin() - existingMinDmg;
				maxDmgChange = actualItem.dmgMax() - existingMaxDmg;

				minDmgChange = ( minDmgChange < 0 ) ? "<span class='negative'>" + minDmgChange + "</span>" : ( minDmgChange > 0 ? "<span class='positive'>+" + minDmgChange + "</span>" : "+" + minDmgChange ) ; //show 0 change as "+0"

				maxDmgChange = ( maxDmgChange < 0 ) ? "<span class='negative'>" + maxDmgChange + "</span>" : ( maxDmgChange > 0 ? "<span class='positive'>+" + maxDmgChange + "</span>" : "+" + maxDmgChange ) ; //show 0 change as "+0"

				changeString = minDmgChange + " - " + maxDmgChange + " DMG";

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
			}

			return changeString;
		}

		this.salvageActiveItem = function(game, event){

			var item = self.activeItem().actualItem(),
				itemToAdd,
				scrapQty = (item.level() * 50) + (item.numUpgradesApplied() * 50);

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
			self.logMessage("You gain " + scrapQty + " scraps from salvaging the item.","crafting");

		}

		this.buyActiveItem = function(game, event){

			var item = self.activeItem().actualItem();
			var moveFrom = self.currentContainer;
			var moveTo = self.player().inventory;

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

			var qty = qty || 1;
			var item = self.activeItem().actualItem();
			var moveFrom = self.player().inventory;
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
			var srcNumLeft;

			if (item.id == "reset_stone"){

				srcNumLeft = self.removeActiveItem(game, event, 1);

				if(srcNumLeft == 0){
					self._resetActiveItem();
				}

				self.level().generateThisLevel(true);
				self.level().revealSquaresNearPlayer(self.player().skills().visionRange());
				self.level().drawMap();

				self.logMessage("The magical powers of the stone are expended, and it crumbles into dust before your very eyes. " +
								"With a quick glance around, you see that nothing is as it was just a few moments before.", "player");

			}else if(item.id == "health_potion"){

				//TODO: Make this handle the case of consuming a potion in combat as well as outside of combat from either the inventory OR a container!
				var numPotsLeft = self.player().removeItemFromInventory("health_potion", 1);

				self.player().restoreHealth(0.5, 1);

				self.logMessage("Drinking a health potion restored " + numHpToRestore + " HP.", "player");

				if( numPotsLeft == 0 ){
					self._resetActiveItem();
				}
			}else if(item.type == "consumables"){

				srcNumLeft = self.removeActiveItem(game, event, 1);

				if(srcNumLeft == 0){
					self._resetActiveItem();
				}

				self.player().restoreHealth((item.quality() / 100), 1);

				self.logMessage("Eating some food restored some of your HP!", "player");

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

			srcCollection = self.player().inventory;

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

		this.showSkillsArea = function(){
			self.manageTransitionToView("mainscreen","skills");
		}

		this.manageTransitionToView = function(fromArea, toArea, afterTransitionCallback, extraMidTransitionCallback){

			var midTransitionCallback;
			extraMidTransitionCallback = (extraMidTransitionCallback !== undefined && typeof extraMidTransitionCallback === 'function') ? extraMidTransitionCallback : function(){};

			if(toArea == "equipment"){
				//For now it's assumed that one can only get here from Main Screen...
				midTransitionCallback = function(){
					self.leftColContent("inventory");
					self.centerColContent("item_desc");
					self.rightColContent("equipment");
				}
			}else if(toArea == "mainscreen"){
				//Make sure we capture this value now, in case it changes later
				var isNew = self.isNew();
				midTransitionCallback = function(){
					self.leftColContent("player_controls");
					self.centerColContent("map_controls");
					self.rightColContent("map");

					self._resetActiveItem();
					self.currentContainer.removeAll();
					self.backButtonLabel("Back");

					if(isNew == true){
						$MESSAGE_LOG.fadeIn(BASE_FADEIN_SPEED);
						$PLAYER_STAT_HEADER.fadeIn(BASE_FADEIN_SPEED);
					}
				}
			}else if(toArea == "combat"){
				//For now it's assumed that one can only get here from Fullscreen Message...
				midTransitionCallback = function(){
					self.leftColContent("combat_player");
					self.centerColContent("combat_buttons");
					self.rightColContent("combat_enemy");
				}
			}else if(toArea == "container"){
				midTransitionCallback = function(){
					self.leftColContent("inventory");
					self.centerColContent("item_desc");
					self.rightColContent("container");
				}
			}else if(toArea == "merchant"){
				//For now it's assumed that one can only get here from Fullscreen Message...
				midTransitionCallback = function(){
					self.leftColContent("inventory");
					self.centerColContent("item_desc");
					self.rightColContent("merchant");
				}
			}else if(toArea == "fullscreen"){
				//We're assuming that the fullscreen content has already been set...
				midTransitionCallback = function(){
					self.leftColContent(undefined);
					self.centerColContent("fullscreen_content");
					self.rightColContent(undefined);
				}
			}

			self.replaceMainScreenContent(function() { midTransitionCallback(); extraMidTransitionCallback(); }, afterTransitionCallback);
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

		this.loadGame = function(){
			self.loadFromData(JSON.parse(localStorage.getItem("saveData"), function(k, v){
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

		this.getExportData = function(){
			var exportObj = {
				player 				: self.player().getExportData(),
				levels 				: Array(),
				leftColContent 		: self.leftColContent(),
				centerColContent 	: self.centerColContent(),
				rightColContent		: self.rightColContent(),
				fullScreenContent 	: self.fullScreenContent(),
				isNew				: self.isNew(),
				//logMessages			: Array(),
				logMessages			: self.logMessages(),
				arrowKeysControlPlayerPos : self.arrowKeysControlPlayerPos(),
				freezeMovement		: self.freezeMovement(),
				backButtonLabel : self.backButtonLabel(),
				currentEnemy	: self.currentEnemy() ? self.currentEnemy().getExportData() : undefined,
				currentContainer : self.currentContainer.getExportData()
			}

			for(i=0; i < self.levels().length; i++){
				var thisLevel = self.levels()[i];

				exportObj.levels.push(thisLevel.getExportData());
			}

			/*for(i=0; i < self.logMessages().length; i++){
				var message = self.logMessages()[i];
				exportObj.logMessages.push(message);
			}*/

			/*for(i=0; i < self.currentContainer.items().length; i++){
				var item = self.currentContainer.items()[i];

				exportObj.currentContainer.items().push(item.getExportData());
			}*/

			return JSON.stringify(exportObj, function(k, v){
				if(typeof v === 'function'){
					return v.toString();
				}else{
					return v;
				}
			});
		}

		this.getRandomScroungable = function(lowerBounds){
			var quality = Utils.doRand(lowerBounds, 11);
			quality = quality * 10;
			var array = self.itemDataFile.items.scroungables[quality];
			var arrayKeys = Object.keys(array);
			var foodKey = Utils.chooseRandomly( arrayKeys );
			var foodObj = self.itemDataFile.items.scroungables[quality][foodKey];

			var qty = Math.floor(self.player().skills().findFood() / 10);
			var descString = (foodObj.quality < 40) ? "small" : ( foodObj.quality < 70 ? "decent" : "large" );
			descString = "Restores a " + descString + " amount of health when consumed";
			var itemData = $.extend(
				foodObj,
				{ qty : qty, type : "consumables", desc : descString }
			)
			return new Consumable(itemData);
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

		this.testItem = function(){

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
				self.player().inventory.addItem( new Armor(itemData) );
			}
			*/
		}

		this.testArmor = function(){
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

		this.testWeapon = function(){
			var weaponId;

			var availableWeapons = self.getAvailableItemIdsByTypeForLevel("weapon", self.level().levelNum());
			weaponId = Utils.chooseRandomly( availableWeapons );
			itemToAdd = self.getAvailableItemById(weaponId, "weapon", 1);

			self.player().addItemToInventory( new Weapon(itemToAdd) );

			itemToAdd = self.getAvailableItemById("melee_weapon_02", "weapon", 1);
			self.player().inventory.addItem( new Weapon(itemToAdd) );

			itemToAdd = self.getAvailableItemById("melee_weapon_04", "weapon", 1);
			self.player().inventory.addItem( new Weapon(itemToAdd) );

			itemToAdd = self.getAvailableItemById("shield_02", "shield", 1);
			self.player().inventory.addItem( new Shield(itemToAdd) );
		}

		this.testScrap = function(){

			itemToAdd = self.getAvailableItemById("weapon_scraps", "crafting", 400);
			self.player().addItemToInventory( new Item(itemToAdd) );
			itemToAdd = self.getAvailableItemById("armor_scraps", "crafting", 400);
			self.player().addItemToInventory( new Item(itemToAdd) );
		}

		this.testGold = function(){

			itemToAdd = self.getAvailableItemById("gold", "currency", 2000);
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

		this.testScaledWeapon = function(){
			var weaponId;

			itemToAdd = self.getAvailableItemById("melee_weapon_02", "weapon", 1);
			itemToAdd.fullyDynamicStats = 1;
			itemToAdd.level = self.level().levelNum();
			self.player().inventory.addItem( new Weapon(itemToAdd) );

			itemToAdd = self.getAvailableItemById("melee_weapon_05", "weapon", 1);
			itemToAdd.fullyDynamicStats = 1;
			itemToAdd.level = self.level().levelNum();
			self.player().inventory.addItem( new Weapon(itemToAdd) );
		}

		this.testInventoryCapacity = function(){

			console.log();

			for(var i=0; i < self.player().inventoryMaxSlots(); i++){
				var newLootItem = self.generateRandomLootItem();
				self.player().addItemToInventory( newLootItem, 1 );
			}

		}

		this.testVisionRange = function(){
			self.level().scanSquaresNearPlayer( 10 );
			self.level().drawMap();
		}

		this.skipToGrid = function(){
			self.manageTransitionToView("fullscreen","mainscreen");
			self.isNew(false);
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

	return Game;

/* TODOs

Feeback/Ideas/Thoughts
- Perks! (unlock add'l abilities in combat; no/reduced cooldown on scan; better odds/always find better/best kind of food; better merchant prices when buying/selling; better odds of finding quality food; )
- Choose class (i.e. - perk) on start
- Choose perk on levelup
- Purple square potions (drink and the next purple square will be an "x" type)
- Add chance to crit!
- Level-bosses (with a fight or flee question first) which must be defeated before advancing to the next level; always have an exceptional piece of gear as loot
- +1/2/3/etc. weapons? Maybe have some kind of defined "quality" measurements
- Gambling! X gold for Y nice thing, Z chance of success
- Make lvl one slightly more challenging
- Balance item value + dmg/armor + num salvage
- As long as you can see one square away, vision range doesn't especially matter
- Make repetitive actions less obvious, or less repetitive
- Reveal squares after % of level experienced (maybe)
- Either hide contents of squares except when scanned -- or, make hostile squares move around
- More consistent gold from monsters?
- Maaaaybe make salvage currency?
- Maybe decrease droprate of potions
- Increase droprate of fish biscuits
- Maybe don't make biscuits a full heal -- possibly provide ability to "use x at once"
- Allow equip from loot container -- maybe (or make it more obvious that inventory can be temporarily overloaded)
- Either remove "scan" or make it more useful
- Show dmg taken next to player/monster HP counter
- Make food quality independent of name (e.g. - you can have poor quality scampi or medium or whatever)
- Let monster archetypes use specified attacks
- Have some attack-specific stats as well as entity-specific stats
- Let food be used from loot screen

Bugs
- Intermittent issue with item squares?
- When lvl 1 is regenerated, it includes an entrance square
- "Scrounge up false food with mouth feelers"
- Free food sold at merchants


New Features/Game Improvements
- Play sound on level up?
- Minor sound FX on square events
- Give player persistent porta-stash as of lvl 5+? Maybe drops from boss or something; boss is triggered when player tries to exit the level
- Attacks to add:
Flurry of Blows: 3x attacks, 30% chance to hit, 200% of normal dmg, 3 rd cooldown
Mighty Strike: 1x attack, 50% chance to hit, 300% of normal dmg, 2 rd cooldown
Gut Punch: 1x attack, 50% chance to hit, 50% of normal dmg, stuns for two rounds (effective immediately if applicable), 2 rd cooldown
- Allow certain weapons to be wielded 1H or 2H (for more dmg)

Code Improvements
- Create EquippableItem subclass or something
- Implement class for Skills to get them more cohesive
- Maybe only redraw relevant sections of the map? i.e. - player vision/scan radius
- Standardize the way objects are saved
- Remove "data" layer from player

UI Improvements
- Color code combat log messages
- More obvious when level up
- Dynamic container name
- Keyboard shortcuts for "continue" buttons
- Add combat loots to message log
- More obvious turn-based combat (visual delay between parts of a round?)
- Allow for a variable number of items to be purchased from merchant
- Show that a 2H and a shield can't be equipped at the same time
- Show that a weapon will take up x number of backpack slots
- Show that if a 2H weapon is equipped, it will also reduce Arm by X if a shield is currently equipped
- Make it more obvious when active item is equipped (so accidental salvage isn't as easy)

*/

});
