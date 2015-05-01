rand = function(min, max){
	return Math.floor(Math.random() * (max - min)) + min;
}

failureMsg = function(messageString){
	displayMessage(messageString, "error", "Oh no!", 8000);
}

successMsg = function(messageString){
	displayMessage(messageString, "notice", "Success");
}

displayMessage = function(messageString, type, growlHeader, duration){
	type = type || "warning";

	$.growl[type]({ message: messageString, title: growlHeader, duration: duration });
}