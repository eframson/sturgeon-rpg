define([
	'jquery',
	'knockout',
	'Utils'
], function($, ko, Utils){

	function DataCollection(data){

		var self = this;

		this.dataObject = {};

		this.init = function(data){
			self.dataObject = data;
		}

		this.getNode = function(nodePath, keys, asArray){
			var result = self.dataObject;
			$.each(nodePath, function(index, value) {
				if (typeof result !== 'undefined' && result !== null) {
					result = result[value];
				}
			});

			var output;

			if(keys){
				output = Object.keys(result);
			}else if(asArray){
				output = $.map(result, function(val, key){
					return val;
				});
			}else{
				output = result;
			}
			return output;
		}

		this.getNodeFilteredByField = function(nodePath, field, fieldValue, indexByField){
			var items = self.getNode(nodePath, 0, 1);

			var filteredItems = $.grep(items, function(elem, idx){
				if(typeof elem[field] == 'function'){
					return elem[field]() == fieldValue;
				}else{
					return elem[field] == fieldValue;
				}
				
			});

			if(indexByField){
				var filteredItemObj = {};

				$.each(filteredItems, function(idx, elem){
					var idxVal;

					if(typeof elem[indexByField] == 'function'){
						idxVal = elem[indexByField]();
					}else{
						idxVal = elem[indexByField];
					}

					if(filteredItemObj[idxVal] !== undefined){
						filteredItemObj[idxVal] = [filteredItemObj[idxVal]];
						filteredItemObj[idxVal].push(elem);
					}else{
						filteredItemObj[idxVal] = elem;
					}
				});

				return filteredItemObj;
			}

			return filteredItems;
		}

		this.init(data);
	}

	DataCollection.prototype.constructor = DataCollection;

	return DataCollection;
});