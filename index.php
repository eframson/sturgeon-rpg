<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="description" content="">
		<meta name="author" content="">
		<link rel="shortcut icon" href="img/favicon.ico" type="image/x-icon" />
		<title>Sturgeon Simulator</title>

		<!-- Bootstrap -->
		<link href="css/bootstrap.min.css" rel="stylesheet">
		
		<!-- Bootstrap theme -->
		<link href="css/bootstrap-theme.min.css" rel="stylesheet">
		
		<!-- jQuery UI -->
		<link href="css/jquery-ui.min.css" rel="stylesheet">
		<!--<link href="css/jquery-ui.structure.min.css" rel="stylesheet">-->
		<!--<link href="css/jquery-ui.theme.min.css" rel="stylesheet">-->

		<!-- Select2 -->
		<link href="css/select2.min.css" rel="stylesheet">

		<!-- jQuery Growl -->
		<link href="css/jquery.growl.css" rel="stylesheet">
				
		<!-- Theme customizations -->
		<link href="css/custom.css" rel="stylesheet">

		<!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
		<!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
		<!--[if lt IE 9]>
		  <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
		  <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
		<![endif]-->
	</head>

	<body>
		<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
		  <div class="modal-dialog">

		    <div class="modal-content massupdate">
			    <div class="modal-header">
			        <button type="button" class="close" data-bind="click: hideModal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
			        <h4 class="modal-title">A Modal</h4>
			    </div>
				<div class="modal-body">
				</div>
				<div class="modal-footer">
				</div>
		    </div>

		  </div>
		</div>

		<div class="container">

		  <div class="starter-template">

			<div class="loading-indicator hidden" data-bind="visible: showLoading(), css: { hidden: false }" ><img src="img/ajax-loader.gif" /></div>

			<div class="row">
				<div class="col-md-12"><h2 class="title">Sturgeon Simulator</h2></div>
			</div>
			
			<div id="content-area" class="hidden" data-bind="with: stage">
				<div class="row story-row">
					<div class="col-md-6">
						<div class="story" data-bind="html: text"></div>
					</div>
					<div class="col-md-6 player-data hidden">
						<div data-bind="if: $root.playerLevel" class="level"><label>Level: </label><span data-bind="text: $root.playerLevel"></span></div>
					</div>
				</div>
				<div class="row">
					<div class="col-md-12 buttons" data-bind="foreach: $data.buttons">
						<button type="button" class="btn btn-default" data-bind="click: $data.action, text: text"></button>
					</div>
				</div>
			</div>

		  </div>

		</div><!-- /.container -->

		<!-- Bootstrap core JavaScript
		================================================== -->
		<!-- Placed at the end of the document so the pages load faster -->
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
		<script src="js/bootstrap.min.js"></script>
		<!--<script src="js/knockout-3.3.0.min.js"></script>-->
		<script src="js/knockout-3.3.0.debug.js"></script>
		<script src="js/knockout.mapping-latest.js"></script>
		<!--<script src="js/typeahead-0.10.5.js"></script>-->
		<script src="js/jquery-ui.min.js"></script>
		<script src="js/bootstrap-datepicker.min.js"></script>
		<script src="js/jquery.caret.min.js"></script>
		<script src="js/select2.min.js"></script>
		<script src="js/jquery.growl.js"></script>

		<!-- Other jQuery Plugins/Libraries -->

		<script src="js/custom.js"></script>
		<!-- IE10 viewport hack for Surface/desktop Windows 8 bug -->
		<!--<script src="js/ie10-viewport-bug-workaround.js"></script>-->
	</body>
</html>