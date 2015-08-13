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

		this.getNode = function(nodePath, keys){
			var result = self.dataObject;
			$.each(nodePath, function(index, value) {
				if (typeof result !== 'undefined' && result !== null) {
					result = result[value];
				}
			});

			if(keys){
				return Object.keys(result);
			}
			return result;
		}

		this.init(data);
	}

	DataCollection.prototype.constructor = DataCollection;

	return DataCollection;
});