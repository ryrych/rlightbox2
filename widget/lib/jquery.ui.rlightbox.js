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
		animationSpeed: "fast",
	},

	_create: function() {
		var self = this;

		// some actions run only once – dirty flag nom nom nom
		if ( !$("body" ).data( "rlb_iWasRunAlready" ) ) {

			// there may be many elements to act on: images, flash films but only one structure of the widget
			self._createStructure();

			// set animation queues
			self._setQueues();

			// never run it again
			$( "body" ).data( "rlb_iWasRunAlready", true );

			// keep miscellaneous data like minimal size of the lightbox, flags, etc.
			// fill with initial data
			self.$lightbox.root.data({
				minimalLightboxSize: {
					width: 300,
					height: 300
				},
				lightboxPadding: 12,
				headerHeight: 57
			});
		}

		self.element.click(function() {
			self._open();
			return false;
		});
	},

	_createStructure: function() {
		var self = this;

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

	_getSizes: function() {
        var _statusWidth, _statusHeight, _imageTargetWidth, _imageTargetHeight, _lightboxTargetWidth, _lightboxTargetHeight,
			self = this,
            $lb = self.$lightbox,
            _windowWidth = $( window ).width(),
            _windowHeight = $( window ).height(),
            _minimalLightboxWidth = $lb.root.data().minimalLightboxSize.width,
            _minimalLightboxHeight = $lb.root.data().minimalLightboxSize.height,
            _imageWidth = $lb.root.data().originalImageSize.width,
            _imageHeight = $lb.root.data().originalImageSize.height,
            _lightboxPadding = $lb.root.data().lightboxPadding,
			_headerHeight = $lb.root.data().headerHeight;

		// statuses (concern both sides):
		// 1 - content fits the window and is larger than minimal lightbox size
		// -1 - content fits the window but is smaller or equal to minial lightbox size
		// 2 - content is larger than the window
		// -2 - the window is smaller than minimal lightbox size
        function _getStatus( imgW, imgH ) {
            if ( _windowWidth < _minimalLightboxWidth + _lightboxPadding ) {
				_statusWidth = -2;
			} else if ( imgW <= _minimalLightboxWidth ) {
				_statusWidth = -1;
			} else if ( imgW > _minimalLightboxWidth && imgW + _lightboxPadding <= _windowWidth ) {
				_statusWidth = 1;
            } else {
				_statusWidth = 2;
			}

            if ( _windowHeight < _minimalLightboxHeight + _lightboxPadding + _headerHeight ) {
				_statusHeight = -2;
			} else if ( imgH <= _minimalLightboxHeight ) {
				_statusHeight = -1;
            } else if ( imgH > _minimalLightboxHeight && _windowHeight >= imgH + _lightboxPadding + _headerHeight ) {
				_statusHeight = 1;
            } else {
				_statusHeight = 2;
			}
        }

        function _calculateSizes( w, h ) {
            _getStatus( w, h );

            // if image fits the window
            if ( ((_statusWidth === 1 || _statusWidth === -1) && _statusHeight !== 2) && ((_statusHeight === 1 || _statusHeight === -1) && _statusWidth !== 2) ) {
                if ( _statusWidth === 1 ) {
                    _lightboxTargetWidth = w;
                } else if ( _statusWidth === -1 ) {
                    _lightboxTargetWidth = _minimalLightboxWidth;
				}
				_imageTargetWidth = w;

                if ( _statusHeight === 1 ) {
                    _lightboxTargetHeight = h;
                } else if ( _statusHeight === -1 ) {
                    _lightboxTargetHeight = _minimalLightboxHeight;
				}
				_imageTargetHeight = h;
            } else if ( _statusWidth === 2 || _statusHeight === 2 ) {

                // height is larger than window, width fits the window
                if ( _statusWidth === 1 || _statusWidth === -1 ) {
                    _lightboxTargetHeight = _windowHeight - _headerHeight - _lightboxPadding;
					_heightRatio = _lightboxTargetHeight / _imageHeight;
					_imageTargetHeight = _lightboxTargetHeight;

                    if (_statusWidth === -1) {
                        _lightboxTargetWidth = _minimalLightboxWidth;
						_imageTargetWidth = w;
					} else {
                        _lightboxTargetWidth = _imageWidth * _heightRatio;
						_imageTargetWidth = _lightboxTargetWidth;

						// sprawdzić!
                        if ( _lightboxTargetWidth <= _minimalLightboxWidth ) {
                            _calculateSizes( _lightboxTargetWidth, _lightboxTargetHeight );
						}
                    }
                } else if ( _statusHeight === 1 || _statusHeight === -1 ) {

					// width is larger than window, height fit the window
                    _lightboxTargetWidth = _windowWidth - _lightboxPadding;
					_widthRatio = _lightboxTargetWidth / _imageWidth;
					_imageTargetWidth = _lightboxTargetWidth;

                    if ( _statusHeight === -1 ) {
                        _lightboxTargetHeight = _minimalLightboxHeight;
						_imageTargetHeight = h;
					} else {
                        _lightboxTargetHeight = _imageHeight * _widthRatio;
						_imageTargetHeight = _lightboxTargetHeight;

						// sprawdzić!
                        if ( _lightboxTargetHeight <= _minimalLightboxHeight ) {
                            _calculateSizes( _lightboxTargetWidth, _lightboxTargetHeight );
						}
                    }
                } else {

					// both width and height are larger than window
                    if ( _imageWidth > _imageHeight ) {
                        _lightboxTargetWidth = _windowWidth - _lightboxPadding;
						_imageTargetWidth = _lightboxTargetWidth;
                        _widthRatio = _lightboxTargetWidth / _imageWidth;
                        _lightboxTargetHeight = _imageHeight * _widthRatio - _lightboxPadding - _headerHeight;
						_imageTargetHeight = _lightboxTargetHeight;

                        // check if height fits the window
                        // if no, then scale height to fit the window and re-scale the width
                        if ( (_windowHeight < _lightboxTargetHeight + _lightboxPadding + _headerHeight) || _lightboxTargetHeight <= _minimalLightboxHeight ) {
                            _calculateSizes( _lightboxTargetWidth, _lightboxTargetHeight );
						}
                    } else {
                        _lightboxTargetHeight = _windowHeight - _headerHeight - _lightboxPadding;
                        _heightRatio = _lightboxTargetHeight / _imageHeight;
						_imageTargetHeight = _lightboxTargetHeight;

                        // check if width fits window after scaling
                        _lightboxTargetWidth = _imageWidth * _heightRatio;
						_imageTargetHeight = _lightboxTargetHeight;

                        // no, then scale width to fit the window and re-scale width
                        if ( _lightboxTargetWidth + _lightboxPadding > _windowWidth || _lightboxTargetWidth < _minimalLightboxWidth ) {
                            _calculateSizes( _lightboxTargetWidth, _lightboxTargetHeight );
						}
                    }
                }
            }
        }
        _calculateSizes( _imageWidth, _imageHeight );

        // final status
        _getStatus( _imageTargetWidth, _imageTargetHeight );

        return {
			imageTargetWidth: _imageTargetWidth,
			imageTargetHeight: _imageTargetHeight,
            lightboxTargetWidth: _lightboxTargetWidth,
            lightboxTargetHeight: _lightboxTargetHeight,
            statusWidth: _statusWidth,
			statusHeight: _statusHeight
        };
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
		_loadWatch = setTimeout( _watch, 2000 );
		return _dfd.promise();
	},

	_open: function() {

		// keep an url to an image - bad hack?
		this.$lightbox.imageUrl = $( this.element ).attr( "href" );

		// start opening the lighbox
		this.$lightbox.queueStart.dequeue( "lightboxOpen" );
	},

	_setOption: function( key, value ) {
	},

	_setQueues: function() {
		var self = this,
			queueStartList = [
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
					$.when( self._loadImage( self.$lightbox.imageUrl) ).then(function( img ) {

						// keep original size of an image – needed when resizing
						self.$lightbox.root.data({
							originalImageSize: {
								width: img.width,
								height: img.height
							}
						});

						// add the loaded image and hide it
						self.$lightbox.content
							.append( img )
							.find( "img" )
								.hide();

						next();
					});
				},
				function( next ) {

					// center the lightbox and scale it
					// get sizes of the lightbox, image and their statuses
					var _sizes = self._getSizes(),
						_imageTargetWidth = _sizes.imageTargetWidth,
						_imageTargetHeight = _sizes.imageTargetHeight,
						_lightboxTargetWidth = _sizes.lightboxTargetWidth,
						_lightboxTargetHeight = _sizes.lightboxTargetHeight,
						_statusWidth = _sizes.statusWidth,
						_statusHeight = _sizes.statusHeight,
						_img = self.$lightbox.content.find( "img" ),
						_padding = self.$lightbox.root.data().lightboxPadding
						_headerHeight = self.$lightbox.root.data().headerHeight;

					// only if window is larger than minial size of the lightbox
					if ( _statusWidth !== -2 && _statusHeight !== -2 ) {

						// scale the image to fit the window or container
						_img
							.width( _imageTargetWidth )
							.height( _imageTargetHeight );

						// scale and resize the lightbox
						self.$lightbox.root
							.find( "#ui-lightbox-content" )
								.removeClass( "ui-lightbox-loader" )
								.animate( {width: _imageTargetWidth}, 2000 )
								.animate( {height: _imageTargetHeight}, 2000 )
								.end()
							.animate( {left: ($(window).width() - _lightboxTargetWidth - _padding) / 2}, 2000)
							.animate( {top: ($(window).height() - _lightboxTargetHeight - _padding - _headerHeight) / 2}, 2000, next);
					} else {

						// window is too small to fit the lightbox
						$( self._$lightbox.root ).hide();
						if ( _statusWidth === -2 ) {
							alert( "Window width is too small. Please resize it." );
						} else if ( _statusHeight === -2 ) {
							alert("Window height is too small. Please resize it." );
						} else {
							alert( "Window size is too small. Please resize it." );
						}
					}
				},
				function( next ) {
					var _sizes = self._getSizes();

					// show content
					self.$lightbox.content
						.css( {position: "relative"} )
						.find( "img" )
						.css({
							position: "absolute",
							top: _sizes.lightboxTargetHeight / 2 - _sizes.imageTargetHeight / 2,
							left: _sizes.lightboxTargetWidth / 2 - _sizes.imageTargetWidth / 2,
							zIndex: 778
						})
						.fadeIn( self.options.animationSpeed, next );
				},
				function(next) {

					// show header
					self.$lightbox.header.slideDown( self.options.animationSpeed, next );
				}
			];

		// place start animation queue in the jQuery wrapper and save the reference
		self.$lightbox.queueStart= $({});
		self.$lightbox.queueStart.queue( "lightboxOpen", queueStartList );
	},

	$lightbox: {}
});

})( jQuery );
