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
		this.subtype = data.subtype;
		this.slotsRequired = ( data.slotsRequired != undefined ) ? data.slotsRequired : 1;
		this.stackable = ( data.stackable != undefined ) ? data.stackable : true;
		this.qty = ko.observable(data.qty || 1);
		this.desc = data.desc || data.name;
		this.buyValue = ko.observable(data.buyValue || 0);
		this._sellValue = data.sellValue;
		this.minLevelRange = data.minLevelRange || 1;
		this.maxLevelRange = data.maxLevelRange;
		this.numUpgradesApplied = ko.observable(data.numUpgradesApplied || 0);
		this.isArmor = false;
		this.isShield = false;
		this.isWeapon = false;
		this.isEquippable = false;
		this.attributesImprovedByLastCrafting = "";
		this.uniqueID = (data.uniqueID || Utils.uniqueID());
		this.isScaled = ko.observable(data.isScaled || 0);
		this.isEquipped = ko.observable(false);
		this.quality = ko.observable(data.quality || "good"); //poor, good, great, exceptional
		this.qualityModifier = undefined;
		this.hasQuality = (data.hasQuality !== undefined) ? data.hasQuality : 0;

		this.canEquip = ko.observable( (data.canEquip !== undefined) ? data.canEquip : 0 );
		this.canBreakdown = ko.observable( (data.canBreakdown !== undefined) ? data.canBreakdown : 0 );
		this.canUse = ko.observable( (data.canUse !== undefined) ? data.canUse : 0 );
		this.canUpgrade = ko.observable( (data.canUpgrade !== undefined) ? data.canUpgrade : 0 );

		if(data.qualityModifier){
			self.qualityModifier = data.qualityModifier;
		}else if(self.quality() == "poor"){
			self.qualityModifier = 0.7;
		}else if(self.quality() == "good"){
			self.qualityModifier = 1;
		}else if(self.quality() == "great"){
			self.qualityModifier = 1.3;
		}else if(self.quality() == "exceptional"){
			self.qualityModifier = 1.5;
		}else {
			self.qualityModifier = 1;
		}

		this.sellValue = ko.computed(function(){
			if(self._sellValue){
				return self._sellValue;
			}
			var buyValue = self.buyValue();
			return Math.ceil(buyValue / 2);
		});

		this.canSell = ko.computed(function(){
			return self.sellValue() > 0;
		});

		this.canBuy = ko.computed(function(){
			return self.buyValue() > 0;
		});

		this.costForNextUpgradeLevel = ko.computed(function(){
			if( self.canUpgrade() ){
				return Utils.scrapCostForUpgradeLevel(self.numUpgradesApplied() + 1);
			}
			return false;
		});

		this.getExportData = function(){

			var exportObj = {};

			exportObj._classNameForLoad = self.constructor.name;

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
