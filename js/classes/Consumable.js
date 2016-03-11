define([
	'jquery',
	'knockout',
	'classes/Item',
	'Utils'
], function($, ko, Item, Utils){

	function Consumable(data){

		var self = this;

		data.type = "consumables";

		Item.call(this, data);

		this.canUse((data.canUse !== undefined) ? data.canUse : 1 );

		this.init = function(data){
			self.isFood = data.isFood || 0;
			self.hasQuality = 1;
		}

		this.init(data);
	}
	
	Consumable.prototype = Object.create(Item.prototype);
	Consumable.prototype.constructor = Consumable;

	return Consumable;
});