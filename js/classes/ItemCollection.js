define([
	'jquery',
	'knockout',
	'classes/Item'
], function($, ko, Item){

	function ItemCollection(items){
		
		var self = this;

		items = items || Array();

		//It would be nice if we could add this function just to the instance of ko
		//returned by this class rather than the global ko obj, but we'll see...
		//Maybe cloning?
		//http://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-clone-an-object
		//var newObject = jQuery.extend(true, {}, oldObject);
		ko.observableArray.fn.getItemByID = function(itemID){

			var items = this();

			for(i = 0; i < items.length; i++){
				if( itemID == items[i].id ){
					return items[i];
				}
			}
			return false;

		}

		ko.observableArray.fn.setItemQty = function(itemOrItemID, qty){

			if(!itemOrItemID || typeof qty != "number"){
				return false;
			}

			//There's probably a better way to check for this...
			if(typeof itemOrItemID != "object"){
				itemOrItemID = this.getItemByID(itemID);
			}

			itemOrItemID.qty(qty);

		}

		ko.observableArray.fn.removeItem = function(itemOrItemID, qty){

			//There's probably a better way to check for this...
			if(typeof itemOrItemID != "object"){
				itemOrItemID = this.getItemByID(itemID);
			}

			if(!itemOrItemID){
				return false
			}

			var existingQty = itemOrItemID.qty();

			//If qty is undefined or if qty is equal to "all" or it's greater than the item qty we currently have
			if( qty == undefined || qty && (qty == "all" || qty >= existingQty) ){
				this.remove(itemOrItemID);
				return 0;
			}else{
				itemOrItemID.qty( existingQty - qty );
				return itemOrItemID.qty();
			}
		}

		ko.observableArray.fn.addItem = function(itemToAdd, extraCanAddCheck, afterAddCallback){

			if(itemToAdd == undefined || !(itemToAdd instanceof Item) ){
				return false;
			}

			var existingItem = this.getItemByID(itemToAdd.id);
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

				if(existingItem){
					newQty = existingItem.qty() + itemToAdd.qty();
					existingItem.qty(newQty);
				}else{
					this.push(itemToAdd);
					newQty = itemToAdd.qty();

					if(afterAddCallback && typeof afterAddCallback === 'function'){
						afterAddCallback();
					}
				}

				return newQty;
			}

			return false;

		}


		return ko.observableArray(items);

	}

	ItemCollection.prototype.constructor = ItemCollection;

	return ItemCollection;

});