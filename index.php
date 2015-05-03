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

			<div class="row header">
				<div class="col-md-10"><h2 class="title">Sturgeon Simulator</h2></div>
				<div class="col-md-1"><button type="button" class="btn btn-default" data-bind="click: importData">Load</button></div>
				<div class="col-md-1"><button type="button" class="btn btn-default" data-bind="click: exportData">Save</button></div>
			</div>

			<div class="row stats">
				<div class="col-md-1"></div>
				<div class="col-md-1"></div>
				<div class="col-md-1"></div>
				<div class="col-md-1"></div>
				<div class="col-md-1"></div>
				<div class="col-md-1"></div>
				<div class="col-md-1"></div>
				<div class="col-md-1"></div>
				<div class="col-md-1"></div>
				<div class="col-md-1"></div>
				<div class="col-md-1"></div>
				<div class="col-md-1"></div>
			</div>

			<div class="row">
				<div class="col-md-6 state-container hidden"></div>
				<div class="col-md-6 map-container hidden"></div>
			</div>

			<div id="content-area" class="hidden" data-bind="with: state">
				<div class="row story-row">
					<div class="col-md-9">
						<div class="story" data-bind="html: text"></div>
					</div>
					<div class="col-md-3 player-data" data-bind="css: { hidden: $data.hidePlayerData && $data.hidePlayerData == 1 }">
						<div class="level">
							<div class="stat-label">Level: </div><div class="value" data-bind="text: $root.player().data().level()"></div>
							<div class="clear"></div>
						</div>
						<div class="hp">
							<div class="stat-label">HP: </div><div class="value" data-bind="text: $root.player().data().hp()"></div>
							<div class="clear"></div>
						</div>
						<div class="inventory" data-bind="if: $root.player().data().inventory().length > 0">
							<div class="stat-label">Inventory: </div><div class="value"></div>
							<div class="clear"></div>
							<!-- ko foreach: $root.player().data().inventory() -->
								<div class="stat-label"><div class="clear"></div></div><div class="value" data-bind="text: $data.name + ' (' + $data.qty() + ')'"></div>
							<!-- /ko -->
							<div class="clear"></div>
						</div>
					</div>
				</div>
				<div class="row last-action-message">
					<div class="col-md-12"><span data-bind="text: $root.lastActionMessage()"></span></div>
				</div>
				<div class="row">
					<div class="col-md-3 location">Location: <span data-bind="text: $data.location || $root.location()"></span></div>
					<div class="col-md-9"></div>
				</div>
				<!-- ko foreach: $data.buttons -->
				<div class="row buttons">
					<div class="col-md-12 buttons" data-bind="foreach: $data">
						<button type="button" class="btn btn-default" data-bind="click: $data.action, text: (typeof text === 'function' ? text() : text ), css: (typeof css === 'function' ? css() : {} )"></button>
					</div>
				</div>
				<!-- /ko -->
			</div>

			<div class="row map-container hidden" data-bind="css: { hidden: $root.state() && $root.state().hideMap }">
				<div class="col-md-6 map-buttons">
					<div class="up">
						<button type="button" class="btn btn-default" data-bind="click: function(){ $root.movePlayerUp(); $root.level().drawMap(); }">Swim Upstream</button>
					</div>
					<div>
						<button type="button" class="btn btn-default" data-bind="click: function(){ $root.movePlayerLeft(); $root.level().drawMap(); }">Swim Left</button>
						<button type="button" class="btn btn-default" data-bind="click: function(){ $root.movePlayerRight(); $root.level().drawMap(); }">Swim Right</button>
					</div>
					<div class="down">
						<button type="button" class="btn btn-default" data-bind="click: function(){ $root.movePlayerDown(); $root.level().drawMap(); }">Swim Downstream</button>
					</div>
				</div>
				<div class="col-md-6 map">
					<canvas id="map-canvas" width="300" height="300"></canvas>
				</div>
			</div>

		  </div>
		  <input class="file-upload" type="file" name="Import Saved Game" id="importSavedGame" accept=".json" />
		</div><!-- /.container -->

		<!-- Bootstrap core JavaScript
		================================================== -->
		<!-- Placed at the end of the document so the pages load faster -->
		<script src="js/require.js" data-main="js/main"></script>
		<!-- IE10 viewport hack for Surface/desktop Windows 8 bug -->
		<!--<script src="js/ie10-viewport-bug-workaround.js"></script>-->
	</body>
</html>
