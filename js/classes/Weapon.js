define([
	'jquery',
	'knockout',
	'classes/Item'
], function($, ko, Item){

	function Weapon(data){

		var self = this;

		Item.call(this, data);

		this.init = function(data){
			self.level = ko.observable(data.level || 1);
			self.dmgMin = ko.observable(data.dmgMin || 0);
			self.dmgMax = ko.observable(data.dmgMax || 1);
			self.handsRequired = data.handsRequired || 1;
			self.isWeapon = true;
			self.isEquippable = true;
			self.fullyDynamicStats = data.fullyDynamicStats || 0;
			self.avgMonsterHpPercentPerHit = data.avgMonsterHpPercentPerHit || 0.3;
			
			if(self.fullyDynamicStats){
				//Obviously move this to a central location...
				var avgPlayerHp = ( self.level() > 1 ? self.level() + 1 : self.level()) * 6;
				var avgMonsterHp = Math.round(avgPlayerHp / 2);
				
				var avgDmgPerHit = avgMonsterHp * self.avgMonsterHpPercentPerHit;
				
				//Let's say the dmg is -30% - +50%
				self.dmgMin( Math.round(avgDmgPerHit * 0.7) );
				self.dmgMax( Math.round(avgDmgPerHit * 1.5) );
				
				self.buyValue( self.dmgMax() * 100 );

				var magicDesc = self.desc;
				var matches = self.desc.match(/%[^%]+%/g);

				if(matches != undefined){
					for(var i = 0; i < matches.length; i++){
						var trimmedMatch = matches[i].replace(/%/g, "");
						magicDesc = magicDesc.replace("%" + trimmedMatch + "%", self[trimmedMatch]());
					}

					self.desc = magicDesc;
				}
			}
		}

		this._applyUpgrade = function(){
			self.dmgMin( self.dmgMin() + 1 );
			self.dmgMax( self.dmgMax() + 1 );
			self.attributesImprovedByLastCrafting = "Max DMG, Min DMG";
		}

		this.init(data);
	}

	//This is how we have to override the "parent" function
	/*Weapon.prototype._applyUpgrade = function(){
		self.dmgMin( self.dmgMin() + 1 );
		self.dmgMax( self.dmgMax() + 1 );
		self.attributesImprovedByLastCrafting = "Max DMG, Min DMG";
	}*/

	Weapon.prototype = Object.create(Item.prototype);
	Weapon.prototype.constructor = Weapon; //Is this actually necessary?

	return Weapon;
});