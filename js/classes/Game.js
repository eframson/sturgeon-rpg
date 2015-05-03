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
				text: "<p>You are in an egg, nestled in a layer of rocks at the bottom of a creek bed. It is a comfortable 16 degrees Celsius. You've been in here for a week already. You are bored.</p>",
				buttons: [
					[
						{
							text: "Let's bust outta here!",
							action: function(){ self.setState("d1"); }
						},
					],
				],
				location: "Unknown",
				hidePlayerData: true,
				hideMap: true,
			},
			d1: {
				text: "<p>With a loud crack, you emerge from your egg like the Kool-Aid man through a brick wall.</p>",
				buttons: [
					[
						{
							text: "OH YEAH!!!",
							action: function(){ self.setState("d2"); }
						},
					],
				],
				location: "Unknown",
				hidePlayerData: true,
				hideMap: true,
			},
			d2: {
				text: "<p>You feel cool water rush past your face like a refreshing breeze.</p>",
				buttons: [
					[
						{
							text: "Continue",
							action: function(){ self.setState("idle"); }
						},
					],
				],
				location: "Unknown",
				hidePlayerData: true,
				hideMap: true,
			},
			idle: {
				beforeChange: function(){

				},
				afterRender : function(){
					self.level().drawMap();
				},
				text: "<p>You decide to...</p>",
				buttons: [
					[
						{
							text: function(){
								var text = "Look for food";
								if(self.player().data().skillCooldowns().findFood()){
									text += " (cooldown: " + self.player().data().skillCooldowns().findFood() + ")";
								}
								return text;
							},
							action: function(){
								self.playerActions.checkForFood();
							},
							css: function(){
								return {
									disabled : self.player().data().skillCooldowns().findFood() > 0
								}
							},
						},
						{
							text: function(){
								var text = "Check for predators";
								if(self.player().data().skillCooldowns().findEnemies()){
									text += " (cooldown: " + self.player().data().skillCooldowns().findEnemies() + ")";
								}
								return text;
							},
							action: function(){
								self.playerActions.checkForEnemies();
							},
							css: function(){
								return {
									disabled : self.player().data().skillCooldowns().findEnemies() > 0
								}
							},
						},
					],
				],
				location: "Midstream",
			},
		};

		this.defaultCooldown = 10;
		this.playerActions = {
			checkForEnemies: function(){
				self.player().data().skillCooldowns().findEnemies(self.defaultCooldown);
				self.level().scanNearPlayer( self.player().data().skills().findEnemies() );
				self.player().data().skillProgress().findEnemies( self.player().data().skillProgress().findEnemies() + 1 );
				self.lastActionMessage("You scan your surroundings using your fish-powers!");
			},
			checkForFood: function(){

				self.player().data().skillCooldowns().findFood(self.defaultCooldown);
				self.player().data().skillProgress().findFood( self.player().data().skillProgress().findFood() + 1 );
				var message = "";
				if(rand(0,9) < (self.player().data().skills().findFood() * 2)){
					self.addFoodToPlayerInventory();
					message = "You gracefully float to the bottom of the river and successfully scrounge up some fish biscuits using your kick-ass mouth feelers.";
				}else{
					message = "You try to delicately float to the bottom of the riverbed, but you miscalculate the strength of your mighty fins and crash down on some fish biscuits, destroying them completely.";
				}
				self.lastActionMessage(message);
			}
		};

		this.init = function(){
			self.initObservables();
			self.initGame();
		}

		this.initObservables = function(){

			self.showLoading = ko.observable(false);
			self.state = ko.observable();
			self.player = ko.observable();
			self.showPlayerData = ko.observable(false);
			self.location = ko.observable();
			self.level = ko.observable(undefined);
			self.lastActionMessage = ko.observable("");

		}

		this.initPlayer = function(playerData){
			self.player(new Player(playerData));
		}

		this.initGame = function(gameData){

			var level;
			var player;
			var stateID;

			if(gameData != undefined){
				level = new Level(gameData.level);
				player = new Player(gameData.player);
				stateID = gameData.stateID;
			}else{
				level = new Level();
				player = new Player();
				stateID = "start";
				//stateID = "idle";
			}
			self.level(level);
			self.player(player);
			self.setState(stateID);

			self.level()._generateGrid();
			self.level()._populateGrid();
		}

		this.initLevel = function(lvlNum, lvlData){
			lvlNum = lvlNum || 1;
			lvlData = lvlData || {};
			self.level(new Level(lvlNum, lvlData));
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

			if(currentPos.x != newPos.x || currentPos.y != newPos.y){
				self.updateCooldowns();
				self.player().data().skillProgress().speed( self.player().data().skillProgress().speed() + 1 );
			}
			self.lastActionMessage("");

		}

		this.updateCooldowns = function(){
			$.each(self.player().data().skillCooldowns(), function(skill, cooldown){
				var cooldownValue = cooldown();
				if(cooldownValue > 0){
					cooldown(cooldownValue - 1);
				}
			});
		}

		this.hideModal = function(viewModel, event){
			self.modalIsShown = false;
			$('#myModal').modal('hide');
			$('#myModal .modal-content').hide();
		}

		this.setState = function(stateID, extraCallback){

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
				player : ko.mapping.toJS(self.player().data()),
				state : self.state(),
				level: self.level(),
			}
			return JSON.stringify(exportObj);
		}

		self.init();

	};

	return Game;

});
