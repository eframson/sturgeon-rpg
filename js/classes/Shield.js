define([
	'jquery',
	'knockout',
	'classes/Armor'
], function($, ko, Armor){

	function Shield(data){

		var self = this;

		Armor.call(this, data);

		this.init = function(data){
			this.isShield = true;
		}

		this.init(data);
	}

	Shield.prototype = Object.create(Armor.prototype);
	Shield.prototype.constructor = Shield;

	return Shield;
});