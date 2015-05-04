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

			<div class="row player-stats hidden" data-bind="css: { hidden: state() && typeof state().hidePlayerStats === 'function' && state().hidePlayerStats() }">
				<div class="col-md-1"><span class="stat-label">Level</span><span class="stat-value" data-bind="text: player().data().level()"></span></div>
				<div class="col-md-1"><span class="stat-label">HP</span><span class="stat-value" data-bind="text: player().data().hp()"></span></div>
				<div class="col-md-1"><span class="stat-label">Stat03</span><span class="stat-value">Stat03</span></div>
				<div class="col-md-1"><span class="stat-label">Stat04</span><span class="stat-value">Stat04</span></div>
				<div class="col-md-1"><span class="stat-label">Stat05</span><span class="stat-value">Stat05</span></div>
				<div class="col-md-1"><span class="stat-label">Stat06</span><span class="stat-value">Stat06</span></div>
				<div class="col-md-1"><span class="stat-label">Stat07</span><span class="stat-value">Stat07</span></div>
				<div class="col-md-1"><span class="stat-label">Stat08</span><span class="stat-value">Stat08</span></div>
				<div class="col-md-1"><span class="stat-label">Stat09</span><span class="stat-value">Stat09</span></div>
				<div class="col-md-1"><span class="stat-label">Stat10</span><span class="stat-value">Stat10</span></div>
				<div class="col-md-1"><span class="stat-label">Stat11</span><span class="stat-value">Stat11</span></div>
				<div class="col-md-1"><span class="stat-label">Stat12</span><span class="stat-value">Stat12</span></div>
			</div>

			<div class="row hidden" id="content-area">
				
				<div class="col-md-6 state-container">
					<div class="state-before-text" data-bind="html: state().beforeText"></div>
					<div class="clear"></div>
					<div class="state-controls" data-bind="foreach: ( typeof state().buttons === 'function' ? state().buttons() : state().buttons )">
						<div class="state-button">
							<button type="button" class="btn btn-default" data-bind="click: $data.action, text: (typeof text === 'function' ? text() : text ), css: (typeof css === 'function' ? css() : {} )"></button>
						</div>
					</div>
					<div class="clear"></div>
					<div class="state-after-text" data-bind="html: state().afterText"></div>
					<div class="clear"></div>
					<div class="location">Location: <span data-bind="text: location() || state().location"></span></div>
					<div class="clear"></div>
					<div class="last-action-message" data-bind="text: lastActionMessage()"></div>
					<div class="clear"></div>
				</div>
				
				<div class="col-md-6 map-container" data-bind="css: { hidden: state() && typeof state().hideMap === 'function' && state().hideMap() }">
					
					<div class="map-spacer"></div>
					
					<div class="map-inner-container">
						
						<div class="map-buttons">
							<div class="map-button-cluster">
								<button type="button" class="btn btn-default up" data-bind="click: $root.movePlayerUp">Swim Upstream</button>
								<div class="mid-buttons">
									<button type="button" class="btn btn-default left" data-bind="click: $root.movePlayerLeft">Swim Left</button>
									<button type="button" class="btn btn-default right" data-bind="click: $root.movePlayerRight">Swim Right</button>
								</div>
								<button type="button" class="btn btn-default down" data-bind="click: $root.movePlayerDown">Swim Downstream</button>
							</div>
						</div>
						<div class="map">
							<canvas id="map-canvas" width="300" height="300"></canvas>
						</div>
						<div class="clear"></div>
					</div>
				</div>

			</div>
			
			<div class="" id="inventory-equipment">

				<div class="row back">
					<div class="col-md-12">
						<button class="btn btn-default" type="button" data-bind="click: showContentArea"><span>Back</span></button>
					</div>
				</div>

				<div class="row header">
					<div class="col-md-6 inventory-header"><h3>Inventory</h3></div>
					<div class="col-md-6 equipment-header"><h3>Equipment</h3></div>
				</div>

				<div class="row">
					<div class="col-md-6 inventory">
						<!-- ko foreach: $root.player().data().inventory() -->
						<div class="line">
							<span class="item" data-bind="text: $data.name"></span>
							<span class="qty" data-bind="text: $data.qty()"></span>
						</div>
						<!-- /ko -->
					</div>
					<div class="col-md-6 equipment">

						<div class="equipment-spacer"></div>
						
						<div class="equipment-inner-container">Some test content here</div>

					</div>
				</div>
			</div>

			<div id="event-area">
				<div class="row">
					<div class="col-md-12">Lorem Ipsum...</div>
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
