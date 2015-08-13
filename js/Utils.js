define([
	'jquery',
	'knockout',
	'md5',
], function($, ko){

	var Utils = {

		//Returns number between min (inclusive) and max (exclusive)
		doRand : function(min, max){
			return Math.floor(Math.random() * (max - min)) + min;
		},
		
		doBasedOnPercent : function(percentageActions, finallyAction){
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
			
			var rand = this.doRand(1,101);
			var percentOffset = 0;
			
			for(i = 0; i < percents.length; i++){

				var targetPercentage = parseInt(percents[i]);
				var addToPercentOffset = parseInt(targetPercentage);

				if( (rand - percentOffset) <= percents[i] ){

					var chosenAction = percentageActions[percents[i]];

					if( chosenAction.constructor == Array ){

						var numPossibilities = chosenAction.length;
						var whichPossibilityIndex = this.doRand(0,numPossibilities);
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
		},

		chooseRandomly : function( opts ){
			var randIdx = this.doRand(0, opts.length);
			return opts[randIdx];
		},
		
		failureMsg : function(messageString){
			displayMessage(messageString, "error", "Oh no!", 8000);
		},
		
		successMsg : function(messageString){
			displayMessage(messageString, "notice", "Success");
		},
		
		displayMessage : function(messageString, type, growlHeader, duration){
			type = type || "warning";
		
			$.growl[type]({ message: messageString, title: growlHeader, duration: duration });
		},

		calculateAveragesForLevel : function(levelNum) {

			var avgPlayerHp = 20 + ((levelNum - 1) * 2);
			var avgMonsterHp;
			if(levelNum == 1){
				avgMonsterHp = avgPlayerHp / 2;
			}else if(levelNum == 2) {
				avgMonsterHp = avgPlayerHp;
			}else {
				avgMonsterHp = avgPlayerHp * 2;
			}
			avgMonsterHp = Math.round( avgMonsterHp );
			var avgPlayerDmgPerHit = Math.round(avgMonsterHp / 4);
			//var avgMonsterDmgPerHit = Math.round(avgPlayerDmgPerHit / 2);
			var avgMonsterDmgPerHit = Math.round( (avgPlayerHp / 10) + (levelNum * 1));

			var averages = {
				avgPlayerHp : avgPlayerHp,
				avgPlayerDmg : avgPlayerDmgPerHit,
				avgMonsterHp : avgMonsterHp,
				avgMonsterDmg : avgMonsterDmgPerHit,
			};

			return averages;
		},

		getExportDataFromObject : function(obj){

			var exportObj = {};
			
			for(prop in obj){
				if ( typeof obj[prop] !== 'function' ){
					exportObj[prop] = obj[prop];
				}else if (ko.isObservable(obj[prop])) {
					exportObj[prop] = obj[prop]();
				}
			}
			
			return exportObj;

		},

		isEmptyObject : function(obj){
			return Object.keys(obj).length === 0;
		},
		
		cloneObject : function(obj){
			
			var newItemData = ko.mapping.toJS(obj);
			
			var className = Object.getPrototypeOf(obj);
			
			var newObj = new className.constructor(newItemData);

			if(newObj.hasOwnProperty("uniqueID")){
				newObj.uniqueID = this.uniqueID();
			}
			
			return newObj;
		},

		microtime : function(get_as_float) {
			var unixtime_ms = (new Date).getTime();
			var sec = Math.floor(unixtime_ms/1000);
			return get_as_float ? (unixtime_ms/1000) : (unixtime_ms - (sec * 1000))/1000 + ' ' + sec;
		},

		uniqueID : function(){
			return md5(this.microtime());
		},

	}

	return Utils;
	
});