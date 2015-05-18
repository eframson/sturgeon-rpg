define([
	'jquery',
	'knockout',

	'Utils',
], function($, ko, Utils){

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
			self.isScaled = ko.observable(monsterData.isScaled || 0);
			self.expValue = ko.observable(monsterData.expValue || 0);
			self.fullyDynamicStats = monsterData.fullyDynamicStats || 0;
			self.avgHpCoefficient = monsterData.avgHpCoefficient || 1;
			self.avgDmgCoefficient = monsterData.avgDmgCoefficient || 1;

			if(self.fullyDynamicStats){
				
				//Idea 1
				var avgPlayerHp = ( self.level() > 1 ? self.level() + 1 : self.level()) * 6;

				//Idea 2
				//var avgPlayerHp = 10 + (self.level() * 3);

				var avgMonsterHp = Math.round(avgPlayerHp / 2);
				var avgMonsterDmg = avgMonsterHp / 3;

				//Let's say HP and DMG both have a 30% variance
				self.hp( Math.round((Utils.doRand(Math.ceil(avgMonsterHp * 0.7), Math.ceil(avgMonsterHp * 1.3))) * self.avgHpCoefficient) );
				self.minDmg( Math.ceil(avgMonsterDmg * 0.7) * self.avgDmgCoefficient );
				self.maxDmg( Math.ceil(avgMonsterDmg * 1.3) * self.avgDmgCoefficient );
				self.speed( self.level() );
				self.expValue( self.hp() * 5 );

				/*console.log("Estimated base values");
				console.log("Avg Player HP: " + avgPlayerHp);
				console.log("Avg Monster HP: " + avgMonsterHp);
				console.log("Avg Monster DMG: " + avgMonsterDmg);

				console.log("Generated stats");
				console.log("HP: " + self.hp());
				console.log("Min DMG: " + self.minDmg());
				console.log("Max DMG: " + self.maxDmg());
				console.log("Speed: " + self.speed());
				console.log("EXP value: " + self.expValue());*/

			}else if( self.autoScale() && !self.isScaled() ){

				var coefficient = (self.level() - 1) / 10;

				self.hp( Math.round(self.hp() + (self.hp() * coefficient)) );
				self.armor( Math.round(self.armor() + (self.armor() * coefficient)) );
				self.speed( Math.round(self.speed() + (self.speed() * coefficient)) );
				self.minDmg( Math.round(self.minDmg() + (self.minDmg() * coefficient)) );
				self.maxDmg( Math.round(self.maxDmg() + (self.maxDmg() * coefficient)) );
				self.expValue( Math.round(self.expValue() + (self.expValue() * coefficient)) );

				//This should prevent monsters getting constantly re-scaled every time a game is loaded, lol
				self.isScaled(1);

			}
			
			self.isDead = ko.computed(function(){
				return self.hp() < 1;
			});
		}

		this.doAttack = function(){
			var minDmg = self.minDmg();
			var maxDmg = self.maxDmg();
			var rand = Utils.doRand( minDmg, (maxDmg + 1) );
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
