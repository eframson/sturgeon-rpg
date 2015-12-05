define([
	'jquery',
	'knockout',
	'classes/GridSquare',

	'Utils',
], function($, ko, GridSquare, Utils){

	function Grid(gridData){

		var self = this;

		this.init = function(gridData){

			if(gridData == undefined){
				gridData = { genOpts : {} };
			}

			if(gridData.grid == undefined){
				gridData.grid = Array();
			}

			self.grid = gridData.grid;

			if(self.grid.length == 0){

				self._fillInGridWalls();

			}

		}

		this._fillInGridWalls = function(){
			//Put logic here as detauled in pseudocode below here
		}

		//Set up a grid
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

		//Add borders

		//Add divisions(center of grid)

		//Add divisions =

			//If space is greater than the minimum size to make a division

			//For space, divide vertically or horizontally <--
			//											     |
			//For each half, perpendicularly, ----------------

		//Divide =

			//If division is horizontal
				//Choose random Y (always in an even-numbered position)
				//Length is minX to maxX

			//If division is vertical
				//Choose random X (always in an even-numbered position)
				//Length is minY to maxY

			//"Draw" line
				//Pick random square and "draw" hole (always in odd-numbered position?)





























		



		

		this.init = function(gridData){

			self.genOpts = {};
			$.extend(self.genOpts, {
				genPercents : {
					50 : "combat",
					20 : "item",
					30 : "event",
				},
				percentEmpty : 50,
				quadsWithPotentialExits: [1, 2],
				quadsWithPotentialEntrances: [3, 4],
			}, (gridData.genOpts || {}));
			self.numSquares = gridData.numSquares || 10;
			self.gridBounds = gridData.gridBounds || {
				minX: 0,
				maxX: (self.numSquares - 1),
				minY: 0,
				maxY: (self.numSquares - 1),
			};
			self.quadBounds = gridData.quadBounds || {};
			self.grid = Array();

			var gridArray = Array();
			for(y = 0; y < gridData.grid.length; y++){
				for(x = 0; x < gridData.grid[y].length; x++){

					if(gridArray[y] == undefined){
						gridArray[y] = Array();
					}

					gridArray[y].push( new GridSquare(gridData.grid[y][x]) );
				}
			}
			self.grid = gridArray;

			if(!self.hasGenerated){
				self.generateThisLevel();
			}
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
			var potentialExits = Array(),
				potentialEntrances = Array(),
				q,
				entranceQuadNum,
				exitQuadNum;

			//Choose one quad or the other off-the-bat, and then randomize its position inside that
			entranceQuadNum = ( genOpts.quadsWithPotentialEntrances.length > 0 ) ? genOpts.quadsWithPotentialEntrances[Utils.doRand(0, genOpts.quadsWithPotentialEntrances.length)] : 0;
			exitQuadNum = ( genOpts.quadsWithPotentialExits.length > 0 ) ? genOpts.quadsWithPotentialExits[Utils.doRand(0, genOpts.quadsWithPotentialExits.length)] : 0;

			for(q=1; q <= 4; q++){

				var numNonEmpty = 0;

				var bounds = self._getQuadBounds(q);
				var possibleEntranceExitX = playerPos.x;
				var possibleEntranceExitY = playerPos.y;

				if(q == entranceQuadNum || q == exitQuadNum){
					while( possibleEntranceExitX == playerPos.x && possibleEntranceExitY == playerPos.y ){
						possibleEntranceExitX = Utils.doRand(bounds.minX, bounds.maxX);
						possibleEntranceExitY = Utils.doRand(bounds.minY, bounds.maxY);
					}

					var entranceExitSquare = self.grid[ possibleEntranceExitX ][ possibleEntranceExitY ]

					if( q == entranceQuadNum && self.entranceSquare().length == 0 ){

						entranceExitSquare.setType("entrance");
						entranceExitSquare.notEmpty = true;
						self.entranceSquare([ entranceExitSquare.x, entranceExitSquare.y ]);

					}else if( q == exitQuadNum && self.exitSquare().length == 0 ){

						entranceExitSquare.setType("exit");
						entranceExitSquare.notEmpty = true;
						entranceExitSquare.isChallengeActive(1);
						self.exitSquare([ entranceExitSquare.x, entranceExitSquare.y ]);

					}
				}

				for(x = bounds.minX; x <= bounds.maxX; x++){
					for(y = bounds.minY; y <= bounds.maxY; y++){

						//If the current square is not the player position, and it doesn't already have something in it
						if( !(x == playerPos.x && y == playerPos.y) && !self.grid[x][y].notEmpty){

							var type = "empty";

							if(Utils.doRand(0,99) < genOpts.percentEmpty && (genOpts.maxNonEmptyPerQuad == 0 || numNonEmpty <= genOpts.maxNonEmptyPerQuad)){

								//This *should* automatically put the percentages in the correct (ASC) order
								var type = Utils.doBasedOnPercent(genOpts.genPercents);

								self.grid[x][y].notEmpty = true;

								numNonEmpty++;
							}

							self.grid[x][y].setType(type);

						}
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

		this._doForEachGridSquare = function(action){
			if( action == undefined || typeof action !== 'function' ){
				return false;
			}

			for(y = 0; y < self.grid.length; y++){
				for(x = 0; x < self.grid[y].length; x++){
					action(self.grid[y][x]);
				}
			}

		}

		this.getExportData = function(){

			var exportObj = ko.mapping.toJS({
				levelNum : self.levelNum,
				gridBounds : self.gridBounds,
				quadBounds : self.quadBounds,
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

		this.init(gridData);

	}

	Grid.prototype.constructor = Grid;

	return Grid;
});
