define([
	'jquery',
	'knockout',
	'classes/Item',
	'Utils'
], function($, ko, Item, Utils){

	function GearItem(data){

		var self = this;

		data.hasQuality = 1;

		Item.call(this, data);

		this.canEquip( (data.canEquip !== undefined) ? data.canEquip : 1 );
		this.canBreakdown( (data.canBreakdown !== undefined) ? data.canBreakdown : 1 );
		this.canUpgrade( (data.canUpgrade !== undefined) ? data.canUpgrade : 1 );

		self.fullyDynamicStats = (data.fullyDynamicStats !== undefined) ? data.fullyDynamicStats : 1;
		self.level = ko.observable(data.level || 1);

		this.init = function(data){
			self.upgradedWithScrapType = data.upgradedWithScrapType;
			self.salvageValue = ko.computed(function(){
				return Math.round(self.buyValue() / 10);
			});
			self.namedItem = ko.observable(data.namedItem || 0);
		}

		this.doOnEquip = function(player){

		}

		this.doOnUnEquip = function(player){

		}

		this.init(data);
	}

	GearItem.prototype = Object.create(Item.prototype);
	GearItem.prototype.constructor = GearItem;

	return GearItem;
});