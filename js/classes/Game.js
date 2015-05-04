define([
	'jquery',
	'knockout',
	'classes/Player',
	'classes/Level',
	'classes/Item',

	'Utils',
], function($, ko, Player, Level, Item){

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
				function(){
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
			console.log(gameData);
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
			}else{
				player = new Player();
				level = new Level({isActive : true});
				stateID = "start";
				self.levels.push(level);
				//stateID = "idle";
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
				type : "food",
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
			var newPos = self.level().movePlayer(direction, self.player().data().speed());

			self.lastActionMessage("");
			if(currentPos.x != newPos.x || currentPos.y != newPos.y){
				self.updateCooldowns();
				self.player().data().skillProgress().speed( self.player().data().skillProgress().speed() + 1 );
				
				self.level().revealSquaresNearPlayer(self.player().data().skills().visionRange());
				self.level().drawMap();
				
				var square = self.level().getSquare(newPos.x, newPos.y);
				
				if(square.notEmpty){

					square.setDone(true);
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
			console.log("Show inventory as modal, possibly?");
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
