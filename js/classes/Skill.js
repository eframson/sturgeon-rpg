define([
	'jquery',
	'knockout',
], function($, ko){

	function Skill(data){
		
		if(data.id == undefined){
			return false;
		}

		var self = this;

		this.id = data.id;
		this.nameForDisplay = data.nameForDisplay || this.id;
		this.currentValue = data.currentValue || 0;
		this.maxValue = data.maxValue || 10;
		this.currentCooldown = data.currentCooldown || 0;
		this.cooldown = data.cooldown || 10;
		
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

	Skill.prototype.constructor = Skill;

	return Skill;

});