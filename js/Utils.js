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
			//Not necessary to keep logging this, it can happen legitimately
			/*console.log(rand + " did not match");
			console.log("percentageActions:");
			console.log(percentageActions);
			console.log("percents:");
			console.log(percents);*/
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

			//Avg. player HP
			var avgPlayerHp = 20 + ((levelNum - 1) * 7);
			
			//Avg. monster HP (used for determining monster stats)
			var avgMonsterHp = 7 + ((avgPlayerHp / 2) * Math.pow(1.01, levelNum));

			//Nerf monster HP for lvls 1 & 2
			if(levelNum == 1){
				avgMonsterHp = avgMonsterHp * 0.8;
			}else if(levelNum == 2) {
				avgMonsterHp = avgMonsterHp * 0.9;
			}
			avgMonsterHp = Math.round( avgMonsterHp );

			//Avg player dmg per hit (used for calculating weapon stats)
			var avgPlayerDmgPerHit = Math.round(avgMonsterHp / 5);

			//Estimated avg. player AC (about halfway between shieldless / shield equipped)
			var estPlayerArmor = levelNum * 4.4;

			//Avg monster dmg per hit (used for determining monster stats)
			var avgMonsterDmgPerHit = (avgPlayerHp / 4) + estPlayerArmor;

			//Nerf monster dmg for lvl 1
			if( levelNum == 1 ){
				avgMonsterDmgPerHit = avgMonsterDmgPerHit * 0.4;
			}else if(levelNum == 2) {
				avgMonsterDmgPerHit = avgMonsterDmgPerHit * 0.6;
			}
			avgMonsterDmgPerHit = Math.round(avgMonsterDmgPerHit);

			//Avg player armor value (used for calculating armor stats)
			var avgPlayerArmorValue;
			
			//Buff up armor stats for first 4 levels
			if(levelNum < 3){
				avgPlayerArmorValue = levelNum * 5;
			}else if(levelNum < 5){
				avgPlayerArmorValue = levelNum * 4;
			}else {
				avgPlayerArmorValue = levelNum * 3;
			}
			avgPlayerArmorValue = Math.round(avgPlayerArmorValue);

			var averages = {
				avgPlayerHp : avgPlayerHp,
				avgPlayerDmg : avgPlayerDmgPerHit,
				avgMonsterHp : avgMonsterHp,
				avgMonsterDmg : avgMonsterDmgPerHit,
				avgPlayerArmorValue : avgPlayerArmorValue,
				estPlayerArmor : estPlayerArmor,
			};

			return averages;
		},

		projectedStatAllotmentsForLevel : function(levelNum){
			levelNum = levelNum || 1;

			var output = {
				player : {},
				monster : {},
			};

			//100 + (30 * levelNum)
			output.player.hp = 100 + (30 * (levelNum - 1));

			//Base monster DMG = 33% of player HP
			output.monster.baseDmg = Math.round(output.player.hp * .33);

			//Full poor armor should reduce dmg taken to: 29% player HP
			//Full good armor should reduce dmg taken to: 25% player HP
			//Full great armor should reduce dmg taken to: 20% player HP
			//Full epic armor should reduce dmg taken to: 14% player HP

			//AC of poor quality item: 1% of player HP
			var armorBaseAC = .01 * output.player.hp;
			output.player.armor = {
				poor : Math.round(1.0 * armorBaseAC),
				//AC of good quality item: 1.9x poor quality item
				good : Math.round(1.9 * armorBaseAC),
				//AC of great quality item: 3.2x poor quality item
				great : Math.round(3.2 * armorBaseAC),
				//AC of epic quality item: 4.7x poor quality item
				exceptional : Math.round(4.7 * armorBaseAC),
			};

			//AC of poor quality shield: .5% of player HP
			var shieldBaseAC = .005 * output.player.hp;
			output.player.shield = {
				poor : Math.round(1.0 * shieldBaseAC),
				//AC of good quality shield: 1.9x poor quality shield
				good : Math.round(1.9 * shieldBaseAC),
				//AC of great quality shield: 3.1x poor quality shield
				great : Math.round(3.1 * shieldBaseAC),
				//AC of epic quality shield: 4.5x poor quality shield
				exceptional : Math.round(4.5 * shieldBaseAC),
			};

			//Player can't reduce dmg below 5% of total HP
			output.player.minDmgReceived = Math.round(.05 * output.player.hp);

			//Monster HP is 3x player HP
			output.monster.hp = output.player.hp * 3;

			//AVG DMG of Epic quality weapon deals 31% monster HP
			//AVG DMG of Great quality weapon deals 25% monster HP
			//AVG DMG of Good quality weapon deals 20% monster HP
			//AVG DMG of Poor quality weapon deals 16% monster HP

			//AVG DMG of poor quality item: 48% of player HP
			var weaponBaseDMG = .48 * output.player.hp;
			//1H weapon deals 10% less (avg) than that
			var oneHandedWeaponBaseDMG = 0.9 * weaponBaseDMG;
			//2H weapon deals 20% more (avg) dmg than that
			var twoHandedWeaponBaseDMG = 1.1 * weaponBaseDMG;

			output.player.weapon = {
				1 : {
					poor : Math.round(1.0 * oneHandedWeaponBaseDMG),
					//DMG of good quality weapon: 1.2x poor quality weapon
					good : Math.round(1.2 * oneHandedWeaponBaseDMG),
					//DMG of great quality weapon: 1.6x poor quality weapon
					great : Math.round(1.6 * oneHandedWeaponBaseDMG),
					//DMG of epic quality weapon: 1.9x poor quality weapon
					exceptional : Math.round(1.9 * oneHandedWeaponBaseDMG),
				},
				2 : {
					poor : Math.round(1.0 * twoHandedWeaponBaseDMG),
					//DMG of good quality weapon: 1.2x poor quality weapon
					good : Math.round(1.2 * twoHandedWeaponBaseDMG),
					//DMG of great quality weapon: 1.6x poor quality weapon
					great : Math.round(1.6 * twoHandedWeaponBaseDMG),
					//DMG of epic quality weapon: 1.9x poor quality weapon
					exceptional : Math.round(1.9 * twoHandedWeaponBaseDMG),
				},
			};

			return output;
		},

		calculateDmgForArmorAndLevel : function(dmg, armor, levelNum){
			var actualDmg;
			//2
			//var minDmg = 0.20 * dmg;

			//1
			//actualDmg = dmg * ( (100 + ((levelNum - 5) * 0.65) ) / (100 + armor) );

			//3
			actualDmg = dmg - armor;
			return actualDmg;

			//1
			//return Math.round(actualDmg);
			//2
			//return Math.round( (actualDmg >= minDmg) ? actualDmg : minDmg );
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

		getPossibleQualitiesWithPossibilities : function(){
			var qualities = {
				35 : "poor",
				45 : "good",
				15 : "great",
				5 : "exceptional"
			};
			return qualities;
		},

		getWeaponQualityDescriptors : function(){
			var qualities = {
				"poor" : "Crude",
				"good" : "Sturdy",
				"great" : "High-Quality",
				"exceptional" : "Deadly",
			};
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
			if(obj == undefined || obj == null || typeof obj !== 'object'){
				//Not sure why we were encountering this error...
				return true;
			}
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