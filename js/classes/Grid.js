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

			self.numSquares = gridData.numSquares || 15;
			self.gridBounds = gridData.gridBounds || {
				minX: 0,
				maxX: (self.numSquares - 1),
				minY: 0,
				maxY: (self.numSquares - 1),
			};

			self.grid = gridData.grid;

			if(self.grid.length == 0){

				self._fillInGridWalls();

			}

		}

		this._fillInGridWalls = function(){
			//Set up a grid
			self._generateGrid();

			//Add borders
			self._addPerimeterBorders();

			//Recursively add linear dividing walls to the remaining area of the map
			self.addDivisions((self.gridBounds.minX + 1), (self.gridBounds.maxX - 1), (self.gridBounds.minY + 1), (self.gridBounds.maxY - 1));
		}

		this.addDivisions = function(minX, maxX, minY, maxY){

			//Randomize "room" size
			var minSquareForDivision = Utils.doRand(2,6);

			//Set up vars
			var width 		 = (maxX - minX),
				height 		 = (maxY - minY),
				divisionAxis = "",
				minWidth 	 = minSquareForDivision,
				minHeight 	 = minSquareForDivision;

			if(width == height){
				//Randomly choose vertical/horizontal direction if dimensions are square
				divisionAxis = Utils.chooseRandomly(["vertical","horizontal"]);
			}else{
				//Otherwise, divide vertically if room is wider than it is tall,
				//and divide horizontally if room is taller than it is wide
				divisionAxis = ( (width > height) ? "vertical" : "horizontal" );
			}

			//If space is greater than the minimum size to make a division
			if(width >= minWidth && height >= minHeight){

				//Set up vars
				var minBounds = ( divisionAxis == "vertical" ? minX : minY ),
					maxBounds = ( divisionAxis == "vertical" ? maxX : maxY ),
					lengthMinBounds = ( divisionAxis == "vertical" ? minY : minX ),
					lengthMaxBounds = ( divisionAxis == "vertical" ? maxY : maxX );
				//Dividing by two, getting the floor, and multiplying the result by two should guarantee us an even number.
				var wallPosition = Math.floor(Utils.doRand( minBounds, (maxBounds + 1) ) / 2) * 2;
				//Dividing by two, getting the floor, multiplying the result by two, and adding 1 should guarantee us an odd number.
				var doorPosition = (Math.floor(Utils.doRand( lengthMinBounds, (lengthMaxBounds + 1) ) / 2) * 2) + 1;

				//Because we're taking the floor, it's possible to end up with a value of 0,
				//which is a problem, because that's where our border walls are!

				//Let's make sure that we don't try and put a wall over the top or left border walls
				if( wallPosition == 0 ){
					wallPosition+=2;
				}
				//Let's also make sure we don't try and put a door in the top or left border walls either
				if(doorPosition == 0){
					doorPosition+=1;
				}

				var i;

				if( divisionAxis == "vertical" ){
					//For each square in the wall's line, mark the square as a wall (unless it's a door)
					for(i = lengthMinBounds; i <= lengthMaxBounds; i++){
						if( i != doorPosition ){
							self.grid[i][wallPosition].isWall = true;
							self.grid[i][wallPosition].notEmpty = true;
						}
					}
					//For the remaining spaces on either side of the wall, divide them as well
					self.addDivisions((wallPosition + 1), maxX, minY, maxY);
					self.addDivisions(minX, (wallPosition - 1), minY, maxY);
				}else{
					//For each square in the wall's line, mark the square as a wall (unless it's a door)
					for(i = lengthMinBounds; i <= lengthMaxBounds; i++){
						if( i != doorPosition ){
							self.grid[wallPosition][i].isWall = true;
							self.grid[wallPosition][i].notEmpty = true;
						}
					}
					//For the remaining spaces on either side of the wall, divide them as well
					self.addDivisions(minX, maxX, (wallPosition + 1), maxY);
					self.addDivisions(minX, maxX, minY, (wallPosition - 1));
				}

			}

		}

		this._addPerimeterBorders = function(){
			var row, col;
			for(row = self.gridBounds.minX; row <= self.gridBounds.maxX; row++){
				for(col = self.gridBounds.minY; col <= self.gridBounds.maxY; col++){
					if(row == self.gridBounds.minX || row == self.gridBounds.maxX || col == self.gridBounds.minY || col == self.gridBounds.maxY ){
						//Fill in as wall
						self.grid[row][col].isWall = true;
						self.grid[row][col].notEmpty = true;
					}
				}
			}			
		}

		//Set up the array representing our 2D grid
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

		this.dumpVisualRepresentation = function(){
			var outputString = "";

			for(row = self.gridBounds.minX; row <= self.gridBounds.maxX; row++){
				for(col = self.gridBounds.minY; col <= self.gridBounds.maxY; col++){
					if(self.grid[row][col].isWall == false){
						outputString += " ";
					}else{
						outputString += "O";
					}
				}
				outputString += "\n";
			}

			console.log(outputString);
		}

		this.generateAndDrawMap = function(){
			self._fillInGridWalls();
			self.drawMap();
			self.dumpVisualRepresentation();
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
			var text = "";

			$.each(self.grid, function(row_num, row){

				$.each(row, function(col_num, cell){

					var square = self.grid[row_num][col_num];
					//var square = self.getSquare(col_num, row_num);

					if(square == "W"){
						fillStyle = darkFill;
					}else{
						fillStyle = lightFill;
					}

					context.fillStyle = fillStyle;
					context.fillRect(col_num * squareWidth, row_num * squareHeight, squareWidth, squareHeight);

				});
			});

			context.save(); // save state

		}

		this.init(gridData);

	}

	Grid.prototype.constructor = Grid;

	return Grid;
});
