<?php

if (isset($_POST['msg']) && isset($_POST['url']) && isset($_POST['line']))  {

	//Email information
	$email = "framsone@gmail.com";
	$msg = $_POST['msg'];
	$url = $_POST['url'];
	$line = $_POST['line'];
	$stateData = rtrim(chunk_split(base64_encode($_POST['stateData'])));

	$content = "msg: $msg\nurl: $url\nline: $line\nstate JSON:\n$stateData";

	//send email
	if( $_SERVER["SERVER_ADDR"] != '127.0.0.1' ){
		mail($email, "Sturgeon Simulator Error", $content, "From:" . $email);
	}

}

?>