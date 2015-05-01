define([
	'jquery',
	'knockout',

	'Utils',
], function($, ko){

	var Player = function(playerData){

		//Init
		var self = this;
		playerData = playerData || {equipment: {}, skills: {}};

		this.data = ko.observable({

			level : ko.observable(playerData.level || 1),
			hp : ko.observable(playerData.hp || 10),
			inventory : ko.observableArray(playerData.inventory || Array()),
			equipment : ko.observable({
				headArmor : ko.observable(playerData.equipment.headArmor || undefined),
				finArmor : ko.observable(playerData.equipment.finArmor || undefined),
				bodyArmor : ko.observable(playerData.equipment.bodyArmor || undefined),
				tailArmor: ko.observable(playerData.equipment.tailArmor || undefined),
				weapon : ko.observable(playerData.equipment.weapon || undefined),
				shield : ko.observable(playerData.equipment.shield || undefined),
			}),
			skills : ko.observable({
				findEnemies: ko.observable(playerData.skills.findEnemies || 0),
				findFood: ko.observable(playerData.skills.findFood || 0),
			}),
			abilities : ko.observableArray(playerData.abilities || Array()),

		});
		//End init

		this.getData = function(){
			return self.data();
		}

		this.loadFromData = function(playerData){
			if(playerData == undefined){
				return false;
			}
			console.log(playerData);
		}
	}

	return Player;

});