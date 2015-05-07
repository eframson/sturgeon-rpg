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
		this.slotsRequired = data.slotsRequired || 1;
		this.stackable = data.stackable || true;
		this.qty = ko.observable(data.qty || 1);
		this.desc = data.desc || data.name;
		
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

		this.clone = function(){
			return new Item(ko.mapping.toJS(self));
		}
	}

	Item.prototype.constructor = Item;

	return Item;

});