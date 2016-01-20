define([
	'jquery',
	'knockout',
	'classes/GearItem',
	'Utils'
], function($, ko, GearItem, Utils){

	function Accessory(data){

		var self = this;

		data.canBreakdown = 0;
		data.canUpgrade = 0;

		GearItem.call(this, data);

		self.accessoryStat = ko.observable(data.accessoryStat || undefined);
		self.accessoryStatAmt = ko.observable(data.accessoryStatAmt || undefined);

		self.possibleStats = [
			"Speed",
			"Armor",
			"Strength",
			"Dexterity",
			"Endurance",
			"Health"
		];

		self.actualStats = {
			"Speed" : "speed",
			"Armor" : "baseArmor",
			"Strength" : "str",
			"Dexterity" : "dex",
			"Endurance" : "end",
			"Health" : "baseHp"
		};

		this.init = function(data){
			if(self.fullyDynamicStats && self.isScaled() == 0){

				//Pick a stat
				self.accessoryStat( Utils.chooseRandomly(self.possibleStats) );

				//Pick an amount
				self.accessoryStatAmt(Math.round(self.level() * self.qualityModifier));

				self.buyValue( self.accessoryStatAmt() * 100 );

				self.isScaled(1);
			}else if(!self.fullyDynamicStats && (self.accessoryStat() == undefined || self.accessoryStatAmt() == undefined)){
				//Can't create this item, insufficient data
				return false;
			}
		}

		this.doOnEquip = function(player){
			var stat = self.actualStats[ self.accessoryStat() ];
			player[stat]( player[stat]() + self.accessoryStatAmt() );
		}

		this.doOnUnEquip = function(player){
			var stat = self.actualStats[ self.accessoryStat() ];
			player[stat]( player[stat]() - self.accessoryStatAmt() );
		}

		this.init(data);
	}

	Accessory.prototype = Object.create(GearItem.prototype);
	Accessory.prototype.constructor = Accessory;

	return Accessory;
});