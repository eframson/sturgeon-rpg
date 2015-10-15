<?php

if (isset($_POST['msg']) && isset($_POST['url']) && isset($_POST['line']))  {

	//Email information
	$email = "framsone@gmail.com";
	$msg = $_POST['msg'];
	$url = $_POST['url'];
	$line = $_POST['line'];
	//$stateData = base64_encode($_POST['stateData']);
	$stateData = rtrim(chunk_split(base64_encode($_POST['stateData'])));

	$content = "msg: $msg\nurl: $url\nline: $line\nstate JSON:\n$stateData";

	//send email
	mail($email, "Sturgeon Simulator Error", $content, "From:" . $email);

}

?>