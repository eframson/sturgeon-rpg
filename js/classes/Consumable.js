define([
	'jquery',
	'knockout',
	'classes/Item',
	'Utils'
], function($, ko, Item, Utils){

	function Consumable(data){

		var self = this;

		Item.call(this, data);

		this.init = function(data){
			//Nothing special here
		}

		this.init(data);
	}
	
	Consumable.prototype = Object.create(Item.prototype);
	Consumable.prototype.constructor = Consumable;

	return Consumable;
});