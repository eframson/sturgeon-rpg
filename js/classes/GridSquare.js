define([
	'jquery',
	'knockout',
	'classes/SaveableObject',
], function($, ko, SaveableObject){

	var GridSquare = function(squareData){
		
		if(squareData == undefined || squareData.x == undefined || squareData.y == undefined){
			return false;
		}

		SaveableObject.call(this);

		var self = this;
		this.x = squareData.x;
		this.y = squareData.y;
		this.type = squareData.type;
		this.isVisible = squareData.isVisible || false;
		this.isScanned = squareData.isScanned || false;
		this.isDone = squareData.isDone || false;
		this.notEmpty = squareData.notEmpty || false;
		this.isChallengeActive = ko.observable(squareData.isChallengeActive || false);
		this.isWall = squareData.isWall || false;
		this.isDoor = squareData.isDoor || false;
		this.isVisited = squareData.isVisited || false;

		this.setType = function(type){
			self.type = type;
		}

		this.setVisibility = function(isVisible){
			this.isVisible = isVisible;
		}
		
		this.setScanned = function(isScanned){
			this.isScanned = isScanned;
		}
		
		this.setDone = function(isDone){
			this.isDone = isDone;
		}
		
		this.getExportData = function(){
			
			var exportObj = {};
			
			for(prop in self){
				if ( typeof self[prop] !== 'function' ){
					exportObj[prop] = self[prop];
				}else if (ko.isObservable(self[prop])) {
					exportObj[prop] = self[prop]();
				}
			}
			
			return exportObj;
		}
		
	}

	GridSquare.prototype = Object.create(SaveableObject.prototype);
	GridSquare.prototype.constructor = GridSquare;

	return GridSquare;

});