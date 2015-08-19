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
			self.skillLevel = ko.observable((data.skillLevel !== undefined) ? data.skillLevel : 1 );
			self.skillProgress = ko.observable(data.skillProgress || 0);
			self.nextSkillLevelAtProgress = ko.observable(data.nextSkillLevelAtProgress || 10);
			self.resetProgressOnSkillLevelUp = (data.resetProgressOnSkillLevelUp !== undefined) ? data.resetProgressOnSkillLevelUp : 1 ;
			self.canTrainNextLevel = ko.observable( (data.canTrainNextLevel !== undefined) ? data.canTrainNextLevel : 1 );

		}

		this.init(data);

		this.getTrainCost = function(){
			//Should be overridden by child
			return 0;
		}
		
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