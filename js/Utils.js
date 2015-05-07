define([
	'jquery',
], function($){

	//Returns number between min (inclusive) and max (exclusive)
	doRand = function(min, max){
		return Math.floor(Math.random() * (max - min)) + min;
	}
	
	doBasedOnPercent = function(percentageActions, finallyAction){
		var percents;
		if(percentageActions == undefined){
			return false;
		}

		var discretePercents = Object.keys(percentageActions);
		var percents = Array();

		for(i = 0; i < discretePercents.length; i++){

			if( percentageActions[discretePercents[i]].constructor == Array ){

				for(j=0; j < percentageActions[discretePercents[i]].length; j++){
					percents.push(discretePercents[i]);
				}

			}else{
				percents.push(discretePercents[i]);
			}

		}

		percents.sort();
		
		var rand = doRand(1,101);
		var percentOffset = 0;
		
		for(i = 0; i < percents.length; i++){

			var targetPercentage = percents[i];
			var addToPercentOffset = targetPercentage;

			if( (rand - percentOffset) <= percents[i] ){

				var chosenAction = percentageActions[percents[i]];

				if( chosenAction.constructor == Array ){

					var numPossibilities = chosenAction.length;
					var whichPossibilityIndex = doRand(0,numPossibilities);
					chosenAction = chosenAction[whichPossibilityIndex];

				}

				if(typeof chosenAction === 'function'){
					return chosenAction(rand);
				}else{
					return chosenAction;
				}

			}else{
				percentOffset += addToPercentOffset;
			}
		}
		
		if(finallyAction && typeof finallyAction === 'function'){
			return finallyAction(rand);
		}
		
		//lolwut?
		console.log(rand + " did not match");
		console.log("percentageActions:");
		console.log(percentageActions);
		console.log("percents:");
		console.log(percents);
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