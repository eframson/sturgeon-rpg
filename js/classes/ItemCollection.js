define([
	'jquery',
	'knockout',
	'classes/Item'
], function($, ko, Item){

	function ItemCollection(items){
		
		var self = this;

		items = items || Array();

		this.items = ko.observableArray(items);

		//It would be nice if we could add this function just to the instance of ko
		//returned by this class rather than the global ko obj, but we'll see...
		//Maybe cloning?
		//http://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-clone-an-object
		//var newObject = jQuery.extend(true, {}, oldObject);
		this.getItemByID = function(itemID){

			var items = self.items();

			for(i = 0; i < items.length; i++){
				if( itemID == items[i].id ){
					return items[i];
				}
			}
			return false;

		}

		this.setItemQty = function(itemOrItemID, qty){

			if(!itemOrItemID || typeof qty != "number"){
				return false;
			}

			//There's probably a better way to check for this...
			if(typeof itemOrItemID != "object"){
				itemOrItemID = self.getItemByID(itemID);
			}

			itemOrItemID.qty(qty);

		}

		this.removeItem = function(itemOrItemID, qty){

			//If it's not an Item instance, treat it as an item ID
			if(!(itemOrItemID instanceof Item)){
				itemOrItemID = self.getItemByID(itemOrItemID);
			}

			if(!itemOrItemID){
				return false
			}

			var existingQty = itemOrItemID.qty();

			//If qty is undefined or if qty is equal to "all" or it's greater than the item qty we currently have
			if( qty == undefined || qty && (qty == "all" || qty >= existingQty) ){
				self.items.remove(itemOrItemID);
				return 0;
			}else{
				itemOrItemID.qty( existingQty - qty );
				return itemOrItemID.qty();
			}
		}

		this.addItem = function(itemToAdd, extraCanAddCheck, afterAddCallback){

			if(itemToAdd == undefined || !(itemToAdd instanceof Item) ){
				return false;
			}

			var existingItem = self.getItemByID(itemToAdd.id);
			var canAdd = true;
			var newQty = 0;

			//If it's a new item or it's not stackable, we'll want to push it onto the array as a new item. Let's make sure we can do that
			if(!existingItem || !itemToAdd.stackable){

				if(extraCanAddCheck && typeof extraCanAddCheck === 'function'){
					canAdd = extraCanAddCheck();
					canAdd = (canAdd == undefined) ? true : canAdd;
				}
			}

			if(canAdd){

				if(existingItem && itemToAdd.stackable){
					newQty = existingItem.qty() + itemToAdd.qty();
					existingItem.qty(newQty);
				}else{
					self.items.push(itemToAdd);
					newQty = itemToAdd.qty();

					if(afterAddCallback && typeof afterAddCallback === 'function'){
						afterAddCallback();
					}
				}

				return itemToAdd.qty();
			}

			return false;

		}

		this.removeAll = function(items){
			return self.items.removeAll();
		}

		this.getSortedFilteredItems = function(filterField, filterValue, sortField, sortDirection){

			sortField = sortField || "id";
			sortDirection = sortDirection || "ASC";

			var filteredArray = self.items();

			if(filterField){
				filteredArray = $.grep(self.items(), function(elem, idx){
					var itemFieldVal;
					if(typeof elem[filterField] == 'function'){
						itemFieldVal = elem[filterField]();
					}else{
						itemFieldVal = elem[filterField];
					}

					return itemFieldVal == filterValue;
				});
			}

			if(filteredArray){
				filteredArray.sort(function(left, right){
					if(typeof left[sortField] == 'function'){
						left = left[sortField]();
					}else{
						left = left[sortField];
					}

					if(typeof right[sortField] == 'function'){
						right = right[sortField]();
					}else{
						right = right[sortField];
					}

					if(sortDirection == "DESC"){
						return (left > right) ? -1 : 1 ;
					}else{
						return (left > right) ? 1 : -1 ;
					}

					if(left == right){
						return 0;
					}
				});
			}

			return filteredArray;
		}

		this.getExportData = function(){

			var exportObj = [];
			
			$.each( self.items(), function(idx, elem){
				exportObj.push( elem.getExportData() );
			});

			/*var exportObj = {};

			exportObj._classNameForLoad = self.constructor.name;

			for(prop in self){
				if ( typeof self[prop] !== 'function' ){
					exportObj[prop] = self[prop];
				}else if (ko.isObservable(self[prop])) {
					exportObj[prop] = self[prop]();
				}
			}*/

			return exportObj;
		}

	}

	ItemCollection.prototype.constructor = ItemCollection;

	return ItemCollection;

});