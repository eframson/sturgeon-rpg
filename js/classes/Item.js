define([
	'jquery',
	'knockout',
], function($, ko){

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
		this.buyValue = data.buyValue || 0;
		this.minLevelRange = data.minLevelRange || 1;
		this.maxLevelRange = data.maxLevelRange;
		
		this.sellValue = ko.computed(function(){
			return Math.ceil(self.buyValue / 2);
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
	}

	Item.prototype.constructor = Item;

	return Item;

});