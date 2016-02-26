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
		
		//Commented out until I actually use it
		/*failureMsg : function(messageString){
			displayMessage(messageString, "error", "Oh no!", 8000);
		},
		
		successMsg : function(messageString){
			displayMessage(messageString, "notice", "Success");
		},
		
		displayMessage : function(messageString, type, growlHeader, duration){
			type = type || "warning";
		
			$.growl[type]({ message: messageString, title: growlHeader, duration: duration });
		},*/

		calculateAveragesForLevel : function(levelNum) {

			var avgPlayerHp = 20 + ((levelNum - 1) * 2);
			var avgMonsterHp;
			if(levelNum == 1){
				avgMonsterHp = avgPlayerHp / 3;
			}else if(levelNum == 2) {
				avgMonsterHp = avgPlayerHp;
			}else {
				avgMonsterHp = avgPlayerHp * 2;
			}
			avgMonsterHp = Math.round( avgMonsterHp );
			var avgPlayerDmgPerHit = Math.round(avgMonsterHp / 5);

			var avgMonsterDmgPerHit = Math.round( (avgPlayerHp / 10) + (levelNum * 1));

			var avgPlayerArmorValue;
			
			if(levelNum < 5){
				avgPlayerArmorValue = Math.round(levelNum * 5);
			}else if(levelNum < 10){
				avgPlayerArmorValue = Math.round(levelNum * 4);
			}else {
				avgPlayerArmorValue = Math.round(levelNum * 3);
			}

			avgPlayerArmorValue = Math.round(avgPlayerArmorValue);

			var averages = {
				avgPlayerHp : avgPlayerHp,
				avgPlayerDmg : avgPlayerDmgPerHit,
				avgMonsterHp : avgMonsterHp,
				avgMonsterDmg : avgMonsterDmgPerHit,
				avgPlayerArmorValue : avgPlayerArmorValue
			};

			return averages;
		},

		calculateDmgForArmorAndLevel : function(dmg, armor, levelNum){
			var actualDmg;

			if(levelNum < 5){
				actualDmg = dmg * Math.pow(0.95, armor);
			}else if(levelNum < 10){
				actualDmg = dmg * Math.pow(0.97, armor);
			}else if(levelNum < 20){
				actualDmg = dmg * Math.pow(0.98, armor);
			}else{
				actualDmg = dmg * Math.pow(0.99, armor);
			}
			actualDmg = Math.round(actualDmg);

			return actualDmg;
		},

		getObjectAsArrayIndexedByNumericalSortOrder : function(object, sortFieldName){

			sortFieldName = sortFieldName || "sortOrder";

			var outputArray = $.map(object, function(elem, idx){
				return elem;
			});

			outputArray.sort(function(left, right){
				if(typeof left[sortFieldName] == 'function'){
					left = left[sortFieldName]();
				}else{
					left = left[sortFieldName];
				}

				if(typeof right[sortFieldName] == 'function'){
					right = right[sortFieldName]();
				}else{
					right = right[sortFieldName];
				}

				left = parseInt(left);
				right = parseInt(right);

				return (left > right) ? 1 : -1 ;

				if(left == right){
					return 0;
				}
			});

			return outputArray;

		},

		getPossibleQualities : function(){
			var qualities = [
				"poor",
				"good",
				"great",
				"exceptional"
			];
			return qualities;
		},

		getExportDataFromObject : function(obj){

			var exportObj;

			if(typeof obj == "string" || typeof obj == "number"){
				exportObj = obj;
			}else if(typeof obj == "object"){
				if(Array.isArray(obj)){
					exportObj = [];
					for (i = 0; i < obj.length; i++){
						exportObj.push(this.getExportDataFromObject(obj[i]));
					}
				}else{
					exportObj = {};
					if( obj.hasOwnProperty("getExportData") && typeof obj.getExportData == "function" ){
						exportObj = this.getExportDataFromObject(obj.getExportData());
					}else{
						exportObj= {};
						for(prop in obj){
							exportObj[prop] = this.getExportDataFromObject(obj[prop]);
						}
					}
					
				}
			}else if(typeof obj == "function"){
				if(ko.isObservable(obj)){
					exportObj = this.getExportDataFromObject(obj())
				}else if(ko.isComputed(obj)){
					//Do nothing if it's a computed function
					exportObj = undefined;
				}else{
					//Do nothing if it's a regular function
					exportObj = undefined;
				}
			}

			return exportObj;

		},

		scrapCostForUpgradeLevel : function(targetUpgradeLevel){
			return targetUpgradeLevel * 100;
		},

		isEmptyObject : function(obj){
			return Object.keys(obj).length === 0;
		},
		
		cloneObject : function(obj, genNewUniqueID){
			
			var newItemData = ko.mapping.toJS(obj);
			
			var className = Object.getPrototypeOf(obj);
			
			var newObj = new className.constructor(newItemData);

			var newUniqueID;
			if(genNewUniqueID){
				newUniqueID = this.uniqueID();
			}else{
				newUniqueID = obj.uniqueID || this.uniqueID();
			}

			if(newObj.hasOwnProperty("uniqueID")){
				newObj.uniqueID = newUniqueID;
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

		makeMagicReplacements : function(string, objectsToCheck) {

			if(string == undefined || objectsToCheck == undefined || (Array.isArray(objectsToCheck) && objectsToCheck.length == 0) ){
				return false;
			}

			if( !Array.isArray(objectsToCheck) ){
				objectsToCheck = [objectsToCheck];
			}

			var magicDesc = string;
			var matches = string.match(/%[^%]+%/g);

			if(matches != undefined){
				for(var i = 0; i < matches.length; i++){
					var trimmedMatch = matches[i].replace(/%/g, "");

					for(j = 0; j < objectsToCheck.length; j++){
						var object = objectsToCheck[j];

						if(object == undefined || object[trimmedMatch] == undefined){
							continue;
						}

						if( typeof object[trimmedMatch] == "function" ){
							magicDesc = magicDesc.replace("%" + trimmedMatch + "%", object[trimmedMatch]());
						}else{
							magicDesc = magicDesc.replace("%" + trimmedMatch + "%", object[trimmedMatch]);
						}
					}
				}
			}

			return magicDesc;
		},

	}

	String.prototype.toProperCase = function () {
		return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	};

	return Utils;
	
});