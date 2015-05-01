define([
	'jquery',
	'knockout',
	'classes/Player',
	'classes/Level',

	'Utils',
], function($, ko, Player, Level){

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
					self.drawMap();
				},
				text: "<p>You decide to...</p>",
				buttons: [
					[
						{
							text: "Look for food",
							action: function(){
							}
						},
						{
							text: "Check for predators",
							action: function(){
							}
						},
					],
					[
						{
							text: "Swim Left",
							action: function(){
								self.level().movePlayerLeft();
								self.drawMap();
							}
						},
						{
							text: "Swim Right",
							action: function(){
								self.level().movePlayerRight();
								self.drawMap();
							}
						},
						{
							text: "Swim Upstream",
							action: function(){
								self.level().movePlayerUp();
								self.drawMap();
							}
						},
						{
							text: "Swim Downstream",
							action: function(){
								self.level().movePlayerDown();
								self.drawMap();
							}
						},
					]
				],
				location: "Midstream",
			},
		};

		this.playerActions = {
			checkForEnemies: function(){

			},
			checkForFood: function(){

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
			self.mapForRender = ko.observableArray();
			self.mapRenderHtml = ko.computed(function(){
				/*var html = '';
				$.each(self.mapForRender(), function(row_num, row){
					html+="<tr>";
					$.each(row, function(col_num, cell){
						html+="<td>" + cell.type + "</td>";
					});
					html+="</tr>";
				});
				return html;*/
			});

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

		this.loadFromData = function(gameData){
			if(gameData == undefined){
				return false;
			}

			self.initGame(gameData);
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
				level: self.currentLevel(),
			}
			return JSON.stringify(exportObj);
		}

		this.drawMap = function(){

			//var $map = $("#map");
			var canvas = document.getElementById("map");
			var context = canvas.getContext("2d");
			var totalWidth = canvas.width;
			var totalHeight = canvas.height;

			//Obviously hook these up better, derp
			var squareWidth = Math.floor(totalWidth / self.level().gridBounds.maxX);
			var squareHeight = Math.floor(totalHeight / self.level().gridBounds.maxY);

			//RESET THE CANVAS EACH TIME
			// Store the current transformation matrix
			context.save();

			// Use the identity matrix while clearing the canvas
			context.setTransform(1, 0, 0, 1, 0, 0);
			context.clearRect(0, 0, canvas.width, canvas.height);

			// Restore the transform
			context.restore();

			var lightFill = '#658DA6';
			var darkFill = '#436073';
			var playerColor = '#D36600';
			var playerPos = self.level().getPlayerPos();

			$.each(self.level().grid, function(row_num, row){

				var odd_row = row_num % 2;

				$.each(row, function(col_num, cell){

					var fillStyle;

					if(odd_row){

						if(col_num % 2){
							fillStyle = lightFill;
						}else{
							fillStyle = darkFill;
						}
						
					}else{
						if(col_num % 2){
							fillStyle = darkFill;
						}else{
							fillStyle = lightFill;
						}
					}

					context.fillStyle = fillStyle;
					context.fillRect(row_num * squareWidth, col_num * squareHeight, squareWidth, squareHeight);

				});
			});

			var midSquare = squareWidth / 2;
			context.beginPath();
	        var radius = midSquare; // Arc radius
	        var startAngle = 0; // Starting point on circle
	        var endAngle = Math.PI+(Math.PI*2)/2; // End point on circle
	        context.fillStyle = playerColor;
	        context.arc((playerPos.x * squareHeight) - midSquare, (playerPos.y * squareWidth) - midSquare, radius, startAngle, endAngle);
	        context.fill();

		}

		self.init();

	};

	return Game;

});