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
		categoryPrefix: "lb",
		showMap: true
	},

	_create: function() {
		var self = this,
			$lb = this.$lightbox;

		// some actions run only once – dirty flag nom nom nom
		if ( !$("body").data("HKn5fX_ZtrdfM-FBRHf6") ) {

			// there may be many elements to act on: images, flash films but only one structure of the widget
			this._createStructure();

			// set references for later use
			this._setReferences();

			// set animation queues
			this._setOpenQueue();
			this._setNextQueue();

			// close the lightbox upon clicking on the close button and the overlay
			$lb.close.add( $lb.overlay ).click( $.proxy(this._closeHandler, this) );

			// add handlers to the content container
			$lb.content
				.mousemove( $.proxy(this._navigationCheckSide, this) )
				.click( $.proxy(this._navigationNext, this) )
				.mousedown( $.proxy(this._panoramaStart, this) )
				.mouseup( $.proxy(this._panoramaStop, this) );

			// zoom in or zoom out an image
			$lb.panoramaIcon.click( $.proxy(this._panoramaToggle, this) );

			// resize lightbox when window size changes
			$( window ).bind( "resize.rlightbox", $.proxy(this._liveResize, this) );

			// keep miscellaneous data like minimal size of the lightbox, flags, etc.
			// fill with initial data
			this._setData({
				minimalLightboxSize: {
					width: 300,
					height: 300
				},
				lightboxPadding: 12,
				headerHeight: 57,
				ready: false,
				panoramaEnabled: false,
				mapSize: {
					width: parseInt( $lb.map.css("width") ),
					height: parseInt( $lb.map.css("height") )
				}
			});

			// never run it again
			$( "body" ).data( "HKn5fX_ZtrdfM-FBRHf6", true );
		}

		// add content into categories if any exists
		this._addToCategory( this.element );

		// open the lightbox upon click
		this.element.click(function() {
			self._open();
			return false;
		});
	},

	_addToCategory: function( element ) {
		var _categoryName = this._getCategoryName( element );

		// one element; exit
		if ( _categoryName === null ) {
			return;
		}

        if ( !this.categories[_categoryName] ) {

			// first time - such category had not been created before
            this.categories[_categoryName] = [];
            this.categories[_categoryName].push( element );
        } else {

			// category exists yet - just add element to it
            this.categories[_categoryName].push( element );
		}
	},

	_close: function() {
		var $lb = this.$lightbox;

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
			.removeClass( "ui-lightbox-panorama-icon-expand ui-lightbox-panorama-icon-shrink" );
		this._setData( "panoramaEnabled", false );

		// reset the counter
		this._setData( "currentElementNumber", null );
		this._setData( "totalElementsNumber", null );

		// remove old title
		this.$lightbox.title.empty();

		// hide the map
		this._panoramaHideMap();

		// lightbox is not ready again
		this._setData( "ready", false );

		// get ready to next time - fill in queue
		this._setOpenQueue();
	},

	_closeHandler: function( event ) {
		if ( this._getData("ready") ) {
			this._close();
			event.preventDefault();
			event.stopPropagation();
		}
	},

	_createStructure: function() {
		$( "<div id='ui-lightbox' class='ui-widget ui-widget-content ui-corner-all' style='display: none'></div>" )
			.append( "<div id='ui-lightbox-panorama-icon' style='display: none'></div> ")
			.append( "<div id='ui-lightbox-content' class='ui-widget-content'></div>" )
			.append( "<div id='ui-lightbox-header' class='ui-widget-header ui-corner-all' style='display: none'><p id='ui-lightbox-header-wrapper'><span id='ui-lightbox-header-title'></span></p><p id='ui-lightbox-header-counter'><span id='ui-lightbox-header-counter-current'>1</span><span> of </span><span id='ui-lightbox-header-counter-total'>1</span></p><a id='ui-lightbox-header-close' href='#'><span class='ui-icon ui-icon-closethick'>close</span></a></div>" )
			.appendTo( "body" )
			.after( "<div id='ui-lightbox-map' style='display: none'><div id='ui-lightbox-map-viewport'></div></div>" )
			.after( "<div id='ui-lightbox-overlay' class='ui-widget-overlay' style='display: none'></div>" );
	},

	destroy: function() {
	},

	_getAvailableScreenSize: function() {
		var _padding = this._getData( "lightboxPadding" );

		return {
			width: $( window ).width() - _padding,
			height: $( window ).height() - this._getData( "headerHeight" ) - _padding
		}
	},

	_getCategoryName: function( element ) {

		// if an anchor has class of e.g. ‘lb_gallery’ _getCategoryName() returns ‘gallery’ string as a category
        var _classNames = $( element ).attr( "class" ),
			_classPrefix = this.options.categoryPrefix + "_",
			_classPattern = new RegExp( _classPrefix + "(\\w+)" ),
			_name = _classPattern.exec( _classNames );

        return _name ? _name[1] : null;
	},

	_getCurrentElementNumber: function() {
		var _current,
			self = this;

		// returns an 1 based ordinal number of an image in a category
		$.each( this.categories[this._getData("currentCategory")], function(i, v) {

			// compare DOM elements
			if ( self.$lightbox.currentElement.get( 0 ) === $( v ).get( 0 ) ) {
				_current = i + 1;

				// exit $.each()
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
		// -1 - content fits the window but is smaller or equal to minimal lightbox size
		// 2 - content is larger than the window
		// -2 - the window is smaller than minimal lightbox size
		var _statusWidth, _statusHeight,
            _windowWidth = $( window ).width(),
            _windowHeight = $( window ).height(),
            _minimalLightboxWidth = this._getData( "minimalLightboxSize" ).width,
            _minimalLightboxHeight = this._getData( "minimalLightboxSize" ).height,
            _imageWidth = this._getData( "originalImageSize" ).width,
            _imageHeight = this._getData( "originalImageSize" ).height,
            _lightboxPadding = this._getData( "lightboxPadding" ),
			_headerHeight = this._getData( "headerHeight" );

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
            $lb = this.$lightbox,
			self = this,
            _windowWidth = $( window ).width(),
            _windowHeight = $( window ).height(),
            _minimalLightboxWidth = this._getData( "minimalLightboxSize" ).width,
            _minimalLightboxHeight = this._getData( "minimalLightboxSize" ).height,
            _imageWidth = this._getData( "originalImageSize" ).width,
            _imageHeight = this._getData( "originalImageSize" ).height,
            _lightboxPadding = this._getData( "lightboxPadding" ),
			_headerHeight = this._getData( "headerHeight" );

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
		_statuses = this._getImageStatus( _imageTargetWidth, _imageTargetHeight );
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

	_liveResize: function() {

		// resizes an image when size of the browser window resizes and when Panorama is turned off
		if ( this._getData("ready") && this._getData("panoramaEnabled") === false ) {
			this._queueResizeLightbox();
			this._queueCenterContent();
		} else if ( this._getData("ready") && this._getData("panoramaEnabled") ) {

			// otherwise keep the lightbox centered especially when window is bigger than the lightbox
			this._queueCenterLightbox();
		}
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

	_navigationCheckSide: function( event ) {
		var self = this,
			$content = self.$lightbox.content;

		// Check which side we are on. Check it only if the lightbox is ready (no animation in progress)
		// clicked image belongs to a gallery and we are not in the Panorama™ mode
		if ( self._getData("ready") && self._getData("currentCategory") && self._getData("panoramaEnabled") === false ) {
			var _pos = event.pageX - $content.offset().left,
				_center = Math.round( $content.width() / 2 );

			if ( _pos <= _center ) {
				self._setData( "side", "left" );
				$content.css( "cursor", "w-resize" );
			} else {
				self._setData( "side", "right" );
				$content.css( "cursor","e-resize" );
			}
		} else if ( self._getData("panoramaDrag") === false ) {

			// we are no longer hover over the content container
			self._setData( "side", "" );
			$content.css( "cursor", "default" );
		} else {
			self._setData( "side", "" );
			$content.css( "cursor", "move" );
		}
	},

	_navigationNext: function() {
		var _currentElementNumber,
			$lb = this.$lightbox,
			_category = this._getData( "currentCategory" );

		// prevent from multi clicking and go to the next image only if it belongs to a gallery
		if ( this._getData("ready") && _category) {
			_currentElementNumber = this._getData( "currentElementNumber" );

			if ( _currentElementNumber + 1 <= this._getData("totalElementsNumber") && this._getData("side") === "right" ) {
				this._setData( "currentElementNumber", _currentElementNumber + 1 );

				// update current element
				$lb.currentElement = this.categories[_category][_currentElementNumber];

				// next element - trigger the queue ‘next’ - first update it
				this._setNextQueue();
				$lb.queueContainer.next.dequeue( "lightboxNext" );
			} else if ( _currentElementNumber - 1 >= 1 && this._getData("side") === "left" ){
				this._setData( "currentElementNumber", _currentElementNumber - 1 );

				// update current element
				$lb.currentElement = this.categories[_category][_currentElementNumber - 2];

				// next element - trigger the queue ‘next’ - first update it
				this._setNextQueue();
				$lb.queueContainer.next.dequeue( "lightboxNext" );
			}
		}
	},

	_open: function() {
		var $lb = this.$lightbox;

		// keep a reference to a currentElement element
		$lb.currentElement = this.element;

		// remember which category content belongs to
		this._setData( "currentCategory", this._getCategoryName( $lb.currentElement ) );

		// determine and remember how many elements belong to a category
		// determine the current (and clicked) element in a category
		if ( this._getData("currentCategory") ) {
			this._setData( "totalElementsNumber", this.categories[this._getData("currentCategory")].length );
			this._setData( "currentElementNumber", this._getCurrentElementNumber() );
		}

		// show counter
		this._updateCounter();

		// show title if any
		this._updateTitle();

		// start opening the lighbox
		$lb.queueContainer.open.dequeue( "lightboxOpen" );
	},

	_panoramaCenterContent: function() {
		var _left, _top,
			_screenSize = this._getAvailableScreenSize(),
			_screenWidth = _screenSize.width,
			_screenHeight = _screenSize.height,
			_imageSize = this._getData( "originalImageSize" ),
			_imageWidth = _imageSize.width,
			_imageHeight = _imageSize.height,
			$content = this.$lightbox.content,
			$img = $content.find( "img" );

		// if width of an image was bigger than the available screen space and if we divided the both size by two
		// the left position of the image would be placed outside the content container; e.g. having
		// the screen size of 1200px wide and an image of 2000px wide, the left css property would
		// have value of -200px and thus the 200px would not be visible
		if ( _screenWidth < _imageWidth ) {
			_left = 0;
		} else {
			_left = $content.width() / 2 - $img.width() / 2;
		}

		if ( _screenHeight < _imageHeight ) {
			_top = 0;
		} else {
			_top = $content.height() / 2 - $img.height() / 2;
		}

		$img.css({
			top: _top,
			left: _left
		});
	},

	_panoramaExpand: function() {

		// _panoramaExpand does the main goal of the Panorama™: it displays the natural image size
		var _originalSize = this._getData( "originalImageSize" );

		// let know that we can scroll now
		this._setData( "panoramaEnabled", true );

		// show the zoom out icon
		this.$lightbox.panoramaIcon
			.removeClass( "ui-lightbox-panorama-icon-expand" )
			.addClass( "ui-lightbox-panorama-icon-shrink" );

		// give the natural size to the image
		this.$lightbox.content
			.find( "img" )
				.width( _originalSize.width )
				.height( _originalSize.height );

		// enlarge lightbox’s content to fit the screen best
		this._panoramaSetContentSize();

		// center the content and the whole lightbox
		this._panoramaCenterContent();
		this._queueCenterLightbox();

		// show the map
		if ( this.options.showMap ) {
			this._panoramaShowMap();
		}
	},

	_panoramaHideMap: function() {
		var $lb = this.$lightbox;

		// hide the map
		$lb.map.hide();

		// reset position of the viewport
		// -1 prevents from overlapping the map border
		$lb.viewport.css({
			left: -1,
			top: -1
		});
	},

	_panoramaSetContentSize: function() {
		var _contentWidth, _contentHeight,
			_minLightboxSize = this._getData( "minimalLightboxSize" ),
			_minLightboxWidth = _minLightboxSize.width,
			_minLightboxHeight = _minLightboxSize.height,
			_screenSize = this._getAvailableScreenSize(),
			_screenWidth = _screenSize.width,
			_screenHeight = _screenSize.height,
			_imageSize = this._getData( "originalImageSize" ),
			_imageWidth = _imageSize.width,
			_imageHeight = _imageSize.height;

			// show the most part of an image
			// e.g. suppose that we have an image of 3600px × 500px size and the available space in the browser
			// is 1268px × 806px taking into account default Firefox toolbars, scrollbars, etc.
			// Opening such an image results in displaing it (after resizing) of 1268px × 176px (the ratio must have been kept).
			// Now we would like to switch to the Panorama mode™. ;) The goal of panorama is to show the original size of the image
			// (that is 3600px × 500px in this example). But we just cannot display such big size in the smaller screen size.
			// We are confined to our example screen size (1268 × 806). The point is to display as much as possible.
			// Our width is bigger than those of the screen (1268) so we can only use the latter → if an image size is bigger than the screen size
			// limit it to the size of the screen. As for the height, before applying the panorama it was of 176px. But we have more space available on the screen (806px).
			// So instead of displaying 176px of height we can display the natural size of the image height — 500px.
			// But for example if the height was of 150px we cannot use this size because the minmal lightbox size is 300px. Use 300px size then.
			// It is how the magic goes! :D
			if ( _imageWidth > _screenWidth ) {
				_contentWidth = _screenWidth;
			} else if ( _imageWidth <= _minLightboxWidth ) {
				_contentWidth = _minLightboxWidth;
			} else {
				_contentWidth = _imageWidth;
			}

			if ( _imageHeight > _screenHeight ) {
				_contentHeight = _screenHeight;
			} else if ( _imageHeight <= _minLightboxHeight ) {
				_contentHeight = _minLightboxHeight;
			} else {
				_contentHeight = _imageHeight;
			}

			this.$lightbox.content
				.width( _contentWidth )
				.height( _contentHeight );
	},

	_panoramaShrink: function() {

		// _panoramaShrink retores the previous size of an image
		this._setData( "panoramaEnabled", false );

		// show the zoom in icon – let know that we can run panorama mode again
		this.$lightbox.panoramaIcon
			.removeClass( "ui-lightbox-panorama-icon-shrink" )
			.addClass( "ui-lightbox-panorama-icon-expand" );

		// resize an image to its previous size and center it
		this._queueResizeLightbox();
		this._queueCenterContent();

		// hide the map
		this._panoramaHideMap();
	},

	_panoramaShowMap: function() {
		var _viewportWidth, _viewportHeight, _viewportWidthRatio, _viewportHeightRatio,
		_mapSize = this._getData( "mapSize" ),
		_originalSize = this._getData ( "originalImageSize" ),
		$lb = this.$lightbox;

		// show the map and give the viewport relevant size
		// give the viewport relevant size
		_viewportWidthRatio = _mapSize.width / _originalSize.width;
		_viewportHeightRatio = _mapSize.height / _originalSize.height;

		_viewportWidth = Math.ceil( $lb.content.width() * _viewportWidthRatio );
		_viewportHeight = Math.ceil( $lb.content.height() * _viewportHeightRatio );

		$lb.viewport
			.width( _viewportWidth )
			.height( _viewportHeight );

		// show the map
		$lb.map.show();

		// used when you scroll the content
		this._setData({
			viewportRatio: {
				width: _viewportWidthRatio,
				height: _viewportHeightRatio
			}
		});
	},

	_panoramaStart: function( event ) {

		// remember starting point to calculate distance in _panoramaStop()
		this._setData({
			panoramaPosition: {
				xStart: event.pageX,
				yStart: event.pageY
			}
		});

		// used to show the ‘move’ cursor on ‘content’ container
		this._setData( "panoramaDrag", true );

		// give clue that we can drag now
		if ( this._getData("panoramaEnabled") ) {
			this.$lightbox.content.css( "cursor", "move" );
		}

		return false;
	},

	_panoramaStop: function( event ) {

		// calculate the distance between the starting point from _panoramaStart and this one
		// we use the oposite vector (-1) because dragging the mouse left we move right
		var _distX = ( event.pageX - this._getData("panoramaPosition").xStart ) * -1,
			_distY = ( event.pageY - this._getData("panoramaPosition").yStart ) * -1,
			$content = this.$lightbox.content,
			_viewportRatio = this._getData( "viewportRatio" );

		// indicate that we can revert the cursor to the default one
		this._setData( "panoramaDrag", false );

		// if we are in the panorama mode (the panorama icon was clicked)
		if ( this._getData("panoramaEnabled") ) {
			$content
				.scrollLeft( $content.scrollLeft() + _distX )
				.scrollTop( $content.scrollTop() + _distY );

			// show the relevant part of the map
			// subtrack 1 so that the viewport doesn’t overlap the map border
			this.$lightbox.viewport.css({
				left: $content.scrollLeft() * _viewportRatio.width - 1,
				top: $content.scrollTop() * _viewportRatio.height - 1
			});
		}

		event.stopPropagation();
	},

	_panoramaToggle: function( event ) {

		// switches between _panoramaExpand and _panoramaShrink
		// we couldn’t use .toggle( expand, shrink ) on panorama icon because when lb is closed after panorama was turned on (we were in the panorama mode)
		// and open again and next image once again can be zoomed we need to make sure that
		// expand is the first action – using jQuery .toggle() ‘expand’ would be the fist action again (because of its internal queue)
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
		var queueList = [
				$.proxy( this._queueSlideUpHeader, this ),
				$.proxy( this._queueHideContent, this ),
				$.proxy( this._queueLoadContent, this ),
				$.proxy( this._queueResizeLightbox, this ),
				$.proxy( this._queueCenterContent, this ),
				$.proxy( this._queueShowContent, this ),
				$.proxy( this._queueSlideDownHeader, this )
			];

		// place start animation queue in the queue container
		this.$lightbox.queueContainer.next.queue( "lightboxNext", queueList );
	},

	_setOpenQueue: function() {
		// we have two animated queues: one to open the lightbox and the second to perform next/previous operation
		// half of the operations are the same - they ovelap, and the rest such as ‘show the overlay’, ‘center lightbox’,
		// ‘slide up the header’ and ‘hide content’ are run only in one queue not in both
		// thus to not repeat oneself we keep in the queue lists only references to these methods
		// each one of these methods (that begin with _queue…) are passed ‘next’ parameter that is a reference to another
		// method in the queue.
		// $proxy is needed to have an access to a ‘global’ scope of the plugin – every method that is called in the queue
		// is run in its internal scope - we need to have an access to such method as _getSizes, _open, etc - one the same level.

		var queueList = [
				$.proxy( this._queueShowOverlay, this ),
				$.proxy( this._queueCenterLightbox, this ),
				$.proxy( this._queueLoadContent, this ),
				$.proxy( this._queueResizeLightbox, this ),
				$.proxy( this._queueCenterContent, this ),
				$.proxy( this._queueShowContent, this ),
				$.proxy( this._queueSlideDownHeader, this )
			];

		// place start animation queue in the queue container
		this.$lightbox.queueContainer.open.queue( "lightboxOpen", queueList );
	},

	_setReferences: function() {
		var $lb = this.$lightbox;

		// save references to wrapped set for later use
		$lb.root = $( "#ui-lightbox" );
		$lb.panoramaIcon = $lb.root.find( "#ui-lightbox-panorama-icon" );
		$lb.content = $lb.root.find( "#ui-lightbox-content" );
		$lb.header = $lb.root.find( "#ui-lightbox-header" );
		$lb.overlay = $( "#ui-lightbox-overlay" );
		$lb.close = $( "#ui-lightbox-header-close" );
		$lb.counterCurrent = $lb.root.find( "#ui-lightbox-header-counter-current" );
		$lb.counterTotal = $lb.root.find( "#ui-lightbox-header-counter-total" );
		$lb.title = $lb.root.find( "#ui-lightbox-header-title" );
		$lb.map = $( "#ui-lightbox-map" );
		$lb.viewport = $lb.map.children().eq( 0 );
		$lb.queueContainer = {
			open: $({}),
			next: $({})
		}
	},

	_updateCounter: function() {
		var _current, _total,
			$lb = this.$lightbox;

		_current = this._getData( "currentElementNumber" ) || 1;
		_total = this._getData( "totalElementsNumber" ) || 1;

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

			// keep the line height – prevent counter from popping up in the title line
			this.$lightbox.title.append( "&nbsp;" );
		}
	},

	_queueShowOverlay: function( next ) {

		// let know that lightbox is not ready now
		this._setData( "ready", false );

		// show overlay
		$( "body" ).css( "overflow", "hidden" );
		this.$lightbox.overlay.fadeIn( this.options.animationSpeed, next );
	},

	_queueCenterLightbox: function( next ) {
		var _screenWidth = $( window ).width(),
			_screenHeight = $( window ).height();
			_lbWidth = this.$lightbox.root.outerWidth(),
			_lbHeight = this.$lightbox.root.outerHeight();

		this.$lightbox.root
			.css({
				left: Math.round( (_screenWidth - _lbWidth) / 2 ) + "px",
				top: Math.round( (_screenHeight - _lbHeight) / 2 ) + "px"
			})
			.show( 0, next );
	},

	_queueLoadContent: function( next ) {
		var self = this,
			$lb = this.$lightbox;

		// start loading maximized image
		$lb.content.addClass( "ui-lightbox-loader" );
		$.when( this._loadImage($lb.currentElement.attr("href")) ).then(function( img ) {

			// keep original size of an image – needed when resizing
			self._setData({
				originalImageSize: {
					width: img.width,
					height: img.height
				}
			});

			// save original sizes and status for panorama purposes
			self._setData( "originalStatus", self._getImageStatus( img.width, img.height) );

			// add the loaded image and hide it
			$lb.content
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
			_sizes = this._getSizes(),
			_imageTargetWidth = _sizes.imageTargetWidth,
			_imageTargetHeight = _sizes.imageTargetHeight,
			_lightboxTargetWidth = _sizes.lightboxTargetWidth,
			_lightboxTargetHeight = _sizes.lightboxTargetHeight,
			_statusWidth = _sizes.statusWidth,
			_statusHeight = _sizes.statusHeight,
			_img = this.$lightbox.content.find( "img" ),
			_padding = this._getData( "lightboxPadding" ),
			_headerHeight = this._getData( "headerHeight" );

		// if you use this method in the context of a queue then use animation; otherwise when used in live resize, don’t animate it
		if ( $.isFunction(next) ) {
			_speed = this.options.animationSpeed;
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
			this.$lightbox.root
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
		var $content = this.$lightbox.content,
			$img = $content.find( "img" );

		$content
			.find( "img" )
				.css({
					top: $content.height() / 2 - $img.height() / 2,
					left: $content.width() / 2 - $img.width() / 2
				});

		// if we don’t run it in the live resize but in the queue
		if ( next ) {
			next();
		}
	},

	_queueShowContent: function( next ) {
		var $lb = this.$lightbox;
			_originalStatus = this._getData( "originalStatus" );

		// show content
		$lb.content.find( "img" )
			.fadeIn( this.options.animationSpeed, function() {

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

		// show header
		this.$lightbox.header.slideDown( this.options.animationSpeed, next );

		// show and update counter
		this._updateCounter();

		// update title
		this._updateTitle();

		// indicate that animation queue is finshed
		this._setData( "ready", true );
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

		// disable panorama
		this.$lightbox.panoramaIcon
			.hide()
			.removeClass( "ui-lightbox-panorama-icon-expand ui-lightbox-panorama-icon-shrink" );

		this._setData( "panoramaEnabled", false );

		// hide the map
		this._panoramaHideMap();
	},

	$lightbox: {},
	categories: {}
});

})( jQuery );
