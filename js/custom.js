var gameViewModel = undefined;

// Here's my data model
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
						action: function(){ self.setstate("d1"); }
					},
				],
			],
			location: "Unknown",
		},
		d1: {
			text: "<p>With a loud crack, you emerge from your egg like the Kool-Aid man through a brick wall.</p>",
			buttons: [
				[
					{
						text: "OH YEAH!!!",
						action: function(){ self.setstate("d2"); }
					},
				],
			],
			location: "Unknown",
		},
		d2: {
			text: "<p>You feel cool water rush past your face like a refreshing breeze.</p>",
			buttons: [
				[
					{
						text: "Continue",
						action: function(){
							self.initPlayer();
							self.setstate("idle", function(){ self.showPlayerData(true); $(".player-data").fadeIn(); });
						}
					},
				],
			],
			location: "Unknown",
		},
		idle: {
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
							self.stageMap().movePlayerLeft();
						}
					},
					{
						text: "Swim Right",
						action: function(){
							self.stageMap().movePlayerRight();
						}
					},
					{
						text: "Swim Upstream",
						action: function(){
							self.stageMap().movePlayerUp();
						}
					},
					{
						text: "Swim Downstream",
						action: function(){
							self.stageMap().movePlayerDown();
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

	this.initObservables = function(){
		
		self.showLoading = ko.observable(false);
		self.currentstate = ko.observable("start");
		self.state = ko.computed(function(){
			if(self.states.hasOwnProperty(self.currentstate())){
				return self.states[self.currentstate()];				
			}
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
			return no_slide;

		});
		self.player = ko.observable();
		self.showPlayerData = ko.observable(false);
		self.location = ko.observable();
		self.stageMap = ko.observable(undefined);

	}
	
	this.initPlayer = function(playerData){
		self.player(new Player(playerData));
	}

	this.initGame = function(){
		if(self.stageMap() == undefined){
			self.stageMap(new Stage());
		}
	}

	this.hideModal = function(viewModel, event){
		self.modalIsShown = false;
		$('#myModal').modal('hide');
		$('#myModal .modal-content').hide();
	}

	this.setstate = function(state, callback){
		$("#content-area").fadeOut(600, function(){
			self.currentstate(state);
			$(this).fadeIn(undefined, function(){
				if(typeof callback === 'function'){
					callback();
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
			self.initPlayer(saveData.player);
			self.player(new Player(saveData.player));
			self.showPlayerData(true);
			self.currentstate(saveData.state);
		}
		reader.onerror = function(){
			console.log(arguments);
		}

		reader.readAsText(file);
	}

	this.getExportData = function(){
		var exportObj = {
			player: ko.mapping.toJS(self.player().data()),
			state: self.currentstate(),
		}
		return JSON.stringify(exportObj);
	}

	this.failureMsg = function(messageString){
		self.displayMessage(messageString, "error", "Oh no!", 8000);
	}

	this.successMsg = function(messageString){
		self.displayMessage(messageString, "notice", "Success");
	}

	this.displayMessage = function(messageString, type, growlHeader, duration){
		type = type || "warning";

		$.growl[type]({ message: messageString, title: growlHeader, duration: duration });
	}

	ko.bindingHandlers.showMessage = {
	    init: function(element, valueAccessor) {
	        //$(element).hide();
	    },
	    update: function(element, valueAccessor) {
	        // On update, fade in/out
	        var message = valueAccessor();
	        if(message && message != ""){
				$(element).text(message).slideDown(500).delay(3000).slideUp(500, function(){
					self.activeMessage("");
				});	
	        }
	    }
	};

};

var Player = function(playerData){

	//Init
	var self = this;
	playerData = playerData || {equipment: {}, skills: {}};

	this.data = ko.observable({

		level : ko.observable(playerData.level || 1),
		hp : ko.observable(playerData.hp || 10),
		inventory : ko.observableArray(playerData.inventory || Array()),
		equipment : ko.observable({
			headArmor : ko.observable(playerData.equipment.headArmor || undefined),
			finArmor : ko.observable(playerData.equipment.finArmor || undefined),
			bodyArmor : ko.observable(playerData.equipment.bodyArmor || undefined),
			tailArmor: ko.observable(playerData.equipment.tailArmor || undefined),
			weapon : ko.observable(playerData.equipment.weapon || undefined),
			shield : ko.observable(playerData.equipment.shield || undefined),
		}),
		skills : ko.observable({
			findEnemies: ko.observable(playerData.skills.findEnemies || 0),
			findFood: ko.observable(playerData.skills.findFood || 0),
		}),
		abilities : ko.observableArray(playerData.abilities || Array()),

	});
	//End init

	this.getData = function(){
		return self.data();
	}
}

var Item = function(data){

	var self = this;

	this.name = data.name || "";
	this.slotsRequired = data.slotsRequired || 0;
}

var Weapon = function(data){

	Item.call(this, data);

	this.damageMin = data.damageMin || 0;
	this.damageMax = data.damageMax || 1;
}

var Stage = function(genOpts, squareSize, playerPos){

	var self = this;

	$.extend(this.genOpts, {
		percentEmpty : 50,
		percentCombat : 50,
		percentItem : 10,
		percentEvent: 40,
		minNonEmptyPerQuad: 3,
		maxNonEmptyPerQuad: 10,
	}, (genOpts || {}));
	this.squareSize = squareSize || 10;
	this.playerPos = playerPos || [5, 5];

	this.gridBounds = {
		minX: 0,
		maxX: self.squareSize,
		minY: 0,
		maxY: self.squareSize,
	};

	this.quadBounds = {};

	this.grid = Array();

	this.setPlayerPos = function(x, y){
		if(x == undefined || y == undefined){
			return false;
		}

		if(x < this.gridBounds.minX || x > this.gridBounds.maxX || y < this.gridBounds.minY || y > this.gridBounds.maxY){
			return false;
		}

		this.playerPos = [x,y];
		return true;
	}

	this.getPlayerPos = function(axis){
		if(axis){
			if(axis == "x"){
				return this.playerPos[0];
			}else if(axis == "y"){
				return this.playerPos[1];
			}
			return false;
		}
		return {
			x: this.playerPos[0],
			y: this.playerPos[1],
		}
	}

	this.movePlayerLeft = function(numSquares){
		return self.movePlayer("left", numSquares);
	}

	this.movePlayerRight = function(numSquares){
		return self.movePlayer("right", numSquares);
	}

	this.movePlayerUp = function(numSquares){
		return self.movePlayer("up", numSquares);
	}

	this.movePlayerDown = function(numSquares){
		return self.movePlayer("down", numSquares);
	}

	this.movePlayer = function(direction, numSquares){
		numSquares = numSquares || 1;

		if(direction == undefined){
			return false;
		}

		var targetX = self.getPlayerPos("x");
		var targetY = self.getPlayerPos("y");

		if(direction == "left" || direction == "right"){

			if(direction == "left"){
				targetX = self.playerPos[0] - numSquares;
				targetX = (targetX >= this.gridBounds.minX) ? targetX : this.gridBounds.minX ;
				
			}else if(direction == "right"){
				targetX = self.playerPos[0] + numSquares;
				targetX = (targetX <= this.gridBounds.maxX) ? targetX : this.gridBounds.maxX ;
			}

		}else{

			if(direction == "up"){
				targetY = self.playerPos[1] - numSquares;
				targetY = (targetY >= this.gridBounds.minY) ? targetY : this.gridBounds.minY ;
			}else if(direction == "down"){
				targetY = self.playerPos[1] + numSquares;
				targetY = (targetY >= this.gridBounds.maxY) ? targetY : this.gridBounds.maxY ;
			}

		}

		self.setPlayerPos(targetX, targetY);

		return this.getPlayerPos();
	}

	this.getSquare = function(x, y){
		if(x == undefined || y == undefined){
			return false;
		}
		return self.grid[x][y];
	}

	this._generateGrid = function(){
		for(x = self.gridBounds.minX; x <= self.gridBounds.maxX; x++){
			for(y = self.gridBounds.minY; y <= self.gridBounds.maxY; y++){
				if(self.grid[x] == undefined){
					self.grid[x] = Array();
				}
				self.grid[x][y] = new GridSquare(x,y);
			}
		}
	}

	this._populateGrid = function(genOpts){
		//Generate things a quad at a time
		/*
			//Quad order is:
			1 , 2
			3 , 4
		*/
		for(q=0; q < 4; q++){

			var bounds = self._getQuadBounds(q);

		}
	}

	this._getQuadBounds = function(quadNum) {

		var bounds = {
			minX : undefined,
			maxX : undefined,
			minY : undefined,
			maxY : undefined,
		};

		if( quadNum == 1 ){

			if(self.bounds[1] == undefined){
				bounds.minX = this.gridBounds.minX;
				bounds.minY = this.gridBounds.minY;
				bounds.maxX = Math.floor(this.gridBounds.maxX / 2);
				bounds.maxY = Math.floor(this.gridBounds.maxY / 2);
				self.bounds[1] = bounds;
				return self.bounds[1];
			}else{
				return self.bounds[1];
			}

		}else if( quadNum == 2 ){

		}else if( quadNum == 3 ){

			if(self.bounds[3] == undefined){
				bounds.minX = self._getQuadBounds(1).maxX + 1;
				bounds.minY = self._getQuadBounds(1).maxY + 1;
				bounds.maxX = Math.floor(this.gridBounds.maxX);
				bounds.maxY = Math.floor(this.gridBounds.maxY);
				self.bounds[3] = bounds;
				return self.bounds[3];
			}else{
				return self.bounds[3];
			}

		}else if( quadNum == 4 ){

		}

	}

}

var GridSquare = function(x, y, type){

	if(x == undefined || y == undefined){
		return false;
	}

	var self = this;
	this.x = x;
	this.y = y;
	this.type = type;

	this.setType = function(type){
		self.type = type;
	}
	
}

$(document).ready(function(){

	gameViewModel = new Game();
	gameViewModel.initObservables();
	ko.applyBindings(gameViewModel);
	gameViewModel.initGame();
	
	$('#importSavedGame').change(function(e){
		gameViewModel.processFile(e);
	});

	//Show our content now that everything's loaded
	$("#content-area").removeClass("hidden");
	
});

rand = function(min, max){
	return Math.floor(Math.random() * (max - min)) + min;
}