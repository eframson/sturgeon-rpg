var game = undefined;

requirejs.config({
	baseUrl : 'js',
	paths : {
		knockout : 'knockout-3.3.0.min',
		jquery : 'jquery-2.1.3.min',
		bootstrap : 'bootstrap.min',
	},
	shim : {
		bootstrap : ["jquery"],
		"jquery.caret.min" : ["jquery"],
		"jquery.growl" : ["jquery"],
	}
});

require([
	'jquery',
	'knockout',
	'classes/Game',

	'bootstrap',
	'knockout.mapping-latest',
	'jquery-ui.min',
	'jquery.caret.min',
	'select2.min',
	'jquery.growl',
	'FileSaver.min',
	'Utils',
], function($, ko, Game){

	$(document).ready(function(){

		game = new Game();
		ko.applyBindings(game);
		
		$('#importSavedGame').change(function(e){
			game.processFile(e);
		});

		//Show our content now that everything's loaded
		$("#content-area").removeClass("hidden");
		
	});

});