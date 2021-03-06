define([
	'jquery',
	'knockout',
	'classes/SaveableObject',
], function($, ko, SaveableObject){

	function Ability(data){

		var self = this;

		SaveableObject.call(this);

		this.init = function(data){
			
			if(data == undefined || data.id == undefined){
				return false;
			}

			self.id = data.id;
			self.name = data.name || self.id;
			self.description = data.description || self.name;
			self.className = data.className;

		}

		this.init(data);
		
		/*this.getExportData = function(){
			
			var exportObj = {};
			
			for(prop in self){
				if ( typeof self[prop] !== 'function' ){
					exportObj[prop] = self[prop];
				}else if (ko.isObservable(self[prop])) {
					exportObj[prop] = self[prop]();
				}
			}
			
			return exportObj;
		}*/
	}

	Ability.prototype = Object.create(SaveableObject.prototype);
	Ability.prototype.constructor = Ability;

	return Ability;

});