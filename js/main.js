const BUILD_VERSION = 1521693442;
var game = undefined;
var ko_global = undefined;

window.DEBUG = ((window.location.href.indexOf("localhost") || window.location.href.indexOf("192.168")) >= 0) ? 1 : 0;

var requireJSConfig = {
	baseUrl : 'js',
	paths : {
		knockout : 'knockout-3.4.2',
		jquery : 'jquery-3.2.1.min',
		jqueryui : 'jquery-ui.min',
		bootstrap : 'bootstrap.min',
		text : 'text',
		json : 'json',
	},
	shim : {
		knockout : ["jquery"],
		jqueryui : ["knockout"],
		bootstrap : ["jqueryui"],
		"jquery.animateNumbers" : ["jqueryui"],
		"knockout-bootstrap.min" : { deps: ["knockout", "bootstrap"] },
		"knockout.mapping-latest" : ["knockout"],
		//"jquery.caret.min" : ["jquery"],
		//"jquery.growl" : ["jquery"],
	},
	waitSeconds : 20,
};

if(window.DEBUG){
	requireJSConfig.paths.knockout += ".debug";
	requireJSConfig.paths.jquery = "jquery-3.2.1";
}else{
	requireJSConfig.urlArgs = "bust=" + BUILD_VERSION;
}

requirejs.config(requireJSConfig);

require([
	'knockout',
	'jquery',
	'classes/Game',
	'knockout.mapping-latest',

	'bootstrap',
	'jqueryui',
	//'jquery.caret.min',
	//'select2.min',
	//'jquery.growl',
	'knockout-bootstrap.min',
], function(ko, $, Game, mapping){
	
	ko_global = ko;
	ko_global.maping = mapping;
	ko.mapping = mapping;

	$(document).ready(function(){

		//Hide the loader gif and show the load/save controls now that everything's...well, loaded
		$("#loading").addClass("hidden");
		$(".save-load-controls").removeClass("hidden");
		//Sneakily switch our hidden elements to a jQuery hide/show instead of CSS class
		$(".hidden").hide().removeClass("hidden");

		game = new Game();
		ko.applyBindings(game);
		
		$(document).keydown(function(e){
			if( game.wasdKeysControlPlayerPos() == true ){

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
			}else{
				if(e.keyCode == 37){
					game.aAction();
				}else if(e.keyCode == 38){
					game.wAction();
				}else if(e.keyCode == 39){
					game.dAction();
				} else if(e.keyCode == 40){
					game.sAction();
				}
			}

			if(e.keyCode == 16){
				game.onShiftDown();
			}
		});

		$(document).keyup(function(e){
			if(e.keyCode == 16){
				game.onShiftUp();
			}
		});

		$("button.btn").click(function(){
			jQuery(this).blur();
		});

		if( window.location.hash == '#konami' ){
			game.manageTransitionToView("fullscreen","mainscreen");
			game.player().playerClass("warrior");
			game.isNew(false);
			game.equipInitialLootItems();
		}

		if( window.location.hash == '#logsave' ){

			var saveData = JSON.parse(localStorage.getItem("saveData"));

			var data = {
				msg : 'LOG_SAVE',
				url : 'N/A',
				line : 0,
				stateData : JSON.stringify(saveData)
			};

			$.ajax({
				url : 'send_error.php',
				method : 'POST',
				data : data
			});

		}

		window.onblur = function(event){
			game.onShiftUp();
		}

		//window.onfocus = function(event){
		//}

	});

});

window.onerror = function(errorText, fileName, lineNo){
	$("#myModal .modal-header .modal-title").html('Error');
	$("#myModal .modal-body").html(
		'An error has occurred:' +
		'<br/><br/>message: ' + errorText +
		'<br/>url: ' + fileName +
		'<br/>line: ' + lineNo +
		'<br/><br/>Now reload the page or try loading a previous save'
	);
	$('#myModal').modal('show');

	var exportData;
	try {
	   exportData = game.getExportData();
	}
	catch (e) {
	   exportData = {};
	}

	var data = {
		msg : errorText,
		url : fileName,
		line : lineNo,
		stateData : exportData
	};

	$.ajax({
		url : 'send_error.php',
		method : 'POST',
		data : data
	});
}