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
		categoryPrefix: "lb"
	},

	_create: function() {
		var self = this,
			$lb = self.$lightbox;

		// some actions run only once – dirty flag nom nom nom
		if ( !$("body" ).data( "HKn5fX_ZtrdfM-FBRHf6" ) ) {

			// there may be many elements to act on: images, flash films but only one structure of the widget
			self._createStructure();

			// set references for later use
			self._setReferences();

			// set animation queues
			self._setOpenQueue();
			self._setNextQueue();

			// add handlers to the close button and the overlay
			$lb.close
				.click(function() {
					self._close();
					return false;
				})
				.hover(function() {
					$( this ).toggleClass( "ui-state-hover" );
				});

			$lb.overlay.click(function() {
				if ( self._getData("ready") ) {
					self._close();
					return false;
				}
			});

			// in case of categories show relevant cursor indicating that you can go to next or prev content
			$lb.content
				.mousemove(function(event) {
					if ( self._getData("ready") && self._getData("currentCategory") ) {
						var _pos = event.pageX - $( this ).offset().left,
							_center = Math.round( $(this).width() / 2 );

						if ( _pos <= _center ) {

							// remember the side
							self._setData( "side", "left" );
							$( this ).css( "cursor", "w-resize" );
						} else {
							self._setData( "side", "right" );
							$( this ).css( "cursor","e-resize" );
						}
					} else {

						// reset state
						self._setData( "side", "" );
						$( this ).css( "cursor", "default" );
					}
				})
				.click(function() {
					// prevent multi-clicking and do it only with categories
					if ( self._getData("ready") && self._getData("currentCategory") ) {
						if ( self._getData("currentElementNumber") + 1 <= self._getData("totalElementsNumber") && self._getData("side") === "right" ){
							self._setData( "currentElementNumber", self._getData("currentElementNumber") + 1 );

							// update current element
							$lb.currentElement = self.categories[self._getData("currentCategory")][self._getData("currentElementNumber") - 1];

							// next element - trigger the queue ‘next’ - first update it
							self._setNextQueue();
							$lb.queueContainer.next.dequeue( "lightboxNext" );
						} else if ( self._getData("currentElementNumber") - 1 >= 1 && self._getData("side") === "left" ){
							self._setData( "currentElementNumber", self._getData("currentElementNumber") - 1 );

							// update current element
							$lb.currentElement = self.categories[self._getData("currentCategory")][self._getData("currentElementNumber") - 1];

							// next element - trigger the queue ‘next’ - first update it
							self._setNextQueue();
							$lb.queueContainer.next.dequeue( "lightboxNext" );
						}
					}
				});

			// keep miscellaneous data like minimal size of the lightbox, flags, etc.
			// fill with initial data
			self._setData({
				minimalLightboxSize: {
					width: 300,
					height: 300
				},
				lightboxPadding: 12,
				headerHeight: 57,
				ready: false
			});

			// never run it again
			$( "body" ).data( "HKn5fX_ZtrdfM-FBRHf6", true );
		}

		// add content into categories if any exists
		self._addToCategory( self.element );

		self.element.click(function() {
			self._open();
			return false;
		});
	},

	_addToCategory: function( element ) {
		var self = this,
			_categoryName = self._getCategoryName( element );

		// one element; exit
		if ( _categoryName === null ) {
			return;
		}

        if ( !self.categories[_categoryName] ) {
			// first time - such category had not been created before
            self.categories[_categoryName] = [];
            self.categories[_categoryName].push( element );
        } else {
			// category exists yet - just add element to it
            self.categories[_categoryName].push( element );
		}
	},

	_close: function() {
		var self = this,
			$lb = self.$lightbox;

		$lb.overlay
			.add( $lb.root )
			.add ( $lb.header )
			.hide();

		$( "body" ).css( "overflow", "visible" );

		// remove content and restore its initial size
		$lb.content
			.empty()
			.width( 20 )
			.height( 20 );

		// lightbox is not ready again
		self._setData( "ready", false );

		// get ready to next time - fill in queue
		self._setOpenQueue();
	},

	_createStructure: function() {
		var self = this;

		$( "<div id='ui-lightbox' class='ui-widget ui-widget-content ui-corner-all' style='display: none'></div>" )
			.append( "<div id='ui-lightbox-content' class='ui-widget-content'></div>" )
			.append( "<div id='ui-lightbox-header' class='ui-widget-header ui-corner-all' style='display: none'><p id='ui-lightbox-header-wrapper'><span id='ui-lightbox-header-title'></span></p><p id='ui-lightbox-header-counter' style='display: none'><span id='ui-lightbox-header-counter-current'></span><span>z</span><span id='ui-lightbox-header-counter-total'></span></p><a id='ui-lightbox-header-close' href='#'><span class='ui-icon ui-icon-closethick'>close</span></a></div>" )
			.appendTo( "body" )
			.after( "<div id='ui-lightbox-overlay' class='ui-widget-overlay' style='display: none'></div>" );
	},

	destroy: function() {
	},

	_getCategoryName: function( element ) {
        var _classNames = $( element ).attr( "class" ),
			_classPrefix = this.options.categoryPrefix + "_",
			_classPattern = new RegExp( _classPrefix + "(\\w+)" ),
			_name = _classPattern.exec( _classNames );

        return _name ? _name[1] : null;
	},

	_getCurrentElementNumber: function() {
		var _current,
			self = this;

		$.each( this.categories[this._getData("currentCategory")], function(i, v) {

			// compare DOM elements
			if ( self.$lightbox.currentElement.get( 0 ) === $( v ).get( 0 ) ) {
				_current = i + 1;
				return false;
			}
		});
		return _current;
	},

	_getData: function( key ) {

		// it is only a wrapper for ‘this.$lightbox.root.data()’
		return this.$lightbox.root.data( key );
	},

	_getSizes: function() {
        var _statusWidth, _statusHeight, _imageTargetWidth, _imageTargetHeight, _lightboxTargetWidth, _lightboxTargetHeight,
			self = this,
            $lb = self.$lightbox,
            _windowWidth = $( window ).width(),
            _windowHeight = $( window ).height(),
            _minimalLightboxWidth = self._getData( "minimalLightboxSize" ).width,
            _minimalLightboxHeight = self._getData( "minimalLightboxSize" ).height,
            _imageWidth = self._getData( "originalImageSize" ).width,
            _imageHeight = self._getData( "originalImageSize" ).height,
            _lightboxPadding = self._getData( "lightboxPadding" ),
			_headerHeight = self._getData( "headerHeight" );

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
						_imageTargetWidth = Math.ceil( w * _heightRatio );
					} else {
                        _lightboxTargetWidth = Math.ceil( _imageWidth * _heightRatio );
						_imageTargetWidth = _lightboxTargetWidth;

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
						_imageTargetHeight = Math.ceil( h * _widthRatio );
					} else {
                        _lightboxTargetHeight = Math.ceil( _imageHeight * _widthRatio );
						_imageTargetHeight = _lightboxTargetHeight;

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
		var self = this,
			$lb = self.$lightbox;

		// keep a reference to a currentElement element
		$lb.currentElement = this.element;

		// remember which category content belongs to
		self._setData( "currentCategory", self._getCategoryName( $lb.currentElement ) );

		// determine and remember how many elements belong to a category
		// determine the current (and clicked) element in a category
		if ( self._getData("currentCategory") ) {
			self._setData( "totalElementsNumber", self.categories[self._getData("currentCategory")].length );
			self._setData( "currentElementNumber", self._getCurrentElementNumber() );
		}


		// start opening the lighbox
		$lb.queueContainer.open.dequeue( "lightboxOpen" );
	},

	_setData: function( data ) {

		// it is only a wrapper for ‘this.$lightbox.root.data()’
		var $root = this.$lightbox.root,
			_arg1 = arguments[0],
			_arg2 = arguments[1];

		// if you pass an object
		if ( arguments.length === 1 && $.isPlainObject( _arg1 ) ) {
			$root.data( _arg1 );
		} else if ( arguments.length === 2 && typeof _arg1 === "string" ) {

			// key and value
			$root.data( _arg1, _arg2 );
		}
	},

	_setOption: function( key, value ) {
	},

	_setNextQueue: function() {

		// for description take a look at _setOpenQueue method
		var self = this,
			queueNextList = [
				$.proxy( self._queueSlideUpHeader, this ),
				$.proxy( self._queueHideContent, this ),
				$.proxy( self._queueLoadContent, this ),
				$.proxy( self._queueResizeLightbox, this ),
				$.proxy( self._queueShowContent, this ),
				$.proxy( self._queueSlideDownHeader, this )
			];

		// place start animation queue in the queue container
		self.$lightbox.queueContainer.next.queue( "lightboxNext", queueNextList );
	},

	_setOpenQueue: function() {
		// we have two animated queues: one to open the lightbox and the second to perform next/previous operation
		// half of the operations are the same - they ovelap, and the rest such as ‘show the overlay’, ‘center lightbox’,
		// ‘slide up the header’ and ‘hide content’ are run only in one queue not in both
		// thus to not repeat oneself we keep in the queue lists only references to these methods
		// every one of these methods (that begin with _queue…) are passed ‘next’ parameter that is a reference to another
		// method in the queue.
		// $proxy is needed to have an access to a ‘global’ scope of the plugin – every one method that is called in the queue
		// is run in its internal scope - we need to have an access to such method as _getSizez, _open, etc - one the same level.

		var self = this,
			queueOpenList = [
				$.proxy( self._queueShowOverlay, this ),
				$.proxy( self._queueCenterLightbox, this ),
				$.proxy( self._queueLoadContent, this ),
				$.proxy( self._queueResizeLightbox, this ),
				$.proxy( self._queueShowContent, this ),
				$.proxy( self._queueSlideDownHeader, this )
			];

		// place start animation queue in the queue container
		self.$lightbox.queueContainer.open.queue( "lightboxOpen", queueOpenList );
	},

	_setReferences: function() {
		var self = this;

		// save references to wrapped set for later use
		self.$lightbox.root = $( "#ui-lightbox" );
		self.$lightbox.content = self.$lightbox.root.find( "#ui-lightbox-content" );
		self.$lightbox.header = self.$lightbox.root.find( "#ui-lightbox-header" );
		self.$lightbox.overlay = $( "#ui-lightbox-overlay" );
		self.$lightbox.close = $( "#ui-lightbox-header-close" );
		self.$lightbox.queueContainer = {
			open: $({}),
			next: $({})
		}
	},

	_queueShowOverlay: function( next ) {
		var self = this;

		// lightbox is not ready
		self._setData( "ready", false );
		// show overlay
		$( "body" ).css( "overflow", "hidden" );
		self.$lightbox.overlay.fadeIn( self.options.animationSpeed, next );
	},

	_queueCenterLightbox: function( next ) {
		var self = this;

		var _screenWidth = $( window ).width(),
			_screenHeight = $( window ).height();
			_lbWidth = self.$lightbox.root.outerWidth(),
			_lbHeight = self.$lightbox.root.outerHeight();

		self.$lightbox.root
			.css({
				left: Math.round( (_screenWidth - _lbWidth) / 2 ) + "px",
				top: Math.round( (_screenHeight - _lbHeight) / 2 ) + "px"
			})
			.show( 0, next );
	},

	_queueLoadContent: function( next ) {
		var self = this;

		// start loading maximized image
		self.$lightbox.content.addClass( "ui-lightbox-loader" );
		$.when( self._loadImage($(self.$lightbox.currentElement).attr("href")) ).then(function( img ) {

			// keep original size of an image – needed when resizing
			self._setData({
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

	_queueResizeLightbox: function( next ) {

		// center the lightbox and scale it
		// get sizes of the lightbox, image and their statuses
		var self = this,
			_sizes = self._getSizes(),
			_imageTargetWidth = _sizes.imageTargetWidth,
			_imageTargetHeight = _sizes.imageTargetHeight,
			_lightboxTargetWidth = _sizes.lightboxTargetWidth,
			_lightboxTargetHeight = _sizes.lightboxTargetHeight,
			_statusWidth = _sizes.statusWidth,
			_statusHeight = _sizes.statusHeight,
			_img = self.$lightbox.content.find( "img" ),
			_padding = self._getData( "lightboxPadding" ),
			_headerHeight = self._getData( "headerHeight" );

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
					.animate( {width: _lightboxTargetWidth}, self.options.animationSpeed )
					.animate( {height: _lightboxTargetHeight}, self.options.animationSpeed )
					.end()
				.animate( {left: ($(window).width() - _lightboxTargetWidth - _padding) / 2}, self.options.animationSpeed )
				.animate( {top: ($(window).height() - _lightboxTargetHeight - _padding - _headerHeight) / 2}, self.options.animationSpeed, next);
		} else {

			// window is too small to fit the lightbox
			$( self.$lightbox.root ).hide();
			if ( _statusWidth === -2 && _statusHeight === -2 ) {
				alert( "Window’s size is too small. Please resize it." );
			} else if ( _statusHeight === -2 ) {
				alert("Window’s height is too small. Please resize it." );
			} else if ( _statusWidth === -2 ) {
				alert( "Window’s width is too small. Please resize it." );
			}
		}
	},

	_queueShowContent: function( next ) {
		var self = this,
			_sizes = self._getSizes();

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

	_queueSlideDownHeader: function( next ) {
		var self = this;

		// show header
		self.$lightbox.header.slideDown( self.options.animationSpeed, next );
		// indicate that animation queue is finshed
		self._setData( "ready", true );
	},

	_queueSlideUpHeader: function( next ) {

		// structure is not ready - start an animation
		this._setData( "ready", false );
		this.$lightbox.header.slideUp ( this.options.animationSpeed, next );
	},

	_queueHideContent: function( next ) {
		this.$lightbox.content.find( "img" )
			.fadeOut( this.options.animationSpeed, function() {
				$( this ).remove();
				next();
			});
	},

	$lightbox: {},
	categories: {}
});

})( jQuery );
