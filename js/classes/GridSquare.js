define([
	'jquery',
	'knockout',

	'Utils',
], function($, ko){

	var GridSquare = function(x, y, type, isVisible, isScanned){

		if(x == undefined || y == undefined){
			return false;
		}

		var self = this;
		this.x = x;
		this.y = y;
		this.type = type;
		this.isVisible = isVisible || false;
		this.isScanned = isScanned || false;

		this.setType = function(type){
			self.type = type;
		}

		this.setVisibility = function(isVisible){
			this.isVisible = isVisible;
		}
		
		this.setScanned = function(isScanned){
			this.isScanned = isScanned;			
		}
		
	}

	return GridSquare;

});