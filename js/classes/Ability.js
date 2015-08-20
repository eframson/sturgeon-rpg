define([
	'jquery',
	'knockout',
], function($, ko){

	function Ability(data){

		var self = this;

		this.init = function(data){
			
			if(data == undefined || data.id == undefined){
				return false;
			}

			self.id = data.id;
			self.name = data.name || self.id;
			self.description = data.description || self.name;

		}

		this.init(data);
		
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

	Ability.prototype.constructor = Ability;

	return Ability;

});