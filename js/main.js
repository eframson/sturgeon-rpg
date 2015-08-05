var game = undefined;
var ko_global = undefined;

window.DEBUG = ((window.location.href.indexOf("localhost") || window.location.href.indexOf("192.168")) >= 0) ? 1 : 0;

var requireJSConfig = {
	baseUrl : 'js',
	paths : {
		knockout : 'knockout-3.3.0.debug',
		jquery : 'jquery-2.1.3.min',
		bootstrap : 'bootstrap.min',
		text : 'text',
		json : 'json',
	},
	shim : {
		bootstrap : ["jquery"],
		"jquery.caret.min" : ["jquery"],
		"jquery.growl" : ["jquery"],
		"jquery.animateNumbers" : ["jquery"],
	},
};

if(!window.DEBUG){
	requireJSConfig.urlArgs = "bust=" + (new Date()).getTime();
}

requirejs.config(requireJSConfig);

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

		//Show our content now that everything's loaded
		$(".hidden").hide().removeClass("hidden");

		game = new Game();
		ko.applyBindings(game);
		
		$(document).keydown(function(e){
			if( game.arrowKeysControlPlayerPos() ){

				if(e.keyCode == 65){
					game.aAction();
				}else if(e.keyCode == 87){
					game.wAction();
				}else if(e.keyCode == 68){
					game.dAction();
				} else if(e.keyCode == 83){
					game.sAction();
				} else if(e.keyCode == 32){
					game.spcAction();
				}
				
				//Put shortcut for i = inventory, c = view stats
			}
		});

		$("button.btn").click(function(){
			this.blur();
		});
	});

});

window.onerror = function(errorText, fileName, lineNo){
	$("#myModal .modal-body").html(
		'Please copy and send the following error text:' +
		'<br/><br/>message: ' + errorText +
		'<br/>url: ' + fileName +
		'<br/>line: ' + lineNo +
		'<br/><br/>Now reload the page or try loading a previous save'
	);
	$('#myModal').modal('show');
}