/*
 * jQuery UI rlightbox2
 *
 * Copyright 2011 Wojciech ‘rrh’ Ryrych
 * licensed under the MIT license
 *
 * Depends:
 *   jquery.ui.core.js
 *   jquery.ui.widget.js
 */
(function( $, undefined ) {

$.widget( "ui.rlightbox", {
	options: {
	},

	_create: function() {

		// there may be many elements to act on: images, flash films but only one structure of the widget
		this._createStructure();
	},

	_createStructure: function() {
		var self = this;

		if ( self.lightbox.$root ) {
			return;
		}

		$( "<div id='ui-lightbox' class='ui-widget ui-widget-content ui-corner-all' style='display: none'></div>" )
			.append( "<div id='ui-lightbox-content' class='ui-widget-content'></div>" )
			.append( "<div id='ui-lightbox-header' class='ui-widget-header ui-corner-all' style='display: none'><p id='ui-lightbox-header-wrapper'><span id='ui-lightbox-header-title'></span></p><p id='ui-lightbox-header-counter'><span id='ui-lightbox-header-counter-current'></span><span>z</span><span id='ui-lightbox-header-counter-total'></span><a id='ui-lightbox-header-close' href='#'><span class='ui-icon ui-icon-closethick'>close</span></a></p></div>" )
			.appendTo( "body" )
			.after( "<div id='ui-lightbox-overlay' class='ui-widget-overlay' style='display: none'></div>" );

		self.lightbox.$root = $( "#ui-lightbox" );
		self.lightbox.$content = self.lightbox.$root.find( "#ui-lightbox-content" );
		self.lightbox.$header = self.lightbox.$root.find( "#ui-lightbox-header" );
		self.lightbox.$overlay = $( self.lightbox.$root );
	},

	destroy: function() {
	},

	_setOption: function( key, value ) {
	},

	lightbox: {}
});

})( jQuery );
