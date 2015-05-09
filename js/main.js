var game = undefined;
var ko_global = undefined;

requirejs.config({
	baseUrl : 'js',
	paths : {
		knockout : 'knockout-3.3.0.min',
		jquery : 'jquery-2.1.3.min',
		bootstrap : 'bootstrap.min',
		text : 'text',
		json : 'json',
	},
	shim : {
		bootstrap : ["jquery"],
		"jquery.caret.min" : ["jquery"],
		"jquery.growl" : ["jquery"],
	},
	//urlArgs: "bust=" +  (new Date()).getTime(),
});

require([
	'jquery',
	'knockout',
	'classes/Game',
	'knockout.mapping-latest',

	'bootstrap',
	'jquery-ui.min',
	'jquery.caret.min',
	'select2.min',
	'jquery.growl',
	'FileSaver.min',
	'Utils',
], function($, ko, Game, mapping){
	
	ko_global = ko;
	ko_global.maping = mapping;
	ko.mapping = mapping;

	$(document).ready(function(){

		game = new Game();
		ko.applyBindings(game);
		
		$('#importSavedGame').change(function(e){
			game.processFile(e);
		});

		//Show our content now that everything's loaded
		$("#content-area").removeClass("hidden");
		
		$(document).keydown(function(e){
			if( game.arrowKeysControlPlayerPos() ){

				if( e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40){
					
					e.preventDefault();

					if(e.keyCode == 37){
						game.movePlayerLeft();
					}else if(e.keyCode == 38){
						game.movePlayerUp();
					}else if(e.keyCode == 39){
						game.movePlayerRight();
					} else if(e.keyCode == 40){
						game.movePlayerDown();
					}

				}

			}
		});

		$("button.btn").click(function(){
			this.blur();
		});
	});

});