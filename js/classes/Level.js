define([
	'jquery',
	'knockout',
	'classes/GridSquare',

	'Utils',
], function($, ko, GridSquare){

	var Level = function(levelData){

		var self = this;
		
		if(levelData == undefined){
			levelData = { genOpts : {}, grid : Array() };
		}

		if(levelData.grid == undefined){
			levelData.grid = Array();
		}
		
		this.init = function(levelData){

			self.genOpts = {};
			$.extend(self.genOpts, {
				genPercents : {
					50 : "combat",
					10 : "item",
					40 : "event",
				},
				percentEmpty : 50,
				minNonEmptyPerQuad: 3,
				maxNonEmptyPerQuad: 10,
			}, (levelData.genOpts || {}));
			self.numSquares = levelData.numSquares || 10;
			self.playerPos = levelData.playerPos || [4, 4];
			self.levelNum = levelData.levelNum || 1;
			self.gridBounds = levelData.gridBounds || {
				minX: 0,
				maxX: (self.numSquares - 1),
				minY: 0,
				maxY: (self.numSquares - 1),
			};
			self.quadBounds = levelData.quadBounds || {};
			self.grid = Array();
			self.nextLevelID = ko.observable( levelData.nextLevelID || undefined );
			self.prevLevelID = ko.observable( levelData.prevLevelID || undefined );
			self.isActive = ko.observable(levelData.isActive || false);
			self.levelID = ko.observable(levelData.levelID || "lvl_" + (new Date().getTime()) );
			self.hasGenerated = levelData.hasGenerated || false;

			var gridArray = Array();
			for(y = 0; y < levelData.grid.length; y++){
				for(x = 0; x < levelData.grid[y].length; x++){

					if(gridArray[y] == undefined){
						gridArray[y] = Array();
					}

					gridArray[y].push( new GridSquare(levelData.grid[y][x]) );
				}
			}
			self.grid = gridArray;

			if(!self.hasGenerated){
				self._generateGrid();
				self._populateGrid();
				self.hasGenerated = true;
			}
		}

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
					targetY = (targetY <= this.gridBounds.maxY) ? targetY : this.gridBounds.maxY ;
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
		
		this.drawMap = function(){

			//var $map = $("#map");
			var canvas = document.getElementById("map-canvas");
			var context = canvas.getContext("2d");
			var totalWidth = canvas.width;
			var totalHeight = canvas.height;

			//Obviously hook these up better, derp
			var squareWidth = Math.floor(totalWidth / (self.gridBounds.maxX + 1));
			var squareHeight = Math.floor(totalHeight / (self.gridBounds.maxY + 1));

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
			var combatColor = '#FF8585';
			var itemColor = '#FFE240';
			var eventColor = '#B92EFF';
			var playerPos = self.getPlayerPos();

			$.each(self.grid, function(row_num, row){

				var odd_row = row_num % 2;

				$.each(row, function(col_num, cell){

					var fillStyle = "#EDEEF7";
					var square = self.getSquare(col_num, row_num);
					
					if( square.isDone ){
						
						fillStyle = "#7A7A7A";
						
					}else{
						
						if(square.isVisible){
	
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
							
						}
						
						if(square.isScanned){
							
							if(square.type == "combat"){
								fillStyle = combatColor;
							}else if(square.type == "item"){
								fillStyle = itemColor;
							}else if(square.type == "event"){
								fillStyle = eventColor;
							}
							
						}
						
					}					

					context.fillStyle = fillStyle;
					context.fillRect(col_num * squareWidth, row_num * squareHeight, squareWidth, squareHeight);

				});
			});

			var midSquare = squareWidth / 2;
			context.beginPath();
	        var radius = midSquare; // Arc radius
	        var startAngle = 0; // Starting point on circle
	        var endAngle = Math.PI+(Math.PI*2)/2; // End point on circle
	        context.fillStyle = playerColor;
	        context.arc((playerPos.x * squareHeight) + midSquare, (playerPos.y * squareWidth) + midSquare, radius, startAngle, endAngle);
	        context.fill();

		}
		
		this.showSquaresNearPlayer = function(radius){
			self._revealSquaresNearPlayer(radius, "vision");
		}
		
		this.scanSquaresNearPlayer = function(radius){
			self._revealSquaresNearPlayer(radius, "scan");
		}
		
		this.revealSquaresNearPlayer = function(radius){
			self._revealSquaresNearPlayer(radius, "all");
		}
		
		this._revealSquaresNearPlayer = function(radius, type){
			radius = radius || 1;
			type = type || "all";

			var playerPos = self.getPlayerPos();
			var startX = ( (playerPos.x - radius) >= self.gridBounds.minX ) ? playerPos.x - radius : self.gridBounds.minX ;
			var startY = ( (playerPos.y - radius)  >= self.gridBounds.minY ) ? playerPos.y - radius : self.gridBounds.minY ;
			var endX = ( (playerPos.x + radius) <= self.gridBounds.maxX ) ? playerPos.x + radius : self.gridBounds.maxX ;
			var endY = ( (playerPos.y + radius)  <= self.gridBounds.maxY ) ? playerPos.y + radius : self.gridBounds.maxY ;

			var c,
				r;
			
			for(r = startY; r <= endY; r++){
				for(c = startX; c <= endX; c++){
					if(type == "vision" || type == "all" ){
						self.getSquare(c, r).setVisibility(true);
					}
					if( type == "scan" || type == "all" ){
						self.getSquare(c, r).setScanned(true);
					}
				}
			}
		}

		this._generateGrid = function(){
			for(x = self.gridBounds.minX; x <= self.gridBounds.maxX; x++){
				for(y = self.gridBounds.minY; y <= self.gridBounds.maxY; y++){
					if(self.grid[x] == undefined){
						self.grid[x] = Array();
					}
					self.grid[x][y] = new GridSquare({x : x, y : y});
				}
			}
		}

		this._populateGrid = function(){
			//Generate things a quad at a time
			/*
				//Quad order is:
				1 , 2
				3 , 4
			*/
			var genOpts = self.genOpts;
			var playerPos = self.getPlayerPos();

			for(q=1; q <= 4; q++){
				
				var numNonEmpty = 0;

				var bounds = self._getQuadBounds(q);
				
				for(x = bounds.minX; x < bounds.maxX; x++){
					for(y = bounds.minY; y < bounds.maxY; y++){
						
						var type = "empty";
						var cumePercent = 0;
						
						if(rand(0,99) < genOpts.percentEmpty && numNonEmpty <= genOpts.maxNonEmptyPerQuad && (x != playerPos.x && y != playerPos.y)){

							var randSquareType = rand(0,99);

							//This *should* automatically put the percentages in the correct (ASC) order
							$.each(genOpts.genPercents, function(idx, elem){

								cumePercent += parseInt(idx);
								
								if(randSquareType < cumePercent){
									self.grid[x][y].notEmpty = true;
									type = elem;
									//Break out of our each loop early
									return false;
								}

							});
							
							numNonEmpty++;
						}
						
						self.grid[x][y].setType(type);
					}
				}

			}

		}

		this._getQuadBounds = function(quadNum) {

			var bounds = {
				minX : undefined,
				maxX : undefined,
				minY : undefined,
				maxY : undefined,
			};
			
			var medX = Math.floor(this.gridBounds.maxX / 2);
			var medY = Math.floor(this.gridBounds.maxY / 2);

			if( quadNum == 1 ){

				if(self.quadBounds[1] == undefined){
					
					bounds.minX = this.gridBounds.minX;
					bounds.maxX = medX;
					bounds.minY = this.gridBounds.minY;
					bounds.maxY = medY;
					
					self.quadBounds[1] = bounds;
				}
				return self.quadBounds[1];

			}else if( quadNum == 2 ){
				
				if(self.quadBounds[2] == undefined){
					
					bounds.minX = medX;
					bounds.maxX = this.gridBounds.maxX;
					bounds.minY = this.gridBounds.minY;
					bounds.maxY = medY;
					
					self.quadBounds[2] = bounds;
				}
				return self.quadBounds[2];
				
			}else if( quadNum == 3 ){

				if(self.quadBounds[3] == undefined){
					
					bounds.minX = this.gridBounds.minX;
					bounds.maxX = medX;
					bounds.minY = medY;
					bounds.maxY = this.gridBounds.maxY;
					
					self.quadBounds[3] = bounds;
				}
				return self.quadBounds[3];

			}else if( quadNum == 4 ){
				
				if(self.quadBounds[4] == undefined){
					
					bounds.minX = medX;
					bounds.maxX = this.gridBounds.maxX;
					bounds.minY = medY;
					bounds.maxY = this.gridBounds.maxY;
					
					self.quadBounds[4] = bounds;
				}
				return self.quadBounds[4];
			}
			
			return false;

		}
		
		this.getExportData = function(){
			
			var exportObj = ko.mapping.toJS({
				playerPos : self.playerPos,
				levelNum : self.levelNum,
				gridBounds : self.gridBounds,
				quadBounds : self.quadBounds,
				nextLevelID : self.nextLevelID,
				prevLevelID : self.prevLevelID,
				isActive : self.isActive,
				levelID : self.levelID,
				hasGenerated : self.hasGenerated,
			});
			
			var exportGrid = Array();
			
			for(row = 0; row < self.grid.length; row++){
				for(col = 0; col < self.grid[row].length; col++){
					if(exportGrid[row] == undefined){
						exportGrid[row] = Array();
					}
					exportGrid[row][col] = self.grid[row][col].getExportData();
				}
			}
			
			exportObj.grid = exportGrid;
			
			return exportObj;
		}
		
		this.init(levelData);

	}

	return Level;
});