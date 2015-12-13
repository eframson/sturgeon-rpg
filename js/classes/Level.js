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
				return [minX, maxY];
			}else if(startCorner == "bot left"){
				return [maxX, minY];
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

		this.getSquare = function(x, y){
			if(x == undefined || y == undefined){
				return false;
			}
			return self.grid[y][x];
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

		this.generateThisLevel = function(isRegenerate, doDraw){
			isRegenerate = ( isRegenerate == undefined ) ? false : isRegenerate ;

			if(isRegenerate){
				self.entranceSquare([]);
				self.exitSquare([]);
			}

			self._generateGrid();
			self._fillInGridWalls();
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
							self.grid[i][wallPosition].isWall = true;
							self.grid[i][wallPosition].notEmpty = true;

							if( self.grid[i][wallPosition].isDoor == true ){
								console.log('trying to make a door a wall');
							}
						}else{
							self.grid[i][wallPosition].isDoor = true;
							if( self.grid[i][wallPosition].isWall == true ){
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
							self.grid[wallPosition][i].isWall = true;
							self.grid[wallPosition][i].notEmpty = true;
							if( self.grid[wallPosition][i].isDoor == true ){
								console.log('trying to make a door a wall');
							}
						}else{
							self.grid[wallPosition][i].isDoor = true;
							if( self.grid[wallPosition][i].isWall == true ){
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

		this.init(levelData);

	}

	Level.prototype.constructor = Level;

	return Level;
});
