<?php

if (isset($_POST['msg']) && isset($_POST['url']) && isset($_POST['line']))  {

	//Email information
	$email = "framsone@gmail.com";
	$msg = $_POST['msg'];
	$url = $_POST['url'];
	$line = $_POST['line'];

	$comment = "msg: $msg\nurl: $url\nline: $line";

	//send email
	mail($email, "Sturgeon Simulator Error", $comment, "From:" . $email);

}

?>