define([
	'jquery',
	'knockout',
	'Utils'
], function($, ko, Utils){

	function Item(data){

		if(data == undefined || data.type == undefined || data.name == undefined || data.id == undefined){
			return false;
		}

		var self = this;

		this.id = data.id;
		this.name = data.name;
		this.type = data.type;
		this.slotsRequired = ( data.slotsRequired != undefined ) ? data.slotsRequired : 1;
		this.stackable = ( data.stackable != undefined ) ? data.stackable : true;
		this.qty = ko.observable(data.qty || 1);
		this.desc = data.desc || data.name;
		this.buyValue = ko.observable(data.buyValue || 0);
		this._sellValue = data.sellValue;
		this.minLevelRange = data.minLevelRange || 1;
		this.maxLevelRange = data.maxLevelRange;
		this.canUpgrade = ( data.canUpgrade != undefined ) ? data.canUpgrade : 0;
		this.numUpgradesApplied = ko.observable(data.numUpgradesApplied || 0);
		this.isArmor = false;
		this.isShield = false;
		this.isWeapon = false;
		this.isEquippable = false;
		this.attributesImprovedByLastCrafting = "";
		this.uniqueID = (data.uniqueID || Utils.uniqueID());
		this.canScale = ko.observable(data.canScale || 0);
		this.isScaled = ko.observable(data.isScaled || 0);
		this.canBreakdown = data.canBreakdown || false;

		this.sellValue = ko.computed(function(){
			if(self._sellValue){
				return self._sellValue;
			}
			return Math.ceil(self.buyValue() / 2);
		});

		this.costForNextUpgradeLevel = ko.computed(function(){
			if( self.canUpgrade ){
				return (self.numUpgradesApplied() + 1) * 100;
			}
			return false;
		});

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

		this.applyUpgrade = function(){
			//This should be overridden in a child class
			self._applyUpgrade();
			self.buyValue( self.buyValue() + self.costForNextUpgradeLevel() );
			self.numUpgradesApplied( self.numUpgradesApplied() + 1 );
		}

		this._applyUpgrade = function(){
			//This should be overridden in a child class
		}

		this.scaleStatsForLevel = function(levelNum){
			//This should be overridden in a child class
		}
	}

	/*Item.prototype._applyUpgrade = function(){
		//This should be overridden in a child class
		console.log("I'm not being evaluated, am I?");
	}*/

	Item.prototype.constructor = Item;

	return Item;

});
