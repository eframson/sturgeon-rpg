define([
	'jquery',
	'knockout',
	'Utils'
], function($, ko, Utils){

	function SaveableObject(){

		var self = this;

		this.doExportProps = [];
		this.noExportProps = [];
		this.customSaveHandlers = {};

		this.getExportData = function(){

			var exportObj = {};

			exportObj._classNameForLoad = self.constructor.name;
			var prop = undefined;

			for(prop in self){
				if(prop == "customSaveHandlers"){
					continue;
				}

				var propForExport;

				if(self.doExportProps.length > 0 && self.doExportProps.indexOf(prop) > -1){
					propForExport = self[prop];
				}else if(self.noExportProps.length > 0 && self.noExportProps.indexOf(prop) == -1){
					propForExport = self.getPropForExport(prop);
				}else if(self.doExportProps.length == 0 && self.noExportProps.length == 0){
					propForExport = self.getPropForExport(prop);
				}

				if(propForExport !== undefined){
					exportObj[prop] = propForExport;
				}
			}

			return exportObj;
		}

		this.getPropForExport = function(prop){

			var propForExport = undefined;

			if( self[prop] !== undefined ){
				if(self.customSaveHandlers[prop] !== undefined){
					propForExport = self.customSaveHandlers[prop]();
				}else if (self[prop].hasOwnProperty("getExportData")){
					propForExport = self[prop].getExportData();
				}else if (ko.isObservable(self[prop]) && !ko.isComputed(self[prop])) {
					propForExport = Utils.getExportDataFromObject(self[prop]);
				}else if (typeof self[prop] !== 'function'){
					propForExport = Utils.getExportDataFromObject(self[prop]);
				}
			}

			return propForExport;
		}

	}

	SaveableObject.prototype.constructor = SaveableObject;

	return SaveableObject;

});
