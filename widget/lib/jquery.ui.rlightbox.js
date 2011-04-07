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
		animationSpeed: "fast"
	},

	_create: function() {
		var self = this;

		// there may be many elements to act on: images, flash films but only one structure of the widget
		self._createStructure();

		self.element.click(function() {
			self._open();
			return false;
		});
	},

	_createStructure: function() {
		var self = this;

		if ( self.$lightbox.root ) {
			return;
		}

		$( "<div id='ui-lightbox' class='ui-widget ui-widget-content ui-corner-all' style='display: none'></div>" )
			.append( "<div id='ui-lightbox-content' class='ui-widget-content'></div>" )
			.append( "<div id='ui-lightbox-header' class='ui-widget-header ui-corner-all' style='display: none'><p id='ui-lightbox-header-wrapper'><span id='ui-lightbox-header-title'></span></p><p id='ui-lightbox-header-counter'><span id='ui-lightbox-header-counter-current'></span><span>z</span><span id='ui-lightbox-header-counter-total'></span><a id='ui-lightbox-header-close' href='#'><span class='ui-icon ui-icon-closethick'>close</span></a></p></div>" )
			.appendTo( "body" )
			.after( "<div id='ui-lightbox-overlay' class='ui-widget-overlay' style='display: none'></div>" );

		// save references to wrapped set for later use
		self.$lightbox.root = $( "#ui-lightbox" );
		self.$lightbox.content = self.$lightbox.root.find( "#ui-lightbox-content" );
		self.$lightbox.header = self.$lightbox.root.find( "#ui-lightbox-header" );
		self.$lightbox.overlay = $( "#ui-lightbox-overlay" );
	},

	destroy: function() {
	},

	_loadImage: function( path ) {
		var _image = new Image(),
			_loadWatch,
			_dfd = $.Deferred();

		_image.src = path;

		function _watch() {
			if ( _image.complete ) {
				clearInterval( _loadWatch );
				_dfd.resolve( _image );
			}
		}

		// just simulate loading
		_loadWatch = setTimeout( _watch, 5000 );
		return _dfd.promise();
	},

	_open: function() {
		var self = this,
			$lightboxQueue = $({}),
			queueList = [
				function( next ) {

					// show overlay
					$( "body" ).css( "overflow", "hidden" );
					self.$lightbox.overlay.fadeIn( self.options.animationSpeed, next );
				},
				function( next ) {

					// center the lightbox
					var _screenWidth = $( window ).width(),
						_screenHeight = $( window ).height();
						_lbWidth = self.$lightbox.root.outerWidth(),
						_lbHeight = self.$lightbox.root.outerHeight();

					self.$lightbox.root
						.css({
							left: Math.round( (_screenWidth - _lbWidth) / 2 ) + "px",
							top: Math.round( (_screenHeight - _lbHeight) / 2 ) + "px"
						})
						.show( next );
				},
				function( next ) {

					// start loading maximized image
					self.$lightbox.content.addClass( "ui-lightbox-loader" );

					$.when( self._loadImage( $(self.element).attr("href") )).then(function(img) {
						self.$lightbox.content
							.append( img )
							.find( "img" )
								.hide();
						next();
					});
				},
				function( next ) {

					// animate width and height to the size of the content (image, flash video) size
					var _img = self.$lightbox.content.find( "img" ),
						_h = $( _img ).height(),
						_w = $( _img ).width();

					self.$lightbox.root
						.find( "#ui-lightbox-content" )
							.removeClass( "ui-lightbox-loader" )
							.animate( {width: _w}, self.options.animationSpeed )
							.animate( {height: _h}, self.options.animationSpeed )
							.end()
						.animate( {left: ($(window).width() - _w) / 2}, self.options.animationSpeed )
						.animate( {top: ($(window).height() - _h) / 2}, self.options.animationSpeed, next )
				},
				function( next ) {

					// show content
					self.$lightbox.content
						.find( "img" )
						.fadeIn( self.options.animationSpeed, next );
				},
				function(next) {

					// show header
					self.$lightbox.header.slideDown( self.options.animationSpeed, function() {
						next();
					});
				}
			];

		$lightboxQueue.queue( "lightbox", queueList );
		$lightboxQueue.dequeue( "lightbox" );
	},

	_setOption: function( key, value ) {
	},

	$lightbox: {}
});

})( jQuery );
