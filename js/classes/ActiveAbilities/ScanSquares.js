define([
	'jquery',
	'knockout',
	'classes/ActiveAbility',
	'Utils'
], function($, ko, ActiveAbility, Utils){

	function ScanSquares(data){

		var self = this;

		ActiveAbility.call(this, data);

		this.init = function(data){

		}

		this.doOnLevelUp = function(){
			
			//Improve skill if possible
			if( self.skillLevel() < 6 ){
				self.skillLevel(self.skillLevel() + 1);
			}else{
				self.canTrainNextLevel(0);
				self.didLevelUp = 0;
			}
		}

		this.getTrainCost = function(){
			return (self.skillLevel() + 1) * 1000;
		}

		this.init(data);
	}

	ScanSquares.prototype = Object.create(ActiveAbility.prototype);
	ScanSquares.prototype.constructor = ScanSquares;

	return ScanSquares;
});