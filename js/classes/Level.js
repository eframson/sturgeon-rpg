define([
	'jquery',
	'knockout',
	'classes/GridSquare',

	'Utils',
], function($, ko, GridSquare){

	var Level = function(genOpts, numSquares, playerPos){

		var self = this;

		this.genOpts = {};
		$.extend(this.genOpts, {
			genPercents : {
				50 : "combat",
				10 : "item",
				40 : "event",
			},
			percentEmpty : 50,
			minNonEmptyPerQuad: 3,
			maxNonEmptyPerQuad: 10,
		}, (genOpts || {}));
		this.numSquares = numSquares || 10;
		this.playerPos = playerPos || [4, 4];

		this.gridBounds = {
			minX: 0,
			maxX: (self.numSquares - 1),
			minY: 0,
			maxY: (self.numSquares - 1),
		};

		this.quadBounds = {};

		this.grid = Array();

		this.loadFromData = function(levelData){
			if(levelData == undefined){
				return false;
			}
			console.log(levelData);
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

			console.log(this.getPlayerPos());

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

		this._populateGrid = function(){
			//Generate things a quad at a time
			/*
				//Quad order is:
				1 , 2
				3 , 4
			*/
			var genOpts = self.genOpts;

			for(q=1; q <= 4; q++){
				
				var numNonEmpty = 0;

				var bounds = self._getQuadBounds(q);
				
				for(x = bounds.minX; x < bounds.maxX; x++){
					for(y = bounds.minY; y < bounds.maxY; y++){
						
						var type = "empty";
						var cumePercent = 0;
						
						if(rand(0,99) < genOpts.percentEmpty && numNonEmpty <= genOpts.maxNonEmptyPerQuad){

							var randSquareType = rand(0,99);

							//This *should* automatically put the percentages in the correct (ASC) order
							$.each(genOpts.genPercents, function(idx, elem){

								cumePercent += parseInt(idx);
								
								if(randSquareType < cumePercent){
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

	}

	return Level;
});