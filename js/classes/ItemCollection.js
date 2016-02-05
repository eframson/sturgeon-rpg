define([
	'jquery',
	'knockout',
	'classes/Item',
	'classes/SaveableObject',
], function($, ko, Item, SaveableObject){

	function ItemCollection(items, opts){

		SaveableObject.call(this);
		
		var self = this;

		items = items || Array();

		opts = opts || {};

		this.items = ko.observableArray(items);
		this.opts = opts;
		this.opts.ignoreStackable = this.opts.ignoreStackable || 0;

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

		this.getItemByIdx = function(idx){

			if( self.items()[idx] !== undefined ){
				return self.items()[idx];
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
			if(!existingItem || (!itemToAdd.stackable && !self.opts.ignoreStackable)){

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

		this.getItemsSortedByMultipleCriteria = function(sortFieldArray, sortDirectionArray){

			if(sortFieldArray == undefined || sortDirectionArray == undefined || !Array.isArray(sortFieldArray) || !Array.isArray(sortDirectionArray)){
				throw 'Sort fields and directions must be specified';
			}

			if(sortFieldArray.length != sortDirectionArray.length){
				throw 'Every entry in sort fields must have a corresponding entry in sort directions';
			}

			var filteredArray = self.items();
			filteredArray.sort(self._dynamicSortMultiple(sortFieldArray, sortDirectionArray));
			return filteredArray;

		}

		self._dynamicSortMultiple = function(sortFieldArray, sortDirectionArray) {

			return function (left, right) {
				var i = 0, result = 0, numberOfProperties = sortFieldArray.length;
				//try getting a different result from 0 (equal)
				//as long as we have extra sorts to compare
				while(result === 0 && i < numberOfProperties) {
					result = self._dynamicSort(sortFieldArray[i])(left, right, sortDirectionArray[i]);
					i++;
				}
				return result;
			}
		}

		//http://stackoverflow.com/questions/11379361/how-to-sort-an-array-of-objects-with-multiple-field-values-in-javascript
		this._dynamicSort = function(property){
			return function (left, right, sortDirection) {
				var leftCompare, rightCompare;
				if(typeof left[property] == 'function'){
					leftCompare = left[property]();
				}else{
					leftCompare = left[property];
				}

				if(typeof right[property] == 'function'){
					rightCompare = right[property]();
				}else{
					rightCompare = right[property];
				}

				if(sortDirection == "ASC"){
					return leftCompare > rightCompare ? 1
						: leftCompare < rightCompare ? -1 : 0;
				}else{
					return leftCompare > rightCompare ? -1
						: leftCompare < rightCompare ? 1 : 0;
				}

			}
		}

		this.length = function(){
			return self.items().length;
		}

		this.getItems = function(){
			return self.items();
		}

		//This causes a memory leak and crash if ItemCollection is made an instance of SaveableObject...for now let's not worry about that
		//and just keep using this to do our data export
		this.getExportData = function(){

			var exportObj = {};
			exportObj.items = [];
			
			$.each( self.items(), function(idx, elem){
				exportObj.items.push( elem.getExportData() );
			});

			exportObj.opts = self.opts;

			return exportObj;
		}

	}

	ItemCollection.prototype = Object.create(SaveableObject.prototype);
	ItemCollection.prototype.constructor = ItemCollection;

	return ItemCollection;

});