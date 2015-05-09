define([
	'jquery',
	'knockout',

	'Utils',
], function($, ko){

	function Monster(monsterData){

		//Init
		var self = this;
		monsterData = monsterData || {};

		this.init = function(monsterData){

			self.name = ko.observable(monsterData.name || "Enemy");
			self.desc = ko.observable(monsterData.desc || "An enemy");
			self.level = ko.observable(monsterData.level || 1);
			self.hp = ko.observable(monsterData.hp || 5);
			self.armor = ko.observable(monsterData.armor || 0);
			self.speed = ko.observable(monsterData.speed || 1);
			self.minDmg = ko.observable(monsterData.minDmg || 1);
			self.maxDmg = ko.observable(monsterData.maxDmg || 2);
			self.autoScale = ko.observable(monsterData.autoScale || 1);
			self.isScaled = ko.observable(monsterData.autoScale || 0);

			if( self.autoScale() && !self.isScaled() ){

				var coefficient = (self.level() - 1) / 10;

				self.hp( Math.round(self.hp() + (self.hp() * coefficient)) );
				self.armor( Math.round(self.armor() + (self.armor() * coefficient)) );
				self.speed( Math.round(self.speed() + (self.speed() * coefficient)) );
				self.minDmg( Math.round(self.minDmg() + (self.minDmg() * coefficient)) );
				self.maxDmg( Math.round(self.maxDmg() + (self.maxDmg() * coefficient)) );

			}
			
			self.isDead = ko.computed(function(){
				return self.hp() < 1;
			});
		}

		this.doAttack = function(){
			var minDmg = self.minDmg();
			var maxDmg = self.maxDmg();
			var rand = doRand( minDmg, (maxDmg + 1) );
			return rand;
		}

		this.takeDmg = function(dmg){
			self.hp( self.hp() - dmg );
			return self.hp();
		}

		this.getExportData = function(){
			return getExportDataFromObject(self);
		}

		self.init(monsterData);
	}

	Monster.prototype.constructor = Monster;

	return Monster;

});
