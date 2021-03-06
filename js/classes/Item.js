define([
	'jquery',
	'knockout',
	'classes/SaveableObject',
	'Utils'
], function($, ko, SaveableObject, Utils){

	function Item(data){

		if(data == undefined || data.type == undefined || data.name == undefined || data.id == undefined){
			return false;
		}

		SaveableObject.call(this);

		var self = this;

		this.id = data.id;
		this.name = data.name;
		this.type = data.type;
		this.subtype = data.subtype;
		this.slotsRequired = ( data.slotsRequired != undefined ) ? data.slotsRequired : 1;
		this.stackable = ( data.stackable != undefined ) ? data.stackable : true;
		this.qty = ko.observable(data.qty || 1);
		this.desc = data.desc || data.name;
		this._buyValue = (data.buyValue || data._buyValue);
		this._sellValue = (data.sellValue || data._sellValue);
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
		this._forceRecalculate = ko.observable(0);

		this.canUse = ko.observable( (data.canUse !== undefined) ? data.canUse : 0 );
		this.canEquip = ko.observable( (data.canEquip !== undefined) ? data.canEquip : 0 );
		//Whether the item can be SOLD TO a MERCHANT
		this.canSell = ko.observable( (data.canSell !== undefined) ? data.canSell : 1 );
		//Whether the item can be BOUGHT FROM a MERCHANT
		this.canBuy = ko.observable( (data.canBuy !== undefined) ? data.canBuy : 1 );
		this.canBreakdown = ko.observable( (data.canBreakdown !== undefined) ? data.canBreakdown : 0 );
		this.canUpgrade = ko.observable( (data.canUpgrade !== undefined) ? data.canUpgrade : 0 );
		this.canDrop = ko.observable(1);

		if (data.canDrop !== undefined){
			this.canDrop(data.canDrop);
		}else{
			if( this.slotsRequired == 0 ){
				this.canDrop(0);
			}
		}

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

		//How much GP the PLAYER GETS from SELLING an item
		this.sellValue = ko.computed(function(){
			var forceRecalculate = self._forceRecalculate();
			if(self._sellValue !== undefined){
				return self._sellValue;
			}
			return Math.ceil(self._buyValue / 2) || 0;
		});

		//How much GP it COSTS the player to BUY an item
		this.buyValue = ko.computed(function(){
			var forceRecalculate = self._forceRecalculate();
			if(self._buyValue !== undefined){
				return self._buyValue;
			}
			return (self._sellValue * 2) || 0;
		});

		this.costForNextUpgradeLevel = ko.computed(function(){
			if( self.canUpgrade() ){
				return Utils.scrapCostForUpgradeLevel(self.numUpgradesApplied() + 1);
			}
			return false;
		});

		this.applyUpgrade = function(){
			//This should be overridden in a child class
			self._applyUpgrade();
			self._buyValue = self.buyValue() + self.costForNextUpgradeLevel();
			self._forceRecalculate.valueHasMutated();
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

	Item.prototype = Object.create(SaveableObject.prototype);
	Item.prototype.constructor = Item;

	return Item;

});
