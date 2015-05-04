define([
	'jquery',
], function($){

	//Returns number between min (inclusive) and max (exclusive)
	rand = function(min, max){
		return Math.floor(Math.random() * (max - min)) + min;
	}
	
	doBasedOnPercent = function(percentageActions, finallyAction){
		var percents;
		if(percentageActions == undefined){
			return false;
		}
		percents = $.map(Object.keys(percentageActions), function(elem, idx){ return parseInt(elem); });
		percents.sort();
		
		var totalPercent = 0;;
		for(i = 0; i < percents.length; i++){
			totalPercent += percents[i];
		}
		
		if(totalPercent > 100){
			return false;
		}
		
		var rand = Math.floor(Math.random() * 100);
		var percentOffset = 0;
		
		console.log(rand);
		
		for(i = 0; i < percents.length; i++){
			if( rand < (percents[i] + percentOffset) ){
				return percentageActions[percents[i]]();
			}else{
				percentOffset += percents[i];
			}
		}
		
		if(finallyAction && typeof finallyAction === 'function'){
			return finallyAction();
		}
		
		//lolwut?
		return false;
	}
	
	failureMsg = function(messageString){
		displayMessage(messageString, "error", "Oh no!", 8000);
	}
	
	successMsg = function(messageString){
		displayMessage(messageString, "notice", "Success");
	}
	
	displayMessage = function(messageString, type, growlHeader, duration){
		type = type || "warning";
	
		$.growl[type]({ message: messageString, title: growlHeader, duration: duration });
	}
	
});