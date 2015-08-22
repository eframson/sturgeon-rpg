define([
	'jquery',
	'knockout',
	'classes/Item',
	'Utils'
], function($, ko, Item, Utils){

	function GearItem(data){

		var self = this;

		data.canEquip = (data.canEquip !== undefined) ? data.canEquip : 1;
		data.canBreakdown = (data.canBreakdown !== undefined) ? data.canBreakdown : 1;
		data.canUpgrade = (data.canUpgrade !== undefined) ? data.canUpgrade : 1;

		Item.call(this, data);

		this.init = function(data){
			self.upgradedWithScrapType = data.upgradedWithScrapType;
			self.salvageValue = ko.computed(function(){
				return Math.round(self.buyValue() / 10);
			});
		}

		this.init(data);
	}

	GearItem.prototype = Object.create(Item.prototype);
	GearItem.prototype.constructor = GearItem;

	return GearItem;
});