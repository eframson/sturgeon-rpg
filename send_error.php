<?php

require 'PHPMailerAutoload.php';

require 'vendor/autoload.php';

$credFile = "../smtp.json";
$credFileContents = file_get_contents($credFile);
$jsonCreds = json_decode($credFileContents, true);

if (isset($_POST['msg']) && isset($_POST['url']) && isset($_POST['line']))  {

	//Email information
	$email = "framsone@gmail.com";
	$msg = $_POST['msg'];
	$url = $_POST['url'];
	$line = $_POST['line'];

	$content = "msg: $msg\nurl: $url\nline: $line";

	$json = $_POST['stateData'];

	$file = fopen('saveGame.json','w+');
	fwrite($file, $json);
	fclose($file);

	//send email
	if( $_SERVER["SERVER_ADDR"] != '127.0.0.1' && $_SERVER["SERVER_ADDR"] != "::1"){

		$mail = new PHPMailerOAuth;

		$mail->isSMTP();
		//Set to 2+ for debugging
		$mail->SMTPDebug = 2;

		//Ask for HTML-friendly debug output
		$mail->Debugoutput = 'html';
		//Set the hostname of the mail server
		//$mail->Host = 'smtp.gmail.com';
		$mail->Host = gethostbyname('smtp.gmail.com');

		$mail->Port = 587;
		$mail->SMTPSecure = 'tls';
		$mail->SMTPAuth = true;

		$mail->SMTPOptions = array(
			'ssl' => array(
				'verify_peer' => false,
				'verify_peer_name' => false,
				'allow_self_signed' => true
			)
		);

		$mail->AuthType = 'XOAUTH2';
		$mail->oauthUserEmail = $jsonCreds["smtpThree"];
		$mail->oauthClientId = $jsonCreds["smtpFour"];
		$mail->oauthClientSecret = $jsonCreds["smtpFive"];
		$mail->oauthRefreshToken = $jsonCreds["smtpSix"];

		$mail->Username = $jsonCreds["smtpOne"];
		$mail->Password = $jsonCreds["smtpTwo"];

		$mail->setFrom('framsone@gmail.com');
		$mail->addAddress('framsone@gmail.com');

		$mail->addAttachment('saveGame.json');         // Add attachments

		$mail->Subject = 'Sturgeon Simulator Error';
		$mail->Body    = $content;

		if(!$mail->send()) {
		    error_log('Message could not be sent.');
		    error_log('Mailer Error: ' . $mail->ErrorInfo);
		} else {
		    error_log('Message has been sent');
		}

	}

}

?>