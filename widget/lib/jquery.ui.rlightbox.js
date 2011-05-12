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
				})
				.mousedown( $.proxy(self._panoramaStart, self) )
				.mouseup( $.proxy(self._panoramaStop, self) );

			// zoom in or zoom out an image
			$lb.panoramaIcon.click( $.proxy(self._panoramaToggle, self) );

			// resize lightbox when window size changes
			$( window ).bind( "resize.rlightbox", $.proxy(function() {
				if ( self._getData("ready") ) {
					this._queueResizeLightbox();
					this._queueCenterContent();
				}
			}, self));

			// keep miscellaneous data like minimal size of the lightbox, flags, etc.
			// fill with initial data
			self._setData({
				minimalLightboxSize: {
					width: 300,
					height: 300
				},
				lightboxPadding: 12,
				headerHeight: 57,
				ready: false,
				panoramaEnabled: false
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

		// reset panorama
		$lb.panoramaIcon
			.hide()
			.removeClass( "ui-lightbox-panorama-icon-expand ui-lightbox-panorama-icon-shrink");
		self._setData( "panoramaEnabled", false );

		// reset the counter
		self._setData( "currentElementNumber", null );
		self._setData( "totalElementsNumber", null );

		// remove old title
		self.$lightbox.title.empty();

		// lightbox is not ready again
		self._setData( "ready", false );

		// get ready to next time - fill in queue
		self._setOpenQueue();
	},

	_createStructure: function() {
		var self = this;

		$( "<div id='ui-lightbox' class='ui-widget ui-widget-content ui-corner-all' style='display: none'></div>" )
			.append( "<div id='ui-lightbox-panorama-icon' style='display: none'></div> ")
			.append( "<div id='ui-lightbox-content' class='ui-widget-content'></div>" )
			.append( "<div id='ui-lightbox-header' class='ui-widget-header ui-corner-all' style='display: none'><p id='ui-lightbox-header-wrapper'><span id='ui-lightbox-header-title'></span></p><p id='ui-lightbox-header-counter'><span id='ui-lightbox-header-counter-current'>1</span><span> of </span><span id='ui-lightbox-header-counter-total'>1</span></p><a id='ui-lightbox-header-close' href='#'><span class='ui-icon ui-icon-closethick'>close</span></a></div>" )
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

	_getImageStatus: function( width, height ) {

		// statuses (concern both sides):
		// 1 - content fits the window and is larger than minimal lightbox size
		// -1 - content fits the window but is smaller or equal to minial lightbox size
		// 2 - content is larger than the window
		// -2 - the window is smaller than minimal lightbox size
		var _statusWidth, _statusHeight,
			self = this,
            _windowWidth = $( window ).width(),
            _windowHeight = $( window ).height(),
            _minimalLightboxWidth = self._getData( "minimalLightboxSize" ).width,
            _minimalLightboxHeight = self._getData( "minimalLightboxSize" ).height,
            _imageWidth = self._getData( "originalImageSize" ).width,
            _imageHeight = self._getData( "originalImageSize" ).height,
            _lightboxPadding = self._getData( "lightboxPadding" ),
			_headerHeight = self._getData( "headerHeight" );

		if ( _windowWidth < _minimalLightboxWidth + _lightboxPadding ) {
			_statusWidth = -2;
		} else if ( width <= _minimalLightboxWidth ) {
			_statusWidth = -1;
		} else if ( width > _minimalLightboxWidth && width + _lightboxPadding <= _windowWidth ) {
			_statusWidth = 1;
		} else {
			_statusWidth = 2;
		}

		if ( _windowHeight < _minimalLightboxHeight + _lightboxPadding + _headerHeight ) {
			_statusHeight = -2;
		} else if ( height <= _minimalLightboxHeight ) {
			_statusHeight = -1;
		} else if ( height > _minimalLightboxHeight && _windowHeight >= height + _lightboxPadding + _headerHeight ) {
			_statusHeight = 1;
		} else {
			_statusHeight = 2;
		}

		return {
			statusWidth: _statusWidth,
			statusHeight: _statusHeight
		}
	},

	_getSizes: function() {
        var _statuses, _statusWidth, _statusHeight, _imageTargetWidth, _imageTargetHeight, _lightboxTargetWidth, _lightboxTargetHeight,
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

        function _calculateSizes( w, h ) {
            _statuses = self._getImageStatus( w, h );
			_statusWidth = _statuses.statusWidth;
			_statusHeight = _statuses.statusHeight;

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
		_statuses = self._getImageStatus( _imageTargetWidth, _imageTargetHeight );
		_statusWidth = _statuses.statusWidth;
		_statusHeight = _statuses.statusHeight;

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
		_loadWatch = setInterval( _watch, 100 );
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

		// show counter
		self._updateCounter();

		// show title if any
		self._updateTitle();

		// start opening the lighbox
		$lb.queueContainer.open.dequeue( "lightboxOpen" );
	},

	_panoramaExpand: function() {

		// give the natural size to an image
		var _originalSize = this._getData( "originalImageSize" );

		// let know that we can scroll now
		this._setData( "panoramaEnabled", true );

		// show the icon
		this.$lightbox.panoramaIcon
			.removeClass( "ui-lightbox-panorama-icon-expand" )
			.addClass( "ui-lightbox-panorama-icon-shrink" );

		// zoom in
		this.$lightbox.content
			.find( "img" )
				.width( _originalSize.width )
				.height( _originalSize.height );

		// and center the content
		this._queueCenterContent();
	},

	_panoramaShrink: function() {
		this._setData( "panoramaEnabled", false );

		// show the icon
		this.$lightbox.panoramaIcon
			.removeClass( "ui-lightbox-panorama-icon-shrink" )
			.addClass( "ui-lightbox-panorama-icon-expand" );

		// zoom out
		this._queueResizeLightbox();
		this._queueCenterContent();
	},

	_panoramaStart: function( event ) {

		// remember starting point to calculate distance in _panoramaStop()
		this._setData({
			panoramaPosition: {
				xStart: event.pageX,
				yStart: event.pageY
			}
		});

		return false;
	},

	_panoramaStop: function( event ) {
		var _distX = ( event.pageX - this._getData("panoramaPosition").xStart ) * -1,
			_distY = ( event.pageY - this._getData("panoramaPosition").yStart ) * -1,
			$content = this.$lightbox.content;

		// if zooming is possible…
		if ( this._getData("panoramaEnabled") ) {
			$content
				.scrollLeft( $content.scrollLeft() + _distX )
				.scrollTop( $content.scrollTop() + _distY );
		}

		event.stopPropagation();
	},

	_panoramaToggle: function( event ) {

		// switches between _panoramaExpand and _panoramaShrink
		// we couldn’t use .toggle( expand, shrink ) on panorama icon because when lb is closed after panorama was turned on
		// and open again and next image once again can be zoomed we need to make sure that
		// expand is the first action – toggle would run shrink as the second function
		var _panoramaOn = this._getData( "panoramaEnabled" );

		if ( _panoramaOn === false ) {
			this._panoramaExpand();
		} else {
			this._panoramaShrink();
		}
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
				$.proxy( self._queueCenterContent, this ),
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
				$.proxy( self._queueCenterContent, this ),
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
		self.$lightbox.panoramaIcon = self.$lightbox.root.find( "#ui-lightbox-panorama-icon" );
		self.$lightbox.content = self.$lightbox.root.find( "#ui-lightbox-content" );
		self.$lightbox.header = self.$lightbox.root.find( "#ui-lightbox-header" );
		self.$lightbox.overlay = $( "#ui-lightbox-overlay" );
		self.$lightbox.close = $( "#ui-lightbox-header-close" );
		self.$lightbox.counterCurrent = self.$lightbox.root.find( "#ui-lightbox-header-counter-current" );
		self.$lightbox.counterTotal = self.$lightbox.root.find( "#ui-lightbox-header-counter-total" );
		self.$lightbox.title = self.$lightbox.root.find( "#ui-lightbox-header-title" );
		self.$lightbox.queueContainer = {
			open: $({}),
			next: $({})
		}
	},

	_updateCounter: function() {
		var _current, _total,
			self = this,
			$lb = self.$lightbox;

		_current = self._getData( "currentElementNumber" ) || 1;
		_total = self._getData( "totalElementsNumber" ) || 1;

		$lb.counterCurrent
			.empty()
			.append( _current );

		$lb.counterTotal
			.empty()
			.append( _total );
	},

	_updateTitle: function() {
		var _label = this.$lightbox.currentElement.attr( "title" );

		// set new label for the title and trim it if it is too long - no scrolling at the moment
		// 20px is a safety distance between text and the close button
		if ( _label !== "" ) {
			this.$lightbox.title
				.parent()
					.width( this.$lightbox.content.width() - 20 )
					.end()
				.empty()
				.append( _label );
		} else {
			this.$lightbox.title.append( "&nbsp;" );
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

			// save original sizes and status for panorama purposes
			self._setData( "originalStatus", self._getImageStatus( img.width, img.height) );
			console.log("początkowy status ", self._getData("originalStatus"));

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
		var _speed, _animate,
			self = this,
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

		console.log("po przeskalowaniu", _sizes);

		// if you use this method in the context of a queue then use animation; otherwise when used in live resize, don’t animate it
		if ( $.isFunction(next) ) {
			_speed = self.options.animationSpeed;
			_animate = true;
		} else {
			_speed = 0;
			_animate = false;
		}

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
					.animate( {width: _lightboxTargetWidth}, _speed )
					.animate( {height: _lightboxTargetHeight}, _speed )
					.end()
				.animate( {left: ($(window).width() - _lightboxTargetWidth - _padding) / 2}, _speed )
				.animate( {top: ($(window).height() - _lightboxTargetHeight - _padding - _headerHeight) / 2}, _speed, next);
		}
	},

	_queueCenterContent: function( next ) {
		var _sizes = this._getSizes();

		this.$lightbox.content
			.find( "img" )
				.css({
					top: _sizes.lightboxTargetHeight / 2 - _sizes.imageTargetHeight / 2,
					left: _sizes.lightboxTargetWidth / 2 - _sizes.imageTargetWidth / 2
				});

		// if we don’t run it in the live resize but in the queue
		if ( next ) {
			next();
		}
	},

	_queueShowContent: function( next ) {
		var self = this,
			$lb = self.$lightbox;
			_originalStatus = self._getData( "originalStatus" );

		// show content
		$lb.content.find( "img" )
			.fadeIn( self.options.animationSpeed, function() {

				// if one of the image sides is bigger than the screen, show panorama icon
				if ( _originalStatus.statusWidth === 2 || _originalStatus.statusHeight === 2 ) {
					$lb.panoramaIcon
						.show()
						.addClass( "ui-lightbox-panorama-icon-expand" );
				}
				next();
			});
	},

	_queueSlideDownHeader: function( next ) {
		var self = this;

		// show header
		self.$lightbox.header.slideDown( self.options.animationSpeed, next );

		// show and update counter
		self._updateCounter();

		// update title
		self._updateTitle();

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

		// hide the panorama icon
		this.$lightbox.panoramaIcon
			.hide()
			.removeClass( "ui-lightbox-panorama-icon-expand ui-lightbox-panorama-icon-shrink" );
	},

	$lightbox: {},
	categories: {}
});

})( jQuery );
