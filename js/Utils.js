define([
	'jquery',
	'knockout',
	'md5',
], function($, ko){

	class Utils {

		//Returns number between min (inclusive) and max (exclusive)
		static doRand(min, max){
			return Math.floor(Math.random() * (max - min)) + min;
		}
		
		static doBasedOnPercent(percentageActions, finallyAction){
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
		}

		static chooseRandomly( opts ){
			var randIdx = this.doRand(0, opts.length);
			return opts[randIdx];
		}
		
		//Commented out until I actually use it
		/*failureMsg(messageString){
			displayMessage(messageString, "error", "Oh no!", 8000);
		},
		
		successMsg(messageString){
			displayMessage(messageString, "notice", "Success");
		},
		
		displayMessage(messageString, type, growlHeader, duration){
			type = type || "warning";
		
			$.growl[type]({ message: messageString, title: growlHeader, duration: duration });
		},*/

		static calculateAveragesForLevel(levelNum) {

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
		}

		static projectedStatAllotmentsForLevel(levelNum){
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
			var armorBaseAC = 0.25 * (levelNum * 10);
			output.player.armor = {
				poor : Math.round(0.5 * armorBaseAC),
				//AC of good quality item: 1.9x poor quality item
				good : Math.round(1.0 * armorBaseAC),
				//AC of great quality item: 3.2x poor quality item
				great : Math.round(1.5 * armorBaseAC),
				//AC of epic quality item: 4.7x poor quality item
				exceptional : Math.round(2.0 * armorBaseAC),
			};

			//AC of poor quality shield: .5% of player HP
			var shieldBaseAC = armorBaseAC;
			output.player.shield = {
				poor : Math.round(0.5 * shieldBaseAC),
				//AC of good quality shield: 1.9x poor quality shield
				good : Math.round(1.0 * shieldBaseAC),
				//AC of great quality shield: 3.1x poor quality shield
				great : Math.round(1.5 * shieldBaseAC),
				//AC of epic quality shield: 4.5x poor quality shield
				exceptional : Math.round(2.0 * shieldBaseAC),
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
		}

		static calculateDmgForArmorAndLevel(dmg, armor, levelNum, dmgType){
			var actualDmg;
			//2
			//var minDmg = 0.20 * dmg;

			//1
			//actualDmg = dmg * ( (100 + ((levelNum - 5) * 0.65) ) / (100 + armor) );

			//3
			//actualDmg = dmg - armor;

			//1
			//return Math.round(actualDmg);
			//2
			//return Math.round( (actualDmg >= minDmg) ? actualDmg : minDmg );

			//3
			if(armor){
				//This is how we're capping armor effectiveness for now
				armor = (armor >= 1000) ? 1000 : armor ;
				var pctDmgAbsorbed = Math.log(armor+1)/Math.log(3000);
				//Armor is more effective against light attacks, and less effective against heavy attacks
				if(dmgType == "light"){
					pctDmgAbsorbed = pctDmgAbsorbed * 1.30;
				}else if(dmgType == "heavy"){
					pctDmgAbsorbed = pctDmgAbsorbed * 0.75;
				}
				pctDmgAbsorbed = (pctDmgAbsorbed < 0.85) ? pctDmgAbsorbed : 0.85 ;
				actualDmg = Math.round( dmg * (1 - pctDmgAbsorbed) );
			}else{
				actualDmg = dmg;
			}

			//4
			//ln(1x^n + 0) //n = 0.08

			return actualDmg;
		}

		static getObjectAsArrayIndexedByNumericalSortOrder (object, sortFieldName){

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

				return (left > right) ? 1 : (left < right) ? -1 : 0 ;
			});

			return outputArray;

		}

		static getPossibleQualities(){
			var qualities = [
				"poor",
				"good",
				"great",
				"exceptional"
			];
			return qualities;
		}

		static getPossibleQualitiesWithPossibilities(){
			var qualities = {
				35 : "poor",
				45 : "good",
				15 : "great",
				5 : "exceptional"
			};
			return qualities;
		}

		static getWeaponQualityDescriptors(){
			var qualities = {
				"poor" : "Crude",
				"good" : "Sturdy",
				"great" : "High-Quality",
				"exceptional" : "Deadly",
			};
			return qualities;
		}

		static getExportDataFromObject(obj){

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

		}

		static scrapCostForUpgradeLevel(targetUpgradeLevel){
			return targetUpgradeLevel * 100;
		}

		static isEmptyObject(obj){
			if(obj == undefined || obj == null || typeof obj !== 'object'){
				//Not sure why we were encountering this error...
				return true;
			}
			return Object.keys(obj).length === 0;
		}
		
		static cloneObject(obj, genNewUniqueID){
			
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
		}

		static microtime(get_as_float) {
			var unixtime_ms = (new Date).getTime();
			var sec = Math.floor(unixtime_ms/1000);
			return get_as_float ? (unixtime_ms/1000) : (unixtime_ms - (sec * 1000))/1000 + ' ' + sec;
		}

		static uniqueID(){
			return md5(this.microtime());
		}

		static makeMagicReplacements(string, objectsToCheck) {

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
		}

	}

	String.prototype.toProperCase = function () {
		return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	};

	return Utils;
	
});