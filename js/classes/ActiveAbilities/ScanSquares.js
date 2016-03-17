define([
	'jquery',
	'knockout',
	'classes/LevelableActiveAbility',
	'Utils'
], function($, ko, LevelableActiveAbility, Utils){

	function ScanSquares(data){

		var self = this;

		LevelableActiveAbility.call(this, data);

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
			return (500 * self.skillLevel());
		}

		this.init(data);
	}

	ScanSquares.prototype = Object.create(LevelableActiveAbility.prototype);
	ScanSquares.prototype.constructor = ScanSquares;

	return ScanSquares;
});