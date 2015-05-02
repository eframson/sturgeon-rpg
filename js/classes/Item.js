define([
	'jquery',
	'knockout',
], function($, ko){

	var Item = function(data){
		
		if(data == undefined || data.type == undefined || data.name == undefined || data.id == undefined){
			return false;
		}

		var self = this;

		this.id = data.id;
		this.name = data.name;
		this.type = data.type;
		this.slotsRequired = data.slotsRequired || 1;
		this.stackable = data.stackable || true;
		this.qty = ko.observable(data.qty || 1);
	}

	return Item;

});