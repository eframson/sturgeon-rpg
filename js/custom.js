var gameViewModel = undefined;

// Here's my data model
var Game = function() {

	var self = this;
	
	this.player = undefined;
	this.stages = {
		start: {
			text: "<p>You are in an egg, nestled in a layer of rocks at the bottom of a creek bed. It is a comfortable 16 degrees Celsius. You've been in here for a week already. You are bored.</p>",
			buttons: [
				{
					text: "Let's bust outta here!",
					action: function(){ self.setStage("d1"); }
				},
				/*{
					text: "What is this?",
					action: function(){ return self.showHelp.apply(this, arguments); }
				}*/
			]
		},
		d1: {
			text: "<p>With a loud crack, you emerge from your egg like the Kool-Aid man through a brick wall.</p>",
			buttons: [
				{
					text: "OH YEAH!!!",
					action: function(){ self.setStage("d2"); }
				},
			]
		},
		d2: {
			text: "<p>You feel cool water rush past your face like a refreshing breeze.</p>",
			buttons: [
				{
					text: "Continue",
					action: function(){
						self.initPlayer();
						self.setStage("active", ".player-data");
					}
				},
			]
		},
		active: {
			text: "<p>You decide to...</p>",
			buttons: [
				{
					text: "Look for food",
					action: function(){
					}
				},
				{
					text: "Check for predators",
					action: function(){
					}
				},
			]
		},
	};

	this.initObservables = function(){
		
		self.showLoading = ko.observable(false);
		self.currentStage = ko.observable("start");
		self.stage = ko.computed(function(){
			if(self.stages.hasOwnProperty(self.currentStage())){
				return self.stages[self.currentStage()];				
			}
			var no_slide =
			{
				text: "<p>This part doesn't exist yet, dummy!</p>",
				buttons: [
					{
						text: "Sorry!",
						action: function(){ console.log("All is forgiven"); }
					},
				]
			};
			return no_slide;

		});
		self.player = ko.observable();
		self.playerLevel = ko.observable();
		self.playerHp = ko.observable();
		self.playerEquipment = ko.observable();
		self.playerAbilities = ko.observableArray();
		self.playerInventory = ko.observableArray();

	}
	
	this.initPlayer = function(){
		self.player(new Player());
		self.playerLevel(self.player().level);
	}
	
	this.setStage = function(stage, alsoShow){
		$("#content-area").fadeOut(600, function(){
			self.currentStage(stage);
			$(this).fadeIn(undefined, function(){
				$(alsoShow).removeClass("hidden").fadeIn();
			});
		});
	}
	
	this.showHelp = function(stage, event){
		console.log(arguments);
	}

	this.hideModal = function(viewModel, event){
		self.modalIsShown = false;
		$('#myModal').modal('hide');
		$('#myModal .modal-content').hide();
	}
	
	this.ajax = function(ajaxOpts){
		
		var completeCallback = ajaxOpts.complete;
		ajaxOpts.complete = function(jqXHR, textStatus){
			self.activeRequests( self.activeRequests() - 1 );

			if(typeof completeCallback === 'function'){
				completeCallback(jqXHR, textStatus);
			}
		}

		var errorCallback = ajaxOpts.error;
		ajaxOpts.error = function(jqXHR, textStatus, errorThrown){
			self.activeRequests( self.activeRequests() - 1 );

			var http_code = jqXHR.status,
				http_code_text = jqXHR.statusText,
				error_msg = jqXHR.responseText;
			self.mostRecentAjaxFailure(http_code + ' ' + http_code_text + '. See console for details');
			console.log(error_msg);

			if(typeof errorCallback === 'function'){
				errorCallback(jqXHR, textStatus, errorThrown);
			}
		}

		self.activeRequests( self.activeRequests() + 1 );
		$.ajax(ajaxOpts);
	}

	/*this.debugLogDataStore = function(idx_start, idx_end){
		if(idx_start === undefined && idx_end === undefined){
			idx_start = 0;
			idx_end = self.overviewDataStore().length - 1;
		}
		idx_end = idx_end || idx_start;

		var sliced = self.overviewDataStore.slice(idx_start, idx_end),
			outputReadyList = Array();
		$.each(sliced, function(idx, elem){
			outputReadyList.push(ko.mapping.toJS(elem));
		});
		console.log(outputReadyList);
	}*/

	this.mostRecentAjaxFailure = function(messageString){
		self.displayMessage(messageString, "error", "Oh no!", 8000);
	}

	this.mostRecentAjaxSuccess = function(messageString){
		self.displayMessage(messageString, "notice", "Success");
	}

	this.displayMessage = function(messageString, type, growlHeader, duration){
		type = type || "warning";

		$.growl[type]({ message: messageString, title: growlHeader, duration: duration });

		//self.activeMessageType(type);
		//self.activeMessage(messageString);
	}

	ko.bindingHandlers.showMessage = {
	    init: function(element, valueAccessor) {
	        //$(element).hide();
	    },
	    update: function(element, valueAccessor) {
	        // On update, fade in/out
	        var message = valueAccessor();
	        if(message && message != ""){
				$(element).text(message).slideDown(500).delay(3000).slideUp(500, function(){
					self.activeMessage("");
				});	
	        }
	    }
	};

	this.messageTest = function(){
		self.mostRecentAjaxSuccess("A Test Message");
	}
};

var Player = function(playerData){
	this.level = 1;
	this.hp = 10;
	this.inventory = Array();
	this.equipment = {
		headArmor : undefined,
		finArmor : undefined,
		bodyArmor : undefined,
		tailArmor: undefined,
		weapon : undefined,
		shield : undefined,
	};
	this.abilities = Array();
}

var Response = function(responseData){

	var self = this;

	this.response = responseData;

	this.isSuccess = function(){
		return self.getStatus() == "success";
	}

	this.isFail = function(){
		return self.getStatus() == "fail";
	}

	this.isError = function(){
		return self.getStatus() == "error";
	}

	this.getStatus = function(){
		return self.response.status;
	}

	this.getErrorMsg = function(){
		return self.response.message;
	}

	this.getData = function(){
		return self.response.data;
	}

	this.getGameData = function(){
		return self.getData()["games"];
	}
}

$(document).ready(function(){

	gameViewModel = new Game();
	gameViewModel.initObservables();
	ko.applyBindings(gameViewModel);
	
	$("#content-area").removeClass("hidden");

	//Initialize correct tab based on hash
	//window.location.hash = window.location.hash || "home";

	var hash = window.location.hash;
	//gameViewModel.activeTab(hash.replace(/^#/, ''));
	
});

$(window).on('hashchange', function(){
	var hash = window.location.hash;
	//gameViewModel.activeTab(hash.replace(/^#/, ''));
});