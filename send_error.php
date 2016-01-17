<?php

require 'PHPMailerAutoload.php';

require 'vendor/autoload.php';

if (isset($_POST['msg']) && isset($_POST['url']) && isset($_POST['line']))  {

	//Email information
	$email = "framsone@gmail.com";
	$msg = $_POST['msg'];
	$url = $_POST['url'];
	$line = $_POST['line'];
	$stateData = rtrim(chunk_split(base64_encode($_POST['stateData'])));

	$content = "msg: $msg\nurl: $url\nline: $line\nstate JSON:\n$stateData";

	$json = $_POST['stateData'];

	if (json_decode($json) != null) { /* sanity check */
		$file = fopen('saveGame.json','w+');
		fwrite($file, $json);
		fclose($file);
	} else {
	// handle error 
	}

	//send email
	if( $_SERVER["SERVER_ADDR"] != '127.0.0.1' /*&& $_SERVER["SERVER_ADDR"] != "::1"*/){
		error_log("Try sending");
		//mail($email, "Sturgeon Simulator Error", $content, "From:" . $email);
		$mail = new PHPMailerOAuth;

		$mail->isSMTP();
		$mail->SMTPDebug = 2;

		//Ask for HTML-friendly debug output
		$mail->Debugoutput = 'html';
		//Set the hostname of the mail server
		//$mail->Host = 'smtp.gmail.com';
		$mail->Host = gethostbyname('smtp.gmail.com');

		//Set the SMTP port number - 587 for authenticated TLS, a.k.a. RFC4409 SMTP submission
		$mail->Port = 587;
		//Set the encryption system to use - ssl (deprecated) or tls
		$mail->SMTPSecure = 'tls';
		//Whether to use SMTP authentication
		$mail->SMTPAuth = true;
		//Username to use for SMTP authentication - use full email address for gmail

		//Set AuthType
		$mail->AuthType = 'XOAUTH2';

		//User Email to use for SMTP authentication - Use the same Email used in Google Developer Console
		$mail->oauthUserEmail = "framsone@gmail.com";

		//Obtained From Google Developer Console
		$mail->oauthClientId = "169487615237-pr52dod2uq7q6c155o1ld0c5evfhaeu8.apps.googleusercontent.com";

		//Obtained From Google Developer Console
		$mail->oauthClientSecret = "k4bi3pBjtoB08okW71vX8eJA";

		//Obtained By running get_oauth_token.php after setting up APP in Google Developer Console.
		//Set Redirect URI in Developer Console as [https/http]://<yourdomain>/<folder>/get_oauth_token.php
		// eg: http://localhost/phpmail/get_oauth_token.php
		$mail->oauthRefreshToken = "1/PyzW4jS4ZfPeVhOw1JhKxqF922gstbDQXrM34Lt-GeY";

		$mail->Username = "framsone@gmail.com";
		//Password to use for SMTP authentication
		$mail->Password = "ECHOlima2387";

		$mail->setFrom('framsone@gmail.com');
		$mail->addAddress('framsone@gmail.com');

		$mail->addAttachment('saveGame.json');         // Add attachments

		$mail->Subject = 'Sturgeon Error';
		$mail->Body    = 'See attachment';

		if(!$mail->send()) {
		    error_log('Message could not be sent.');
		    error_log('Mailer Error: ' . $mail->ErrorInfo);
		} else {
		    error_log('Message has been sent');
		}

		error_log("okey slash dokey!");

	}

}

?>