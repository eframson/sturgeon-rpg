define([
	'jquery',
	'knockout',
], function($, ko){

	var Item = function(data){

		var self = this;

		this.name = data.name || "";
		this.slotsRequired = data.slotsRequired || 0;
	}

	return Item;

});