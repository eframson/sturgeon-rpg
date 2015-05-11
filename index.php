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
				<div class="col-md-1"><span class="stat-label">HP</span><span class="stat-value" data-bind="text: player().data().hp() + '/' + player().maxHp()"></span></div>
				<div class="col-md-1"><span class="stat-label">AC</span><span class="stat-value" data-bind="text: player().totalArmor()"></span></div>
				<div class="col-md-1"><span class="stat-label">DMG</span><span class="stat-value" data-bind="text: player().minDmg() + ' - ' + player().maxDmg()"></span></div>
				<div class="col-md-1"><span class="stat-label">Stat03</span><span class="stat-value">Stat03</span></div>
				<div class="col-md-1"><span class="stat-label">Stat04</span><span class="stat-value">Stat04</span></div>
				<div class="col-md-1"><span class="stat-label">Stat05</span><span class="stat-value">Stat05</span></div>
				<div class="col-md-1"><span class="stat-label">Stat06</span><span class="stat-value">Stat06</span></div>
				<div class="col-md-1"><span class="stat-label">Stat07</span><span class="stat-value">Stat07</span></div>
				<div class="col-md-1"><span class="stat-label">Stat08</span><span class="stat-value">Stat08</span></div>
				<div class="col-md-1"><span class="stat-label">Stat09</span><span class="stat-value">Stat09</span></div>
				<div class="col-md-1"><span class="stat-label">GP</span><span class="stat-value" data-bind="text: player().gp()"></span></div>
			</div>

			<div class="row hidden" id="content-area">

				<div class="col-md-6 state-container">
					<div class="state-info">
						<div class="state-before-text" data-bind="html: state().beforeText"></div>
						<div class="clear"></div>
						<div class="state-controls" data-bind="foreach: ( typeof state().buttons === 'function' ? state().buttons() : state().buttons )">
							<div class="state-button-row" data-bind="foreach: $data">
								<div class="state-button">
									<button type="button" class="btn btn-default" data-bind="click: $data.action, text: (typeof text === 'function' ? text() : text ), css: (typeof css === 'function' ? css() : {} )"></button>
								</div>
							</div>
						</div>
						<div class="clear"></div>
						<div class="state-after-text" data-bind="html: state().afterText"></div>
						<div class="clear"></div>
						<div class="location">Location: <span data-bind="text: location() || state().location"></span></div>
						<div class="clear"></div>
					</div>
					<div class="message-log" data-bind="foreach: logMessages()">
						<p data-bind="html: $data.text, css: $data.cssClass"></p>
					</div>
					<div class="clear"></div>
				</div>

				<div class="col-md-6 map-container" data-bind="css: { hidden: state() && typeof state().hideMap === 'function' && state().hideMap() }">

					<div class="map-spacer"></div>

					<div class="map-inner-container">

						<div class="map-buttons">
							<div class="map-level-num"><strong>Level: </strong><span data-bind="text: $root.level().levelNum()"></span></div>
							<div class="map-button-cluster">
								<button type="button" class="btn btn-default up" data-bind="click: $root.movePlayerUp">Swim Upstream</button>
								<div class="mid-buttons">
									<button type="button" class="btn btn-default left" data-bind="click: $root.movePlayerLeft">Swim Left</button>
									<button type="button" class="btn btn-default right" data-bind="click: $root.movePlayerRight">Swim Right</button>
								</div>
								<button type="button" class="btn btn-default down" data-bind="click: $root.movePlayerDown">Swim Downstream</button>
							</div>
							<div class="arrow-keys-checkbox">
								<input type="checkbox" data-bind="checked: arrowKeysControlPlayerPos" />Arrow keys control player movement
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
						<button class="btn btn-default" type="button" data-bind="click: showContentArea, css: { disabled: $root.player().inventorySlotsOccupied() > $root.player().data().inventoryMaxSlots() }"><span>Back</span></button>
					</div>
				</div>

				<div class="row header">
					<div class="col-md-5 inventory-header"><h3>Inventory (<span data-bind="css: { danger: $root.player().inventorySlotsOccupied() > $root.player().data().inventoryMaxSlots() }, text: $root.player().inventorySlotsOccupied()"></span>/<span data-bind="text: $root.player().data().inventoryMaxSlots()"></span> slots occupied)</h3></div>
					<div class="col-md-3"></div>
					<div class="col-md-4 equipment-header" data-bind="css: { hidden: currentInventoryRightSide() != 'equipment' }"><h3>Equipment</h3></div>
					<div class="col-md-4 container-ui-header" data-bind="css: { hidden: currentInventoryRightSide() != 'container' }"><h3>Container</h3></div>
					<div class="col-md-4 merchant-header" data-bind="css: { hidden: currentInventoryRightSide() != 'merchant' }"><h3>Merchant</h3></div>
				</div>

				<div class="row">
					<div class="col-md-5 inventory">
						<div class="lines">
							<!-- ko if: $root.player().data().inventory().length == 0 -->
							<div class="line empty">
								<span class="item">Your inventory is empty</span>
							</div>
							<!-- /ko -->
							<!-- ko foreach: $root.player().data().inventory() -->
							<div class="line" data-bind="click: $root.setInventoryItemAsActiveItem, css: { selected: $root.activeItem().id()==$data.id && $root.activeItem().moveDirection() == 'right', hidden : $data.id == 'gold' }">
								<span class="item" data-bind="text: $data.name"></span>
								<span class="qty" data-bind="text: $data.qty()"></span>
							</div>
							<!-- /ko -->
						</div>
						<div class="message-log" data-bind="foreach: logMessages()">
							<p data-bind="html: $data.text, css: $data.cssClass"></p>
						</div>
					</div>
					<div class="col-md-3 item-desc">

						<div class="inner" data-bind="css: { hidden: activeItem().desc() == '' }">
							<div class="desc" data-bind="html: activeItem().desc()"></div>
							<button class="btn btn-default inventory-control" data-bind="click: equipActiveItem, css: { hidden: activeItem().canEquip() != 1 || currentInventoryRightSide() != 'equipment' }">Equip</button>
							<button class="btn btn-default inventory-control" data-bind="click: unEquipActiveItem, css: { hidden: activeItem().canUnEquip() != 1 || currentInventoryRightSide() != 'equipment' }">Un-Equip</button>
							<button class="btn btn-default inventory-control" data-bind="click: useActiveItem, css: { hidden: activeItem().canUse() != 1 || currentInventoryRightSide() != 'equipment' }">Use</button>
							<button class="btn btn-default inventory-control" data-bind="click: buyActiveItem, css: { hidden: activeItem().canBuy() != 1 || currentInventoryRightSide() != 'merchant', disabled : activeItem().actualItem() && ($root.player().gp() < activeItem().actualItem().buyValue) }, text : 'Buy 1x (' + ( activeItem().actualItem() ? activeItem().actualItem().buyValue + ' GP' : 0) + ')'">Buy</button>
							<button class="btn btn-default inventory-control" data-bind="click: sellActiveItem, css: { hidden: activeItem().canSell() != 1 || currentInventoryRightSide() != 'merchant' }, text : 'Sell 1x (' + ( activeItem().actualItem() ? activeItem().actualItem().sellValue() + ' GP' : 0) + ')'"></button>
							<span data-bind="css: { hidden: currentInventoryRightSide() != 'container'}">
								<button class="btn btn-default inventory-control" data-bind="click: dropActiveItem, css: { hidden: activeItem().canDrop() != 1 }, html: ( activeItem().moveDirection() == 'right' ? 'Put 1x &gt;&gt;' : '&lt;&lt; Put 1x' )"></button>
								<button class="btn btn-default inventory-control" data-bind="click: dropAllActiveItem, css: { hidden: activeItem().canDrop() != 1}, html: ( activeItem().moveDirection() == 'right' ? 'Put All &gt;&gt;' : '&lt;&lt; Put All' )"></button>
							</span>
							<span data-bind="css: { hidden: ( currentInventoryRightSide() != 'equipment' && activeItem().moveDirection() == 'left' ) }">
								<button class="btn btn-default inventory-control" data-bind="click: dropActiveItem, css: { hidden: activeItem().canDrop() != 1 }">Drop 1x</button>
								<button class="btn btn-default inventory-control" data-bind="click: dropAllActiveItem, css: { hidden: activeItem().canDrop() != 1 }">Drop All</button>
							</span>
						</div>
					</div>

					<div class="col-md-4 equipment" data-bind="css: { hidden: currentInventoryRightSide() != 'equipment' }" >

						<!-- <div class="equipment-spacer"></div> -->

						<div class="equipment-inner-container">

							<div class="line" data-bind="click: function(){ $root.setEquipmentItemAsActiveItem( $root.player().data().equipment().armor().head() ) }, css: { selected: $root.activeItem().id()==ko.unwrap($root.player().data().equipment().armor().head().id) && $root.activeItem().moveDirection() == 'left', empty : ko.unwrap($root.player().data().equipment().armor().head().name) == undefined }">
								<span class="slot">Head Armor:</span>
								<span class="item" data-bind="text: ko.unwrap($root.player().data().equipment().armor().head().name) || 'None'"></span>
							</div>

							<div class="line" data-bind="click: function(){ $root.setEquipmentItemAsActiveItem( $root.player().data().equipment().armor().fin() ) }, css: { selected: $root.activeItem().id()==ko.unwrap($root.player().data().equipment().armor().fin().id) && $root.activeItem().moveDirection() == 'left', empty : ko.unwrap($root.player().data().equipment().armor().fin().name) == undefined }">
								<span class="slot">Fin Armor:</span>
								<span class="item" data-bind="text: ko.unwrap($root.player().data().equipment().armor().fin().name) || 'None'"></span>
							</div>

							<div class="line" data-bind="click: function(){ $root.setEquipmentItemAsActiveItem( $root.player().data().equipment().armor().body() ) }, css: { selected: $root.activeItem().id()==ko.unwrap($root.player().data().equipment().armor().body().id) && $root.activeItem().moveDirection() == 'left', empty : ko.unwrap($root.player().data().equipment().armor().body().name) == undefined }">
								<span class="slot">Body Armor:</span>
								<span class="item" data-bind="text: ko.unwrap($root.player().data().equipment().armor().body().name) || 'None'"></span>
							</div>

							<div class="line" data-bind="click: function(){ $root.setEquipmentItemAsActiveItem( $root.player().data().equipment().armor().tail() ) }, css: { selected: $root.activeItem().id()== ko.unwrap($root.player().data().equipment().armor().tail().id) && $root.activeItem().moveDirection() == 'left', empty : ko.unwrap($root.player().data().equipment().armor().tail().name) == undefined }">
								<span class="slot">Tail Armor:</span>
								<span class="item" data-bind="text: ko.unwrap($root.player().data().equipment().armor().tail().name) || 'None'"></span>
							</div>

							<div class="line" data-bind="click: function(){ $root.setEquipmentItemAsActiveItem( $root.player().data().equipment().weapon() ) }, css: { selected: $root.activeItem().id()==ko.unwrap($root.player().data().equipment().weapon().id) && $root.activeItem().moveDirection() == 'left', empty : ko.unwrap($root.player().data().equipment().weapon().name) == undefined }">
								<span class="slot">Weapon:</span>
								<span class="item" data-bind="text: ko.unwrap($root.player().data().equipment().weapon().name) || 'None'"></span>
							</div>

							<div class="line" data-bind="click: function(){ $root.setEquipmentItemAsActiveItem( $root.player().data().equipment().shield() ) }, css: { selected: $root.activeItem().id()==ko.unwrap($root.player().data().equipment().shield().id) && $root.activeItem().moveDirection() == 'left', empty : ko.unwrap($root.player().data().equipment().shield().name) == undefined }">
								<span class="slot">Shield:</span>
								<span class="item" data-bind="text: ko.unwrap($root.player().data().equipment().shield().name) || 'None'"></span>
							</div>

						</div>

					</div>

					<div class="col-md-4 container-ui" data-bind="css: { hidden: currentInventoryRightSide() != 'container' }" >

						<!-- ko if: $root.currentContainer().length == 0 -->
						<div class="line empty">
							<span class="item">The container is empty</span>
						</div>
						<!-- /ko -->

						<div class="container-ui-inner-container" data-bind="foreach: $root.currentContainer()">
							<div class="line" data-bind="click: $root.setContainerItemAsActiveItem, css: { selected: $root.activeItem().id()==$data.id && $root.activeItem().moveDirection() == 'left' }">
								<span class="item" data-bind="text: $data.name"></span>
								<span class="qty" data-bind="text: $data.qty()"></span>
							</div>
						</div>

					</div>
					
					<div class="col-md-4 merchant" data-bind="css: { hidden: currentInventoryRightSide() != 'merchant' }" >

						<!-- ko if: $root.currentContainer().length == 0 -->
						<div class="line empty">
							<span class="item">The merchant has no goods for sale</span>
						</div>
						<!-- /ko -->

						<div class="container-ui-inner-container" data-bind="foreach: $root.currentContainer()">
							<div class="line" data-bind="click: $root.setMerchantItemAsActiveItem, css: { selected: $root.activeItem().id()==$data.id && $root.activeItem().moveDirection() == 'left' }">
								<span class="item" data-bind="text: $data.name"></span>
								<span class="qty" data-bind="text: $data.qty()"></span>
							</div>
						</div>

					</div>
				</div>
			</div>

			<div id="skills-area">
				<div class="row back">
					<div class="col-md-12">
						<button class="btn btn-default" type="button" data-bind="click: showContentArea"><span>Back</span></button>
					</div>
				</div>
				<div class="row">
					<div class="col-md-6 player">
						<div class="header">Skills</div>
						<div class="lines">
							
							<div class="line">
								<span class="stat">Find Food:</span>
								<span class="value" data-bind="text: $root.player().data().skills().findFood()"></span>
							</div>
							<div class="line">
								<span class="stat">Vision Range:</span>
								<span class="value" data-bind="text: $root.player().data().skills().visionRange()"></span>
							</div>
							<div class="line">
								<span class="stat">Scan Range:</span>
								<span class="value" data-bind="text: $root.player().data().skills().scanSquares()"></span>
							</div>
							
						</div>
					</div>
					<div class="col-md-6"></div>
				</div>
				<div class="row">
					<div class="col-md-12"></div>
				</div>
			</div>

			<div id="combat-area" data-bind="if: $root.currentEnemy() != undefined">
				<div class="row">
					<div class="col-md-6 player">
						<div class="header">You</div>
						<div class="lines">
							
							<div class="line">
								<span class="stat">HP:</span>
								<span class="value" data-bind="text: $root.player().data().hp()"></span>
							</div>
							<div class="line">
								<span class="stat">Speed:</span>
								<span class="value" data-bind="text: $root.player().data().speed()"></span>
							</div>
							
						</div>
						<div class="buttons">
							<button type="button" class="btn btn-default" data-bind="css: { hidden: $root.currentEnemy().isDead() }, click: $root.playerAttacks">Attack!</button>
							<button type="button" class="btn btn-default" data-bind="css: { hidden: $root.currentEnemy() == undefined || !$root.currentEnemy().isDead() }, click: $root.lootEnemy">Loot</button>
							<button type="button" class="btn btn-default" data-bind="css: { hidden: $root.currentEnemy() == undefined || !$root.currentEnemy().isDead() }, click: $root.leaveCombat">Leave</button>
						</div>
					</div>
					<div class="col-md-6 enemy">
						<div class="header" data-bind="text: $root.currentEnemy().name()"></div>
						<div class="lines">
							
							<div class="line">
								<span class="stat">HP:</span>
								<span class="value" data-bind="text: $root.currentEnemy().hp()"></span>
							</div>
							<div class="line">
								<span class="stat">Speed:</span>
								<span class="value" data-bind="text: $root.currentEnemy().speed()"></span>
							</div>
							
						</div>
						<div class="desc" data-bind="text: $root.currentEnemy().desc()"></div>
					</div>
				</div>
				<div class="row log">
					<div class="col-md-12">
						<div class="message-log" data-bind="foreach: logMessages()">
							<p data-bind="html: $data.text, css: $data.cssClass"></p>
						</div>
					</div>
				</div>
			</div>

			<div id="full-screen-notice">
				<div class="row notice-text">
					<div class="col-md-12" data-bind="text: fullScreenNotice()"></div>
				</div>
				<div class="row notice-button">
					<div class="col-md-12" data-bind="foreach: fullScreenNoticeButtons">
						<button type="button" class="btn btn-default" data-bind="click: $data.action, text: $data.title, css : ($data.css && typeof $data.css === 'function' ? $data.css() : '')"></button>
					</div>
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
