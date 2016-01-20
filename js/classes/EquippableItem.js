define([
	'jquery',
	'knockout',
	'classes/Item',
	'Utils'
], function($, ko, Item, Utils){

	function EquippableItem(data){

		var self = this;

		Item.call(this, data);

		this.init = function(data){
			self.level = ko.observable(data.level || 1);
			self.canUpgrade = ( data.canUpgrade != undefined ) ? data.canUpgrade : 1;
			self.canBreakdown = ( data.canBreakdown != undefined ) ? data.canBreakdown : 1;
			self.numUpgradesApplied = ko.observable(data.numUpgradesApplied || 0);
			self.attributesImprovedByLastCrafting = "";
			self.isEquippable = true;
			self.fullyDynamicStats = data.fullyDynamicStats || 1;
		}

		this.costForNextUpgradeLevel = ko.computed(function(){
			if( self.canUpgrade ){
				return (self.numUpgradesApplied() + 1) * 100;
			}
			return false;
		});

		this.applyUpgrade = function(){
			//This should be overridden in a child class
			self._applyUpgrade();
			self.buyValue( self.buyValue() + self.costForNextUpgradeLevel() );
			self.numUpgradesApplied( self.numUpgradesApplied() + 1 );
		}

		this._applyUpgrade = function(){
			//This should be overridden in a child class
		}

		this.doOnEquip = function(player){

		}

		this.doOnUnEquip = function(player){

		}

		this.init(data);
	}

	EquippableItem.prototype = Object.create(Item.prototype);
	EquippableItem.prototype.constructor = EquippableItem;

	return EquippableItem;
});