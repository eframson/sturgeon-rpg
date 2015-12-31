define([
	'jquery',
	'knockout',
	'classes/GridSquare',

	'Utils',
], function($, ko, GridSquare, Utils){

	function Level(levelData){

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
					20 : "item",
					30 : "event",
				},
				percentEmpty : 50,
				minNonEmptyPerQuad: 3, //Not currently used
				maxNonEmptyPerQuad: 0, //0 = unlimited
				quadsWithPotentialExits: [1, 2],
				quadsWithPotentialEntrances: [3, 4],
			}, (levelData.genOpts || {}));
			self.numSquares = levelData.numSquares || 10;
			self.levelNum = ko.observable(levelData.levelNum || 1);
			self.gridBounds = levelData.gridBounds || {
				minX: 0,
				maxX: (self.numSquares - 1),
				minY: 0,
				maxY: (self.numSquares - 1),
			};
			self.unitsPerSquare = levelData.unitsPerSquare || 2;
			self.rayTraceDegreeSteps = levelData.rayTraceDegreeSteps || 5;
			self.quadBounds = levelData.quadBounds || {};
			self.playerPos = levelData.playerPos || self.pickPlayerStartCorner();
			self.grid = Array();
			self.nextLevelID = ko.observable( levelData.nextLevelID || undefined );
			self.prevLevelID = ko.observable( levelData.prevLevelID || undefined );
			self.isActive = ko.observable(levelData.isActive || false);
			self.levelID = ko.observable(levelData.levelID || "lvl_" + (new Date().getTime()) );
			self.hasGenerated = levelData.hasGenerated || false;
			self.entranceSquare = ko.observableArray(levelData.entranceSquare || []);
			self.exitSquare = ko.observableArray(levelData.exitSquare || []);
			self.playerOrientation = levelData.playerOrientation || "up";

			self.avgDmgPerHit = levelData.avgDmgPerHit || (self.levelNum * 2);

			var gridArray = Array();
			for(row_num = 0; row_num < levelData.grid.length; row_num++){
				for(col_num = 0; col_num < levelData.grid[row_num].length; col_num++){

					if(gridArray[row_num] == undefined){
						gridArray[row_num] = Array();
					}

					gridArray[row_num][col_num] = new GridSquare(levelData.grid[row_num][col_num]);
				}
			}
			self.grid = gridArray;

			if(!self.hasGenerated){
				self.generateThisLevel();
			}
		}

		this.pickPlayerStartCorner = function(){
			var minX = self.gridBounds.minX + 1,
				maxX = self.gridBounds.maxX - 1,
				minY = self.gridBounds.minY + 1,
				maxY = self.gridBounds.maxY - 1;
			var startCorner = Utils.chooseRandomly(["top left", "top right", "bot left", "bot right"]);

			if(startCorner == "top left"){
				return [minX, minY];
			}else if(startCorner == "top right"){
				return [maxX, minY];
			}else if(startCorner == "bot left"){
				return [minX, maxY];
			}else{
				return [maxX, maxY];
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

			self.playerOrientation = direction;

			var posX = self.getPlayerPos("x");
			var posY = self.getPlayerPos("y");

			if(direction == "left" || direction == "right"){

				if(direction == "left"){
					if( self.getSquare((posX - numSquares), posY).isWall == false ){
						posX-=numSquares;
					}
				}else if(direction == "right"){
					if( self.getSquare((posX + numSquares), posY).isWall == false ){
						posX+=numSquares;
					}
				}

			}else{

				if(direction == "up"){
					if( self.getSquare(posX , (posY - numSquares)).isWall == false ){
						posY-=numSquares;
					}
				}else if(direction == "down"){
					if( self.getSquare(posX , (posY + numSquares)).isWall == false ){
						posY+=numSquares;
					}
				}

			}

			self.setPlayerPos(posX, posY);

			return this.getPlayerPos();
		}

		//getSquare is designed to be called with X and Y coordinates
		//Because of the nature of how the array is stored, a value like 1,4 (x = 1, y = 4) actually correlates to
		//self.grid[y][x], because with the array the axes are flipped
		this.getSquare = function(x, y){
			if(x == undefined || y == undefined){
				return false;
			}
			if(self.grid[y] !== undefined && self.grid[y][x] !== undefined){
				return self.grid[y][x];
			}
			return false;
		}

		this.getActiveSquare = function(){
			var pos = self.getPlayerPos();
			return self.getSquare(pos.x, pos.y);
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
			var exitColor = '#FFD095';
			var entranceColor = '#FF0000';
			var text = "";
			var playerPos = self.getPlayerPos();

			$.each(self.grid, function(row_num, row){

				var odd_row = row_num % 2;

				$.each(row, function(col_num, cell){

					var fillStyle = "#EDEEF7";
					var fontStyle = false;
					var square = self.getSquare(col_num, row_num);

					if( square.isDone ){

						fillStyle = "#7A7A7A";

					}else{

						if(square.isVisible){

							if(square.isWall && square.isDoor){
								fillStyle = "#00FF00";
							}else if(square.isWall){
								fillStyle = "#152026";
							}/*else if(square.isDoor){
								fillStyle = "#FF0000";
							}*/else{
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

						}

						if(square.isScanned){

							if(square.type == "combat"){
								fillStyle = combatColor;
							}else if(square.type == "item"){
								fillStyle = itemColor;
							}else if(square.type == "event"){
								fillStyle = eventColor;
							}else if(square.type == "exit"){
								fillStyle = "#000000";
								fontStyle = "#FFFFFF";
								text = "↑";
							}else if(square.type == "entrance"){
								fillStyle = "#FFFFFF";
								fontStyle = "#000000";
								text = "↓";
							}

						}

					}

					context.fillStyle = fillStyle;
					context.fillRect(col_num * squareWidth, row_num * squareHeight, squareWidth, squareHeight);
					if( square.type == "entrance" || square.type == "exit"){
						context.fillStyle = fontStyle;
						context.font = "26px serif";
						context.fillText(text, col_num * squareWidth + (squareWidth / 4), (row_num * squareHeight) + (squareHeight / 2) + (squareHeight / 4));
					}

				});
			});

			//Player position indicator

			context.fillStyle = playerColor;

			//Ellipse/oval/thing
			var midSquare = squareWidth / 2,
				ovalCenterX = (playerPos.x * squareHeight) + midSquare,
			    ovalCenterY = (playerPos.y * squareWidth) + midSquare,
			    ovalRadiusX = 4,
			    ovalRadiusY = 7,
			    triHeight = 5,
			    triWidth = 0,
			    triFirstPointX = 0,
			    triFirstPointY = 0,
			    triSecondPointX = 0,
			    triSecondPointY = 0,
			    triThirdPointX = 0,
			    triThirdPointY = 0;

			if( self.playerOrientation == "left" ){
				ovalCenterX -= 2;

				//Change oval orientation
				ovalRadiusX = 7;
			    ovalRadiusY = 4;
			    triWidth = ovalRadiusY;

			    //Put first Tri point at right edge of oval
			    triFirstPointX = ovalCenterX + ovalRadiusX;
			    triFirstPointY = ovalCenterY;

			    triSecondPointX = triFirstPointX + triHeight;
			    triSecondPointY = triFirstPointY + triWidth;

			    triThirdPointX = triFirstPointX + triHeight;
			    triThirdPointY = triFirstPointY - triWidth;

			    //Move points right + up, down
			}
			else if( self.playerOrientation == "right" ){
				ovalCenterX += 2;

				//Change oval orientation
				ovalRadiusX = 7;
			    ovalRadiusY = 4;
			    triWidth = ovalRadiusY;

			    //Put first Tri point at left edge of oval
			    triFirstPointX = ovalCenterX - ovalRadiusX;
			    triFirstPointY = ovalCenterY;

			    triSecondPointX = triFirstPointX - triHeight;
			    triSecondPointY = triFirstPointY - triWidth;

			    triThirdPointX = triFirstPointX - triHeight;
			    triThirdPointY = triFirstPointY + triWidth;

			    //Move points left + up, down
			}else if( self.playerOrientation == "down" ){
				ovalCenterY += 2;

				triWidth = ovalRadiusX;

				//Put first Tri point at top edge of oval
				triFirstPointX = ovalCenterX;
				triFirstPointY = ovalCenterY - ovalRadiusY;

			    triSecondPointY = triFirstPointY - triHeight;
			    triSecondPointX = triFirstPointX + triWidth;

				triThirdPointY = triFirstPointY - triHeight;
			    triThirdPointX = triFirstPointX - triWidth;

				//Move points up + left, right
			}else if( self.playerOrientation == "up" ){
				ovalCenterY -= 2;

				triWidth = ovalRadiusX;

				//Put first Tri point at top edge of oval
			    triFirstPointX = ovalCenterX;
			    triFirstPointY = ovalCenterY + ovalRadiusY;

			    triSecondPointY = triFirstPointY + triHeight;
			    triSecondPointX = triFirstPointX - triWidth;

			    triThirdPointY = triFirstPointY + triHeight;
			    triThirdPointX = triFirstPointX + triWidth;

				//Move points up + left, right
			}

			context.save(); // save state
			context.beginPath();

			context.translate(ovalCenterX-ovalRadiusX, ovalCenterY-ovalRadiusY);
			context.scale(ovalRadiusX, ovalRadiusY);
			context.arc(1, 1, 1, 0, 2 * Math.PI, false);

			context.restore(); // restore to original state
			context.stroke();
			context.fill();
			context.closePath();

			//Triangle
			context.beginPath();
			context.moveTo(triFirstPointX, triFirstPointY );
			context.lineTo(triSecondPointX, triSecondPointY);
			context.lineTo(triThirdPointX, triThirdPointY);
			context.closePath(); //This is necessary or the stroke won't be finished (i.e. - it'll only stroke two of the sides and won't connect the 3rd + 1st points)
			context.stroke();
			context.fill();


			/*var midSquare = squareWidth / 2;
			context.beginPath();
	        var radius = midSquare; // Arc radius
	        var startAngle = 0; // Starting point on circle
	        var endAngle = Math.PI+(Math.PI*2)/2; // End point on circle
	        context.fillStyle = playerColor;
	        context.arc((playerPos.x * squareHeight) + midSquare, (playerPos.y * squareWidth) + midSquare, radius, startAngle, endAngle);
	        context.fill();*/

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
			radius = (radius != undefined) ? radius : 1 ;
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
					self.getSquare(c, r).setVisibility(true);
					if( type == "scan" ){
						self.getSquare(c, r).setScanned(true);
					}
				}
			}
		}

		//Set up the array representing our 2D grid
		this._generateGrid = function(){
			for(row_num = self.gridBounds.minY; row_num <= self.gridBounds.maxY; row_num++){
				for(col_num = self.gridBounds.minX; col_num <= self.gridBounds.maxX; col_num++){
					if(self.grid[row_num] == undefined){
						self.grid[row_num] = Array();
					}
					self.grid[row_num][col_num] = new GridSquare({x : col_num, y : row_num});
				}
			}
		}

		this._populateGrid = function(){
			//Generate things a quad at a time
			//Quad order is:
			//	1 , 2
			//	3 , 4
			
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
					//Keep picking entrance/exit coords until we've got one in an empty space (that the player isn't standing on)
					while(
							(possibleEntranceExitX == playerPos.x && possibleEntranceExitY == playerPos.y)
							|| (self.getSquare(possibleEntranceExitX, possibleEntranceExitY).isWall == true)
					){
						possibleEntranceExitX = Utils.doRand(bounds.minX, bounds.maxX);
						possibleEntranceExitY = Utils.doRand(bounds.minY, bounds.maxY);
					}

					var entranceExitSquare = self.getSquare(possibleEntranceExitX, possibleEntranceExitY);

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
						if( !(x == playerPos.x && y == playerPos.y) && !self.getSquare(x,y).notEmpty){

							var type = "empty";

							if(Utils.doRand(0,99) < genOpts.percentEmpty && (genOpts.maxNonEmptyPerQuad == 0 || numNonEmpty <= genOpts.maxNonEmptyPerQuad)){

								//This *should* automatically put the percentages in the correct (ASC) order
								var type = Utils.doBasedOnPercent(genOpts.genPercents);

								self.getSquare(x,y).notEmpty = true;

								numNonEmpty++;
							}

							self.getSquare(x,y).setType(type);

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
				//Top left
				if(self.quadBounds[1] == undefined){

					bounds.minX = this.gridBounds.minX + 1; //Take left border into account
					bounds.maxX = medX + 1; //doRand's top bound is exclusive, so we need to add 1
					bounds.minY = this.gridBounds.minY + 1; //Take top border into account
					bounds.maxY = medY + 1; //doRand's top bound is exclusive, so we need to add 1

					self.quadBounds[1] = bounds;
				}
				return self.quadBounds[1];

			}else if( quadNum == 2 ){
				//Top right
				if(self.quadBounds[2] == undefined){

					bounds.minX = medX;
					bounds.maxX = this.gridBounds.maxX; //doRand's top bound is exclusive, but we have to take border into account
					bounds.minY = this.gridBounds.minY + 1; //Take top border into account
					bounds.maxY = medY + 1; //doRand's top bound is exclusive, so we need to add 1

					self.quadBounds[2] = bounds;
				}
				return self.quadBounds[2];

			}else if( quadNum == 3 ){
				//Bottom left
				if(self.quadBounds[3] == undefined){

					bounds.minX = this.gridBounds.minX + 1; //Take left border into account
					bounds.maxX = medX + 1; //doRand's top bound is exclusive, so we need to add 1
					bounds.minY = medY;
					bounds.maxY = this.gridBounds.maxY; //doRand's top bound is exclusive, but we have to take border into account

					self.quadBounds[3] = bounds;
				}
				return self.quadBounds[3];

			}else if( quadNum == 4 ){
				//Bottom right
				if(self.quadBounds[4] == undefined){

					bounds.minX = medX;
					bounds.maxX = this.gridBounds.maxX; //doRand's top bound is exclusive, but we have to take border into account
					bounds.minY = medY;
					bounds.maxY = this.gridBounds.maxY; //doRand's top bound is exclusive, but we have to take border into account

					self.quadBounds[4] = bounds;
				}
				return self.quadBounds[4];
			}

			return false;

		}

		//Commenting out until I have a use for it -- NEEDS TO BE UPDATED TO REFERENCE COLS/ROWS!
		/*this._doForEachGridSquare = function(action){
			if( action == undefined || typeof action !== 'function' ){
				return false;
			}

			for(y = 0; y < self.grid.length; y++){
				for(x = 0; x < self.grid[y].length; x++){
					action(self.grid[y][x]);
				}
			}

		}*/

		this.generateThisLevel = function(isRegenerate, doDraw){
			isRegenerate = ( isRegenerate == undefined ) ? false : isRegenerate ;

			if(isRegenerate){
				self.entranceSquare([]);
				self.exitSquare([]);
			}

			self._generateGrid();
			self._fillInGridWalls();
			if(isRegenerate){
				self.playerPos = self.pickPlayerStartCorner();
			}
			self._populateGrid();
			self.hasGenerated = 1;

			if(doDraw){
				self.revealMap();
				self.dumpVisualRepresentation();
			}
		}

		this.generateNextLevelIfNotSet = function(levelData){

			if(levelData == undefined){
				levelData = {};
			}
			if( levelData.levelNum == undefined ){
				$.extend(levelData, {
					levelNum : (self.levelNum() + 1)
				}, levelData);
			}

			if(self.nextLevelID() == undefined){
				var newLevel = new Level(levelData);
				newLevel.prevLevelID(self.levelID());
				self.nextLevelID(newLevel.levelID());
				return newLevel;
			}
			return false;

		}

		this.generatePrevLevelIfNotSet = function(levelData){

			if(levelData == undefined){
				levelData = {};
			}
			if( levelData.levelNum == undefined ){
				$.extend(levelData, {
					levelNum : (self.levelNum() - 1)
				}, levelData);
			}

			if(self.prevLevelID() == undefined){
				var newLevel = new Level(levelData);
				newLevel.nextLevelID(self.levelID());
				self.prevLevelID(newLevel.levelID());
				return newLevel;
			}
			return false;

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
			var width 		 = (maxX - minX) + 1,
				height 		 = (maxY - minY) + 1,
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
				if( wallPosition < minBounds ){
					wallPosition+=2;
				}
				//Let's also make sure we don't try and put a door in the top or left border walls either
				if(doorPosition < lengthMinBounds){
					doorPosition+=1;
				}

				var i;

				if( divisionAxis == "vertical" ){
					//For each square in the wall's line, mark the square as a wall (unless it's a door)
					for(i = lengthMinBounds; i <= lengthMaxBounds; i++){
						if( i != doorPosition ){
							self.getSquare(wallPosition, i).isWall = true;
							self.getSquare(wallPosition, i).notEmpty = true;

							if( self.getSquare(wallPosition, i).isDoor == true ){
								console.log('trying to make a door a wall');
							}
						}else{
							self.getSquare(wallPosition, i).isDoor = true;
							if( self.getSquare(wallPosition, i).isWall == true ){
								console.log('trying to make a wall a door');
							}
						}
					}
					//For the remaining spaces on either side of the wall, divide them as well
					self.addDivisions((wallPosition + 1), maxX, minY, maxY);
					self.addDivisions(minX, (wallPosition - 1), minY, maxY);
				}else{
					//For each square in the wall's line, mark the square as a wall (unless it's a door)
					for(i = lengthMinBounds; i <= lengthMaxBounds; i++){
						if( i != doorPosition ){
							self.getSquare(i, wallPosition).isWall = true;
							self.getSquare(i, wallPosition).notEmpty = true;
							if( self.getSquare(i, wallPosition).isDoor == true ){
								console.log('trying to make a door a wall');
							}
						}else{
							self.getSquare(i, wallPosition).isDoor = true;
							if( self.getSquare(i, wallPosition).isWall == true ){
								console.log('trying to make a wall a door');
							}
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
			for(row = self.gridBounds.minY; row <= self.gridBounds.maxY; row++){
				for(col = self.gridBounds.minX; col <= self.gridBounds.maxX; col++){
					if(row == self.gridBounds.minX || row == self.gridBounds.maxX || col == self.gridBounds.minY || col == self.gridBounds.maxY ){
						//Fill in as wall
						self.getSquare(col, row).isWall = true;
						self.getSquare(col, row).notEmpty = true;
					}
				}
			}			
		}

		this.rayCast = function(radius){

			var maxLengths = self._getMaxLengthsForRaysForCurrentPlayerPosition();
			var gridSquareVisibilityCounterObject = {};
			var maxX,
				maxY,
				xDirection,
				yDirection;

			for(var deg = 5; deg <= 360; deg+=self.rayTraceDegreeSteps){
				if(deg <= 90){
					//Top-right quadrant
					maxX = maxLengths.top_right.maxX;
					maxY = maxLengths.top_right.maxY;
					xDirection = "right";
					yDirection = "up";
				}else if(deg <= 180){
					//Top-left quadrant
					maxX = maxLengths.top_left.maxX;
					maxY = maxLengths.top_left.maxY;
					xDirection = "left";
					yDirection = "up";
				}else if(deg <= 270){
					//Bottom-left quadrant
					maxX = maxLengths.bottom_left.maxX;
					maxY = maxLengths.bottom_left.maxY;
					xDirection = "left";
					yDirection = "down";
				}else if(deg <= 360){
					//Bottom-right quadrant
					maxX = maxLengths.bottom_right.maxX;
					maxY = maxLengths.bottom_right.maxY;
					xDirection = "right";
					yDirection = "down";
				}
				self.castSingleRay(deg, maxX, maxY, xDirection, yDirection, gridSquareVisibilityCounterObject);
			}

			var square;
			for(var squareKey in gridSquareVisibilityCounterObject){
				square = gridSquareVisibilityCounterObject[squareKey];
				if(square.visible >= square.not_visible){
					self.getSquare(square.x, square.y).setVisibility(true);
					self.getSquare(square.x, square.y).setScanned(true);
				}
			}

			self.drawMap();
		}

		//Yes, I know this makes it a line segment and not a ray. Shut up.
		this.castSingleRay = function(angle, maxXLength, maxYLength, xDirection, yDirection, gridSquareVisibilityCounterObject){

			var verticalWallCheck,
				verticalWallCheckX,
				verticalWallCheckY,
				horizontalWallCheck,
				horizontalWallCheckX,
				horizontalWallCheckY,
				encounteredWall;

			var squareOrderArray = [];
			var xSquareOrderArray = [];
			var ySquareOrderArray = [];

			//var playerCoords = self._getUnitCoordNearPlayerForLengthAndDirection(0, "up", 0, "right");
			var playerPos = self.getPlayerPos();
			var playerSquare = self.getSquare(playerPos.x, playerPos.y);

			squareOrderArray.push({x : playerSquare.x, y : playerSquare.y});

			for(i = 1; i <= ( maxXLength > maxYLength ? maxXLength : maxYLength ); i++){

				var base, height;
				if(angle == 90 || angle == 270){
					base = 0;
					height = i;
				}else if(angle == 180 || angle == 360){
					base = i;
					height = 0;
				}else{
					base = self._findMissingTriangleSide(angle, undefined, i);
					height = self._findMissingTriangleSide(angle, i, undefined);
				}

				var xSquare = false;
				if( height < maxYLength ){

					//Check for collisions with vertically-oriented edges of wall squares
					var verticalWallCheck = self._getUnitCoordNearPlayerForLengthAndDirection(i, xDirection, height, yDirection);
					verticalWallCheckX = verticalWallCheck.unitX;
					verticalWallCheckY = verticalWallCheck.unitY;

					//Get the square to the right or left
					xSquare = self._getSquareOnEitherSideOfWall(verticalWallCheckX, verticalWallCheckY, xDirection, yDirection);

					if(xSquare && (xSquareOrderArray.length == 0 || xSquareOrderArray[(xSquareOrderArray.length - 1)].x != xSquare.x )){
						xSquareOrderArray.push(xSquare);
					}

				}

				var ySquare = false;
				if( base < maxXLength ){

					//Check for collisions with horizontally-oriented edges of wall squares
					var horizontalWallCheck = self._getUnitCoordNearPlayerForLengthAndDirection(base, xDirection, i, yDirection);
					horizontalWallCheckX = horizontalWallCheck.unitX;
					horizontalWallCheckY = horizontalWallCheck.unitY;

					//Get the square to the top or bottom
					ySquare = self._getSquareOnEitherSideOfWall(horizontalWallCheckX, horizontalWallCheckY, yDirection, xDirection);

					if(ySquare && (ySquareOrderArray.length == 0 || ySquareOrderArray[(ySquareOrderArray.length - 1)].y != ySquare.y )){
						ySquareOrderArray.push(ySquare);
					}

				}

			}//end for loop

			//Iterate through stored squares
				//If < 45, check X first
				//If > 45, check Y first

			var firstArray, secondArray, firstAxis, secondAxis;
			if(angle <= 45 || (angle > 135 && angle <= 225) || angle > 315){
				firstAxis = "x";
				secondAxis = "y";
				firstArray = xSquareOrderArray;
				secondArray = ySquareOrderArray;
			}else{
				firstAxis = "y";
				secondAxis = "x";
				firstArray = ySquareOrderArray;
				secondArray = xSquareOrderArray;
			}
			var omitAxis = (angle % 45 == 0) ? true : false ;

			while(firstArray.length > 0 || secondArray.length > 0){
				//Only choose square if it's adjacent to the previous one
				var currentSquare = squareOrderArray[(squareOrderArray.length - 1)];
				var nextSquare = false;

				for(var f = 0; f < firstArray.length; f++){
					//break on match
					if (self._squaresAreAdjacent(currentSquare, firstArray[f], (omitAxis ? undefined : firstAxis))){
						nextSquare = firstArray.shift();
						break;
					}
				}

				if(!nextSquare){
					for(var s = 0; s < secondArray.length; s++){
						//break on match
						if (self._squaresAreAdjacent(currentSquare, secondArray[s], (omitAxis ? undefined : secondAxis))){
							nextSquare = secondArray.shift();
							break;
						}
					}
				}

				var key = nextSquare.x.toString() + "," + nextSquare.y.toString();

				squareOrderArray.push({x : nextSquare.x, y : nextSquare.y});

				if( gridSquareVisibilityCounterObject[key] === undefined ){
					gridSquareVisibilityCounterObject[key] = {
						visible : 0,
						not_visible : 0,
						x : nextSquare.x,
						y : nextSquare.y
					};
				}

				if(encounteredWall){
					gridSquareVisibilityCounterObject[key].not_visible++;
				}else{
					if(nextSquare.isWall){
						encounteredWall = 1;
					}
					gridSquareVisibilityCounterObject[key].visible++;
				}

				//Maybe add a break if we're at the edge of the map? Although theoretically each array should contain only valid squares, so...
			}

		}

		this._getSquareOnEitherSideOfWall = function(x, y, direction, perpendicularDirection){
			var topLeftX, topLeftY, nearestX, nearestY;
			nearestX = x - (x % self.unitsPerSquare);
			nearestY = y - (y % self.unitsPerSquare);
			var posInSquare = self._isUnitCoordEdgeCornerOrCenter(x, y);

			if(posInSquare == "center"){
				
				topLeftX = nearestX;
				topLeftY = nearestY;

			}else if (posInSquare == "edge"){

				if(direction == "up"){ //y = whole number
					topLeftX = nearestX;
					topLeftY = y - 2;
				}else if(direction == "down"){ //y = whole number
					topLeftX = nearestX;
					topLeftY = y;
				}else if(direction == "left"){ //x = whole number
					topLeftX = x - 2;
					topLeftY = nearestY;
				}else if(direction == "right"){ //x = whole number
					topLeftX = x;
					topLeftY = nearestY;
				}

			}else{
				if( (direction == "right" && perpendicularDirection == "up") || (direction == "up" && perpendicularDirection == "right") ){
					//Same x, up 2 y
					topLeftX = x;
					topLeftY = y - 2;
				} else if( (direction == "left" && perpendicularDirection == "up") || (direction == "up" && perpendicularDirection == "left") ){
					//Left 2 x, up 2 y
					topLeftX = x - 2;
					topLeftY = y - 2;
				} else if( (direction == "right" && perpendicularDirection == "down") || (direction == "down" && perpendicularDirection == "right") ){
					//Same x, same y
					topLeftX = x;
					topLeftY = y;
				} else if( (direction == "left" && perpendicularDirection == "down") || (direction == "down" && perpendicularDirection == "left") ){
					//Same y, left 2 x
					topLeftX = x - 2;
					topLeftY = y;
				}
			}

			var square = self.getSquare(topLeftX / 2, topLeftY / 2);
			return square;
		}

		this._findMissingTriangleSide = function(degrees, base, height){
			var degInRads = degrees * Math.PI/180;
			if(base === undefined){
				base = height / Math.tan(degInRads);
				return Math.abs(base);
			}else{
				height = base * Math.tan(degInRads);
				return Math.abs(height);
			}
		}

		this._getMaxLengthsForRaysForCurrentPlayerPosition = function(){

			var playerUnitCoords = self._getUnitCoordsForPlayerPos();
			var playerX = playerUnitCoords.unitX;
			var playerY = playerUnitCoords.unitY;
			var minXGridBoundsInUnits = self.gridBounds.minX * self.unitsPerSquare;
			var maxXGridBoundsInUnits = (self.gridBounds.maxX + 1) * self.unitsPerSquare;
			var minYGridBoundsInUnits = self.gridBounds.minY * self.unitsPerSquare;
			var maxYGridBoundsInUnits = (self.gridBounds.maxY + 1) * self.unitsPerSquare;

			var maxLengths = {};
			//Top-right
			//Distance from player X coord to grid max X bounds (in units)
			maxX = maxXGridBoundsInUnits - playerX;
			//Distance from player Y coord to grid min Y bounds (in units)
			maxY = playerY - minYGridBoundsInUnits;
			maxLengths.top_right = {};
			maxLengths.top_right.maxX = maxX;
			maxLengths.top_right.maxY = maxY;

			//Top-left
			//Distance from player X coord to grid min X bounds (in units)
			maxX = playerX - minXGridBoundsInUnits;
			//Distance from player Y coord to grid min Y bounds (in units)
			maxY = playerY - minYGridBoundsInUnits;
			maxLengths.top_left = {};
			maxLengths.top_left.maxX = maxX;
			maxLengths.top_left.maxY = maxY;

			//Bottom-left
			//Distance from player X coord to grid min X bounds (in units)
			maxX = playerX - minXGridBoundsInUnits;
			//Distance from player Y coord to grid max Y bounds (in units)
			maxY = maxYGridBoundsInUnits - playerY;
			maxLengths.bottom_left = {};
			maxLengths.bottom_left.maxX = maxX;
			maxLengths.bottom_left.maxY = maxY;

			//Bottom-right
			//Distance from player X coord to grid max X bounds (in units)
			maxX = maxXGridBoundsInUnits - playerX;
			//Distance from player Y coord to grid max Y bounds (in units)
			maxY = maxYGridBoundsInUnits - playerY;
			maxLengths.bottom_right = {};
			maxLengths.bottom_right.maxX = maxX;
			maxLengths.bottom_right.maxY = maxY;

			return maxLengths;
		}

		this._getUnitCoordNearPlayerForLengthAndDirection = function(xLength, xDirection, yLength, yDirection){
			var playerUnitCoords = self._getUnitCoordsForPlayerPos();
			var playerX = playerUnitCoords.unitX;
			var playerY = playerUnitCoords.unitY;
			var newX = playerX,
				newY = playerY;

			if(xDirection == "left"){
				newX = playerX - xLength;
			}
			if(xDirection == "right"){
				newX = playerX + xLength;
			}
			if(yDirection == "up"){
				newY = playerY - yLength;
			}
			if(yDirection == "down"){
				newY = playerY + yLength;
			}

			return {
				unitX : newX,
				unitY : newY,
			};
		}

		this._getUnitCoordsForPlayerPos = function(){
			var unitX = (this.getPlayerPos("x") * 2) + 1;
			var unitY = (this.getPlayerPos("y") * 2) + 1;

			return {
				unitX : unitX,
				unitY : unitY,
			};
		}

		this._squaresAreAdjacent = function(squareOne, squareTwo, axis){

			var xDiff = Math.abs(squareOne.x - squareTwo.x);
			var yDiff = Math.abs(squareOne.y - squareTwo.y);

			if(axis !== undefined){

				if(axis == "x" && yDiff == 0 && xDiff == 1){
					return true;
				}else if(axis == "x" && yDiff > 1){
					return false;
				}else if(axis == "y" && xDiff == 0 && yDiff == 1){
					return true;
				}else if(axis == "y" && xDiff > 1){
					return false;
				}

			}else{

				if(xDiff <= 1 || yDiff <= 1){
					return true;
				}else{
					return false;
				}

			}

		}

		this._getUnitBoundsForSquare = function(squareX, squareY){

			var minUnitX = squareX * 2;
			var minUnitY = squareY * 2;
			var maxUnitX = minUnitX + 2;
			var maxUnitY = minUnitY + 2;

			return {
				minUnitX : minUnitX,
				maxUnitX : maxUnitX,
				minUnitY : minUnitY,
				maxUnitY : maxUnitY,
			};
		}

		this._isUnitCoordEdgeCornerOrCenter = function(x, y){
			if(x % self.unitsPerSquare == 0 && y % self.unitsPerSquare == 0){
				return "corner";
			}else if( x % self.unitsPerSquare > 0 && y % self.unitsPerSquare > 0 ){
				//If we ever add more than 2 units^2 per square, this will only mean "inside", not necessarily "center"
				//So code would have to be adjusted if we still wanted to find a true "center" (and units/square would have to be an even #)
				return "center";
			}else{
				return "edge";
			}
		}

		this.dumpVisualRepresentation = function(){
			var outputString = "";

			for(row = self.gridBounds.minY; row <= self.gridBounds.maxY; row++){
				for(col = self.gridBounds.minX; col <= self.gridBounds.maxX; col++){
					if(self.getSquare(col, row).isWall == false){
						outputString += " ";
					}else{
						outputString += "O";
					}
				}
				outputString += "\n";
			}

			console.log(outputString);
		}

		this.getExportData = function(){

			var exportObj = ko.mapping.toJS({
				playerPos : self.playerPos,
				levelNum : self.levelNum,
				gridBounds : self.gridBounds,
				quadBounds : self.quadBounds,
				unitsPerSquare : self.unitsPerSquare,
				rayTraceDegreeSteps : self.rayTraceDegreeSteps,
				nextLevelID : self.nextLevelID,
				prevLevelID : self.prevLevelID,
				isActive : self.isActive,
				levelID : self.levelID,
				hasGenerated : self.hasGenerated,
				entranceSquare : self.entranceSquare,
				exitSquare : self.exitSquare,
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

		this.revealMap = function(){
			self.scanSquaresNearPlayer(15);
			self.revealSquaresNearPlayer(15);
			self.drawMap();
		}

		this.hideMap = function(){

			for(row_num = self.gridBounds.minY; row_num <= self.gridBounds.maxY; row_num++){
				for(col_num = self.gridBounds.minX; col_num <= self.gridBounds.maxX; col_num++){
					var square = self.getSquare(col_num, row_num);
					square.setVisibility(false);
					square.setScanned(false);
				}
			}

			self.drawMap();
		}

		this.init(levelData);

	}

	Level.prototype.constructor = Level;

	return Level;
});
