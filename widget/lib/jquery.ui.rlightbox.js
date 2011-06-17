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
		setPrefix: "lb",
		showMap: true,
		counterDelimiter: " / ",
		videoWidth: 640,
		videoHeight: 385,
		errorMessage: "Oops! Something is wrong! If the problem repeats itself, let the page’s admin know. Would you like to try again or reject this content?",
		againButtonLabel: "Try again",
		rejectButtonLabel: "Reject this content",
		overwriteTitle: false
	},

	_create: function() {
		var _content,
			global = $.ui.rlightbox.global,
			$lb = global.$lightbox,
			self = this;

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
			
			// highlight the close button when mouse hovers over it
			$lb.close.hover(
				function() {
					$( this ).toggleClass( "ui-state-hover" );
				}
			);

			// add handlers to the content container
			$lb.content
				.mousemove( $.proxy(this._navigationCheckSide, this) )
				.click( $.proxy(this._navigationNext, this) )
				.mousedown( $.proxy(this._panoramaStart, this) )
				.mouseup( $.proxy(this._panoramaStop, this) );

			// zoom in or zoom out an image
			$lb.panoramaIcon
				.click( $.proxy(this._panoramaToggle, this) )
				.hover( $.proxy(this._panoramaHighlight, this) );

			// resize lightbox when window size changes
			$( window ).bind( "resize.rlightbox", $.proxy(this._liveResize, this) );

			// never run it again
			$( "body" ).data( "HKn5fX_ZtrdfM-FBRHf6", true );
		}

		// which type content belongs to: youtube, vimeo, flash, image, etc.;
		// what is its url, title (for images)
		_content = this._extractAnchor( this.element );
		
		// add type, url, jQuery element and title of content to a set if content is supported by the lightbox
		// otherwise fall silently
		if ( _content.type !== undefined ) {
			
			this._addToSet( _content );
		
			// open the lightbox upon click
			this.element.click(function(event) {
				self._open();
				event.preventDefault();
			});
		}
	},

	_addToSet: function( setElement ) {
		
		// set structure is following:
		// sets: {
		//		setName: [
		//			{
		//				url: "http://www.youtube.com?v=u408408598,
		//				type: "youtube"
		//			},
		//			{…}
		//		],
		//		setName2: […]
		//
		var _setName = this._getSetName( setElement.element ),
			_sets = $.ui.rlightbox.global.sets;

		if ( !_sets[_setName] ) {

			// first time - such set had not been created before
			_sets[_setName] = [];
			_sets[_setName].push( setElement );
		} else {

			// set exists yet - just add element to it
			_sets[_setName].push( setElement );
		}
	},

	_close: function() {
		var global = $.ui.rlightbox.global,
			$lb = global.$lightbox,
			data = global.data;

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
		data.panoramaEnabled = false;

		// reset the counter
		data.currentElementNumber = null;
		data.totalElementsNumber = null;

		// remove old title
		$lb.title.empty();

		// hide the map
		this._panoramaHideMap();

		// lightbox is not ready again
		data.ready = false;

		// get ready to next time - fill in queue
		this._setOpenQueue();
	},

	_closeHandler: function( event ) {
		var global = $.ui.rlightbox.global,
			data = global.data;
			
		if ( data.ready ) {
			this._close();
			event.preventDefault();
			event.stopPropagation();
		}
	},

	_createStructure: function() {
		var _lightbox = "<div id='ui-lightbox' class='ui-widget ui-widget-content ui-corner-all' style='display: none'>\
					<div id='ui-lightbox-panorama-icon' style='display: none'></div>\
					<div id='ui-lightbox-content' class='ui-widget-content'></div>\
					<div id='ui-lightbox-header' class='ui-widget-header ui-corner-all' style='display: none'>\
						<p id='ui-lightbox-header-wrapper'>\
							<span id='ui-lightbox-header-title'></span>\
						</p>\
						<p id='ui-lightbox-header-counter'></p>\
						<a id='ui-lightbox-header-close' href='#'>\
							<span class='ui-icon ui-icon-closethick'>close</span>\
						</a>\
					</div>\
				</div>",

			_map = "<div id='ui-lightbox-map' style='display: none'>\
					<div id='ui-lightbox-map-viewport'></div>\
				</div>",

			_overlay = "<div id='ui-lightbox-overlay' class='ui-widget-overlay' style='display: none'></div>";

		// append the structure
		$( _lightbox )
			.appendTo( "body" )
			.after( _map )
			.after( _overlay );
	},
	
	destroy: function() {
		
		// unwrap $currentElement from jQuery wrapped object and
		// prevents it from being acted upon, unbinding event handlers
		var global = $.ui.rlightbox.global,
			data = global.data,
			$currentElement = data.currentSetElement.element;
		
		// code taken from jqury.ui.widget.js – it is the default behaviour
		// from the widget factory but we can’t call it because it acts upon
		// this.element – we have to act on a arbitrary one
		$currentElement
			.unbind( "." + this.widgetName )
			.unbind( "click" )
			.removeData( this.widgetName );
	},
	
	_extractAnchor: function( anchor ) {
		
		// _extractAnchor elicits information from anchor element (DOM A element)
		// @url are used for loading content such as images, youtube videos, etc
		// @type is needed to choose suitable loading method in _queueLoadContent
		// @title is used to dispay title of an image or flash content (.flv) –
		// since youtube and vimeo content is got via oembed, title is got later after loading the content
		// $element keeps jQuery object of an anchor and it’s used for example
		// in _getCurrentElementNumber to get the index in array in a set of clicked content
		var self = this,
			_result = {type: undefined},
			$anchor = $( anchor ),
			_url = $anchor.attr( "href" ),
			_service = {
				youtube: {
					urls: [/(youtube\.com\/watch\?v=([\w-_]+))&?/],
					type: "youtube"
				},
				image: {
					urls: [/.jpg$|.png$|.gif$/],
					type: "image"
				},
				vimeo: {
					urls: [/(http:\/\/vimeo\.com\/groups\/\w+\/videos\/\w+)&?/, /(http:\/\/vimeo\.com\/\w+)&?/],
					type: "vimeo"
				}
			};
			
		$.each(_service,
			function(name, content) {
				var _found = false;

				// outer loop: _content.youtube, _content.image, etc.
				$.each(content.urls,
					function( index, regExp ) {
						var _res = regExp.exec( _url );
						
						// inner loop: urls array
						if ( _res !== null ) {
							
							// for Youtube, Vimeo we return a normalised url
							// without additional parameters
							_result = {
								url: _res[1],
								type: content.type,
								element: $anchor
							}
							
							if ( content.type === "image" || self.options.overwriteTitle ) {
								_result.title = $anchor.attr( "title" );
								_result.url = _url;
							}
							
							_found = true;
							
							// break the loop
							return false;
						}
					});
				
				if ( _found ) {
					
					// no need to loop
					return false;
				}
			});
		
		return _result;
	},		

	_getAvailableScreenSize: function() {
		var global = $.ui.rlightbox.global,
			data = global.data,
			_padding = data.lightboxPadding;

		return {
			width: $( window ).width() - _padding,
			height: $( window ).height() - data.headerHeight - _padding
		}
	},

	_getSetName: function( element ) {

		// if an anchor has class of e.g. ‘lb_gallery’ _getSetName() returns ‘gallery’ string as a set
		// otherwise it returns "single" - single content is placed under "single" set  
		var _classNames = $( element ).attr( "class" ),
			_classPrefix = this.options.setPrefix + "_",
			_classPattern = new RegExp( _classPrefix + "(\\w+)" ),
			_name = _classPattern.exec( _classNames );

		return _name ? _name[1] : "single";
	},

	_getCurrentElementNumber: function( element ) {
		var _currentNumber,
			global = $.ui.rlightbox.global,
			data = global.data,
			sets = global.sets,
			self = this,
			_currentSet = sets[data.currentSet];

		// returns a 1 based ordinal number of an image in a set
		$.each(_currentSet, function(i, v) {
		
			// compare DOM elements
			if ( $(element).get(0) === v.element.get(0) ) {
				_currentNumber = i + 1;
		
				// exit $.each()
				return false;
			}
		});
		return _currentNumber;
	},

	_getImageStatus: function( width, height ) {

		// statuses (concern both sides):
		// 1 - content fits the window and is larger than minimal lightbox size
		// -1 - content fits the window but is smaller or equal to minimal lightbox size
		// 2 - content is larger than the window
		// -2 - the window is smaller than minimal lightbox size
		var _statusWidth, _statusHeight,
			global = $.ui.rlightbox.global,
			data = global.data,
			_currentElement = data.currentSetElement,
			_windowWidth = $( window ).width(),
			_windowHeight = $( window ).height(),
			_minimalLightboxWidth = data.minimalLightboxSize.width,
			_minimalLightboxHeight = data.minimalLightboxSize.height,
			_imageWidth = _currentElement.width,
			_imageHeight = _currentElement.height,
			_lightboxPadding = data.lightboxPadding,
			_headerHeight = data.headerHeight;

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
			global = $.ui.rlightbox.global,
			$lb = global.$lightbox,
			data = global.data,
			self = this,
			_currentElement = data.currentSetElement,
			_windowWidth = $( window ).width(),
			_windowHeight = $( window ).height(),
			_minimalLightboxWidth = data.minimalLightboxSize.width,
			_minimalLightboxHeight = data.minimalLightboxSize.height,
			_imageWidth = _currentElement.width,
			_imageHeight = _currentElement.height,
			_lightboxPadding = data.lightboxPadding,
			_headerHeight = data.headerHeight;
				
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
						_imageTargetWidth = _lightboxTargetWidth;
	
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
		var global = $.ui.rlightbox.global,
			data = global.data;

		// resizes an image when size of the browser window resizes and when Panorama is turned off
		if ( data.ready && data.panoramaEnabled === false ) {
			this._queueResizeLightbox();
			this._updateTitleWidth();
			this._queueCenterContent();
		} else if ( data.ready && data.panoramaEnabled ) {

			// otherwise keep the lightbox centered especially when window is bigger than the lightbox
			this._queueCenterLightbox();
		}
	},
	
	_loadContentImage: function( url ) {
		var global = $.ui.rlightbox.global,
			$lb = global.$lightbox,
			data = global.data,
			self = this,
			_currentElement = data.currentSetElement,
			_dfd = $.Deferred(),
			$newImage = $( "<img />" );
			
		// start loading maximized image
		$lb.content.addClass( "ui-lightbox-loader" );
		
		// new Date().getTime() is used because of IEs caching problem
		$newImage
			.attr( "src", url + "?" + new Date().getTime() )
			.load(
				function() {
					// keep original size of an image – needed when resizing
					_currentElement.width = this.width;
					_currentElement.height = this.height;
				
					// save original sizes and status for panorama purposes
					_currentElement.originalStatus = self._getImageStatus( this.width, this.height );
				
					// add the loaded image and hide it
					$lb.content
						.removeClass( "ui-lightbox-loader" )			
						.empty()
						.append( this )
						.children()
							.hide();
				
					// continue the animation queue
					_dfd.resolve();					
				}
			)
			.error(
				function() {
					$lb.content.removeClass( "ui-lightbox-loader" );
					self._showErrorMessage();
					
					// continue the animation queue
					_dfd.resolve();
				}
			);
		
		return _dfd.promise();
	},
	
	_loadContentYoutube: function( url ) {
		var _width, _height,
			global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox,			
			self = this,
			_dfd = $.Deferred(),
			_apiEnd = data.oembedProvider,
			_currentElement = data.currentSetElement,
			_minimalLightboxSize = data.minimalLightboxSize;

		// show loader
		$lb.content.addClass( "ui-lightbox-loader" );
		
		$.ajax(
			{
				url: _apiEnd,
				data: {
					url: url,
					maxwidth: this.options.videoWidth,
					maxheight: this.options.videoHeight
				},
				dataType: "jsonp",
				timeout: 5000
			}
		)
		.success(
			function( data ) {

				// add embedded code
				$lb.content
					.removeClass( "ui-lightbox-loader" )
					.empty()
					.append( data.html )
					.children()
						.wrap( "<div style='display: none'></div>" );
				
				// remember video title
				if ( self.options.overwriteTitle === false ) {
					_currentElement.title = data.title;
				}
				
				// and returned width and height
				if ( data.width < _minimalLightboxSize.width ) {
					_width = _minimalLightboxSize.width;
				} else {
					_width = data.width;
				}
				
				if ( data.height < _minimalLightboxSize.height ) {
					_height = _minimalLightboxSize.height;
				} else {
					_height = data.height;
				}
				
				_currentElement.width = _width;
				_currentElement.height = _height;
				
				// continue the animation queue
				_dfd.resolve();
			}
		)
		.error(function() {
			$lb.content.removeClass( "ui-lightbox-loader" );
			self._showErrorMessage();
			
			// continue the animation queue
			_dfd.resolve();
		});
		
		return _dfd.promise();
	},

	_navigationCheckSide: function( event ) {
		var global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox,
			$content = $lb.content;

		// Check which side we are on. Check it only if the lightbox is ready (no animation in progress)
		// clicked image belongs to a gallery and we are not in the Panorama™ mode
		if ( data.ready && data.currentSet !== "single" && data.currentSetElement.type === "image" && data.panoramaEnabled === false ) {
			var _pos = event.pageX - $content.offset().left,
				_center = Math.round( $content.width() / 2 );

			if ( _pos <= _center ) {
				data.side = "left";
				$content.css( "cursor", "w-resize" );
			} else {
				data.side = "right"
				$content.css( "cursor","e-resize" );
			}
		} else if ( data.panoramaDrag === false ) {

			// we are no longer hover over the content container
			data.side = "";
			$content.css( "cursor", "default" );
		} else {
			data.side = "";
			$content.css( "cursor", "move" );
		}
	},
	
	_navigationGoToElement: function( number ) {
		
		// goes to a custom element
		var global = $.ui.rlightbox.global,
			data = global.data,
			sets = global.sets,
			$lb = global.$lightbox,
			_currentSet = data.currentSet;
		
		// which element go to
		data.currentElementNumber = number;
		data.currentSetElement = sets[_currentSet][number - 1];
		
		// reload animation queue and trigger it
		this._setNextQueue();
		$lb.queueContainer.next.dequeue( "lightboxNext" );
	},

	_navigationNext: function() {
		var _currentElementNumber,
			global = $.ui.rlightbox.global,
			data = global.data,
			sets = global.sets,
			$lb = global.$lightbox,
			_set = data.currentSet;

		// prevent from multi clicking and go to the next image only if it belongs to a gallery
		if ( data.ready && _set !== "single" ) {
			_currentElementNumber = data.currentElementNumber;

			if ( _currentElementNumber + 1 <= data.totalElementsNumber && data.side === "right" ) {
				data.currentElementNumber = _currentElementNumber + 1;

				// update current element
				data.currentSetElement = sets[_set][_currentElementNumber];

				// next element - trigger the queue ‘next’ - first update it
				this._setNextQueue();
				$lb.queueContainer.next.dequeue( "lightboxNext" );
			} else if ( _currentElementNumber - 1 >= 1 && data.side === "left" ){
				data.currentElementNumber = _currentElementNumber - 1;

				// update current element
				data.currentSetElement = sets[_set][_currentElementNumber - 2];

				// next element - trigger the queue ‘next’ - first update it
				this._setNextQueue();
				$lb.queueContainer.next.dequeue( "lightboxNext" );
			}
		}
	},

	_open: function() {
		var global = $.ui.rlightbox.global,
			data = global.data,
			sets = global.sets,
			$lb = global.$lightbox,
			_currentSet = this._getSetName( this.element ),
			_currentUrl = $( this.element ).attr( "href" );

		// remember which set content belongs to
		data.currentSet = _currentSet;

		// determine and remember how many elements belong to a set
		// determine the current (and clicked) element in a set
		data.totalElementsNumber = sets[_currentSet].length;
		data.currentElementNumber = this._getCurrentElementNumber( this.element );

		// keep a reference to a current element in a set (consisting of a url, type…)
		data.currentSetElement = sets[_currentSet][data.currentElementNumber - 1];

		// start opening the lighbox
		$lb.queueContainer.open.dequeue( "lightboxOpen" );
	},

	_panoramaCenterContent: function() {
		var _left, _top,
			global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox,
			_currentElement = data.currentSetElement,
			_screenSize = this._getAvailableScreenSize(),
			_screenWidth = _screenSize.width,
			_screenHeight = _screenSize.height,
			_imageWidth = _currentElement.width,
			_imageHeight = _currentElement.height,
			$content = $lb.content,
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
		var global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox,
			_currentElement = data.currentSetElement;

		// let know that we can scroll now
		data.panoramaEnabled = true;

		// show the zoom out icon
		$lb.panoramaIcon
			.removeClass()
			.addClass( "ui-lightbox-panorama-icon-shrink-hover" );

		// give the natural size to the image
		$lb.content
			.find( "img" )
				.width( _currentElement.width )
				.height( _currentElement.height );

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
		var global = $.ui.rlightbox.global,
			$lb = global.$lightbox;

		// hide the map
		$lb.map.hide();

		// reset position of the viewport
		// -1 prevents from overlapping the map border
		$lb.viewport.css({
			left: -1,
			top: -1
		});
	},
	
	_panoramaHighlight: function() {
		var _suffixPosition,
			global = $.ui.rlightbox.global,
			$lb = global.$lightbox,
			_suffix = "-hover";

		$lb.panoramaIcon.attr("class",
			function(index, oldValue) {
				_suffixPosition = oldValue.indexOf( _suffix );
				if ( _suffixPosition !== -1 ) {
					return oldValue.slice( 0, _suffixPosition );
				} else {
					return oldValue + _suffix;
				}
			});		
	},

	_panoramaSetContentSize: function() {
		var _contentWidth, _contentHeight,
			global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox,
			_currentElement = data.currentSetElement,
			_minLightboxSize = data.minimalLightboxSize,
			_minLightboxWidth = _minLightboxSize.width,
			_minLightboxHeight = _minLightboxSize.height,
			_screenSize = this._getAvailableScreenSize(),
			_screenWidth = _screenSize.width,
			_screenHeight = _screenSize.height,
			_imageWidth = _currentElement.width,
			_imageHeight = _currentElement.height;

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

			$lb.content
				.width( _contentWidth )
				.height( _contentHeight );
	},

	_panoramaShrink: function() {
		var global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox;

		// _panoramaShrink retores the previous size of an image
		data.panoramaEnabled = false;

		// show the zoom in icon – let know that we can run panorama mode again
		$lb.panoramaIcon
			.removeClass()
			.addClass( "ui-lightbox-panorama-icon-expand-hover" );

		// resize an image to its previous size and center it
		this._queueResizeLightbox();
		this._queueCenterContent();

		// hide the map
		this._panoramaHideMap();
	},

	_panoramaShowMap: function() {
		var _viewportWidth, _viewportHeight, _viewportWidthRatio, _viewportHeightRatio,
		global = $.ui.rlightbox.global,
		data = global.data,
		$lb = global.$lightbox,
		_currentElement = data.currentSetElement,
		_mapSize = data.mapSize;

		// show the map and give the viewport relevant size
		// give the viewport relevant size
		_viewportWidthRatio = _mapSize.width / _currentElement.width;
		_viewportHeightRatio = _mapSize.height / _currentElement.height;

		_viewportWidth = Math.ceil( $lb.content.width() * _viewportWidthRatio );
		_viewportHeight = Math.ceil( $lb.content.height() * _viewportHeightRatio );

		$lb.viewport
			.width( _viewportWidth )
			.height( _viewportHeight );

		// show the map
		$lb.map.show();

		// used when you scroll the content
		data.viewportRatio = {
			width: _viewportWidthRatio,
			height: _viewportHeightRatio
		}

	},

	_panoramaStart: function( event ) {
		var global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox;

		// remember starting point to calculate distance in _panoramaStop()
		data.panoramaPosition =
			{
				xStart: event.pageX,
				yStart: event.pageY
			};

		// used to show the ‘move’ cursor on ‘content’ container
		data.panoramaDrag = true;

		// give clue that we can drag now
		if ( data.panoramaEnabled ) {
			$lb.content.css( "cursor", "move" );
		}

		return false;
	},

	_panoramaStop: function( event ) {

		// calculate the distance between the starting point from _panoramaStart and this one
		// we use the oposite vector (-1) because dragging the mouse left we move right
		var global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox,
			_distX = ( event.pageX - data.panoramaPosition.xStart ) * -1,
			_distY = ( event.pageY - data.panoramaPosition.yStart ) * -1,
			$content = $lb.content,
			_viewportRatio = data.viewportRatio;

		// indicate that we can revert the cursor to the default one
		data.panoramaDrag = false;

		// if we are in the panorama mode (the panorama icon was clicked)
		if ( data.panoramaEnabled ) {
			$content
				.scrollLeft( $content.scrollLeft() + _distX )
				.scrollTop( $content.scrollTop() + _distY );

			// show the relevant part of the map
			// subtrack 1 so that the viewport doesn’t overlap the map border
			$lb.viewport.css({
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
		var global = $.ui.rlightbox.global,
			data = global.data,
			_panoramaOn = data.panoramaEnabled;

		if ( _panoramaOn === false ) {
			this._panoramaExpand();
		} else {
			this._panoramaShrink();
		}
	},
	
	_removeSetElement: function( number ) {
		// when there is an error while loading content, in the error screen
		// there is a possibility to reject content that might have a wrong
		// url; _removeSetElement removes rejects such content in order to
		// the error message not appear again;
		// the method prevents rlightbox from being acted upon such content
		var global = $.ui.rlightbox.global,
			data = global.data,
			sets = global.sets,
			_currentSet = data.currentSet,
			_total = data.totalElementsNumber;

		// remove given element from a set
		sets[_currentSet].splice( number - 1, 1 );
		
		// if there is only one element left, close the lightbox, otherwise load next element
		if( _total === 1 || _currentSet === "single" ) {
			this._close();

			// remove the instance from encapsulated DOM element (jquery one)
			this.destroy();
		} else {
			this.destroy();
			
			// update total element numbers
			data.totalElementsNumber = sets[_currentSet].length;
			
			// go to a new element
			if ( number === _total ) {
				this._navigationGoToElement( number - 1 );
			} else {
				this._navigationGoToElement( number );
			}
		}
	},

	_setOption: function( key, value ) {
	},

	_setNextQueue: function() {

		// for description take a look at _setOpenQueue method
		var global = $.ui.rlightbox.global,
			$lb = global.$lightbox,
			queueList = [
				$.proxy( this._queueSlideUpHeader, this ),
				$.proxy( this._queueHideContent, this ),
				$.proxy( this._queueLoadContent, this ),
				$.proxy( this._queueResizeLightbox, this ),
				$.proxy( this._queueCenterContent, this ),
				$.proxy( this._queueShowContent, this ),
				$.proxy( this._queueSlideDownHeader, this )
			];

		// place start animation queue in the queue container
		$lb.queueContainer.next.queue( "lightboxNext", queueList );
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

		var global = $.ui.rlightbox.global,
			$lb = global.$lightbox,
			queueList = [
				$.proxy( this._queueShowOverlay, this ),
				$.proxy( this._queueCenterLightbox, this ),
				$.proxy( this._queueLoadContent, this ),
				$.proxy( this._queueResizeLightbox, this ),
				$.proxy( this._queueCenterContent, this ),
				$.proxy( this._queueShowContent, this ),
				$.proxy( this._queueSlideDownHeader, this )
			];

		// place start animation queue in the queue container
		$lb.queueContainer.open.queue( "lightboxOpen", queueList );
	},

	_setReferences: function() {
		var global = $.ui.rlightbox.global,
			$lb = global.$lightbox;

		// save references to wrapped set for later use
		$lb.root = $( "#ui-lightbox" );
		$lb.panoramaIcon = $lb.root.find( "#ui-lightbox-panorama-icon" );
		$lb.content = $lb.root.find( "#ui-lightbox-content" );
		$lb.header = $lb.root.find( "#ui-lightbox-header" );
		$lb.headerWrapper = $lb.header.find( "#ui-lightbox-header-wrapper" );		
		$lb.overlay = $( "#ui-lightbox-overlay" );
		$lb.close = $( "#ui-lightbox-header-close" );
		$lb.counter = $lb.root.find( "#ui-lightbox-header-counter" );
		$lb.title = $lb.root.find( "#ui-lightbox-header-title" );
		$lb.map = $( "#ui-lightbox-map" );
		$lb.viewport = $lb.map.children().eq( 0 );
		$lb.queueContainer = {
			open: $({}),
			next: $({})
		}
	},
	
	_showErrorMessage: function() {
		
		// shows a screen with a message that content could not be loaded
		// and two buttons: one to try to load content again and one to
		// reject the content; in order to keep the dependencie to minimum
		// buttons are not jQuery UI widgets but use their CSS classes
		var global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox,
			self = this,
			_currentElementNumber = data.currentElementNumber,
			_errorMessage = this.options.errorMessage,
			_againLabel = this.options.againButtonLabel,
			_rejectLabel = this.options.rejectButtonLabel,
			$structure = $("<div id='ui-lightbox-error'>" +
							"<div id='ui-lightbox-error-message'>" +
								_errorMessage +
							"</div>" +
							"<div id='ui-lightbox-error-footer'>" +
								"<a href='#' id='ui-lightbox-error-footer-again' class='ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-primary'>" +
									"<span class='ui-icon ui-icon-refresh'></span>" +
									"<span class='ui-button-text'>" + _againLabel + "</span>" +
								"</a>" +
								"<a href='#' id='ui-lightbox-error-footer-reject' class='ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-primary'>" +
									"<span class='ui-icon ui-icon-trash'></span>" +
									"<span class='ui-button-text'>" + _rejectLabel + "</span>" +
								"</a>" + 
							"</div>" +
						"</div>"),
			$again = $structure.find( "#ui-lightbox-error-footer-again" ),
			$reject = $structure.find( "#ui-lightbox-error-footer-reject" );
		
		// ‘again’ button give a user a chance to try loading content again
		$again
			.click(function() {
				self._navigationGoToElement( _currentElementNumber );
			})
			.hover(
				function() {
					$( this ).toggleClass( "ui-state-hover" );
				}
			);
		
		// removes the broken content from list of known contents
		$reject
			.click(function() {
				self._removeSetElement( _currentElementNumber );
			})
			.hover(
				function() {
					$( this ).toggleClass( "ui-state-hover" );
				}
			);			
		
		// treat the message as a normal content
		$lb.content
			.empty()
			.append( $structure )
			.children()
				.hide();
		
		// because we don’t want to break the animation queue we need to tell
		// subsequent functions in the queue that an error occured
		data.showErrorMessage = true;
	},	

	_updateCounter: function() {
		var _current, _total, _newCounter,
			global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox,
			_currentSet = data.currentSet;
			
			if ( _currentSet !== "single" ) {
				_current = data.currentElementNumber;
				_total = data.totalElementsNumber;
			} else {
				_current = 1;
				_total = 1;
			}
			
			_newCounter = _current + this.options.counterDelimiter + _total;

		$lb.counter.text( _newCounter );
	},

	_updateTitle: function() {
		var global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox,
			_currentElement = data.currentSetElement;
		
		// set new label for the title and trim it if it is too long - no scrolling at the moment
		// 20px is a safety distance between text and the close button
		if ( _currentElement.title !== "" ) {
			$lb.title
				.empty()
				.append( _currentElement.title );
		} else {

			// keep the line height – prevent counter from popping up in the title line
			$lb.title.append( "&nbsp;" );
		}
	},
	
	_updateTitleWidth: function() {
		var global = $.ui.rlightbox.global,
			$lb = global.$lightbox;
		
		// 12px – 2 × border + 2 × padding
		// 20px – safe distance from the close button
		$lb.headerWrapper.width( $lb.content.width() - 20 - 12 );
	},

	_queueShowOverlay: function( next ) {
		var global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox;

		// let know that lightbox is not ready now
		data.ready = false;

		// show overlay
		$( "body" ).css( "overflow", "hidden" );
		$lb.overlay.fadeIn( this.options.animationSpeed, next );
	},

	_queueCenterLightbox: function( next ) {
		var global = $.ui.rlightbox.global,
			$lb = global.$lightbox,
			$root = $lb.root,
			_screenWidth = $( window ).width(),
			_screenHeight = $( window ).height(),
			_lbWidth = $root.outerWidth(),
			_lbHeight = $root.outerHeight();

		$root
			.css({
				left: Math.round( (_screenWidth - _lbWidth) / 2 ) + "px",
				top: Math.round( (_screenHeight - _lbHeight) / 2 ) + "px"
			})
			.show( 0, next );
	},

	_queueLoadContent: function( next ) {
		
		// loads appropriate content using right method
		var _loadContentMethod,
			global = $.ui.rlightbox.global,
			data = global.data,
			_currentSetElement = data.currentSetElement;
		
		// assume that there will be no error
		data.showErrorMessage = false;
		
		switch ( _currentSetElement.type ) {
			case "image":
				_loadContentMethod = "_loadContentImage";
				break;
			
			case "youtube":
				_loadContentMethod = "_loadContentYoutube";
				break;
			
			case "vimeo":
				_loadContentMethod = "_loadContentYoutube";
				break;
		}

		$.when( this[_loadContentMethod](_currentSetElement.url) ).then(function() {
			next();
		});
	},

	_queueResizeLightbox: function( next ) {

		// resizes the lightbox to to house content and centers it on the screen
		var _isAllowed, _speed, _animate, _sizes, _imageTargetWidth, _imageTargetHeight,
			_lightboxTargetWidth, _lightboxTargetHeight, _statusWidth, _statusHeight, _img,
			global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox,
			_padding = data.lightboxPadding,
			_headerHeight = data.headerHeight,
			_currentElement = data.currentSetElement,
			_isError = data.showErrorMessage;

		// if content is type of image, resize it to fit the screen
		if ( _currentElement.type === "image" && _isError === false ) {
			_sizes = this._getSizes(),
			_imageTargetWidth = _sizes.imageTargetWidth,
			_imageTargetHeight = _sizes.imageTargetHeight,
			_lightboxTargetWidth = _sizes.lightboxTargetWidth,
			_lightboxTargetHeight = _sizes.lightboxTargetHeight,
			_statusWidth = _sizes.statusWidth,
			_statusHeight = _sizes.statusHeight,
			_img = $lb.content.find( "img" );			

			// scale an image only if the minimal size of the lightbox fits on the screen
			// for example if minimal lightbox size if of 300px, the image is scaled only if
			// the browser window is bigger or equal to 300px
			if ( _statusWidth !== -2 && _statusHeight !== -2 ) {
				_isAllowed = true;

				// scale the image
				_img
					.width( _imageTargetWidth )
					.height( _imageTargetHeight );
				
				// if you use this method in the context of a queue then use animation; otherwise when used in live resize, don’t animate it
				if ( $.isFunction(next) ) {
					_speed = this.options.animationSpeed;
				} else {
					_speed = 0;
				}
			} else {
				// TODO: pokaz informacje kiedy przegladarka jest uruchomiona w rozmiarze mniejszym od minimalnego rozmiaru
				_isAllowed = false;
			}
		} else if ( (_currentElement.type === "youtube" || _currentElement.type === "vimeo") && _isError === false ){

			// if content is flash video
			_isAllowed = true;
			_speed = this.options.animationSpeed;
			_lightboxTargetWidth = _currentElement.width;
			_lightboxTargetHeight = _currentElement.height;
		} else if ( _isError ) {
			_isAllowed = true;
			_speed = this.options.animationSpeed;
			_lightboxTargetWidth = 500;
			_lightboxTargetHeight = 300;
		}

		if ( _isAllowed) {

			// scale and resize the lightbox
			$lb.root
				.find( "#ui-lightbox-content" )
					.animate( {width: _lightboxTargetWidth}, _speed )
					.animate( {height: _lightboxTargetHeight}, _speed )
					.end()
				.animate( {left: ($(window).width() - _lightboxTargetWidth - _padding) / 2}, _speed )
				.animate( {top: ($(window).height() - _lightboxTargetHeight - _padding - _headerHeight) / 2}, _speed, next);
		}
	},

	_queueCenterContent: function( next ) {
		var _content,
			global = $.ui.rlightbox.global,
			$lb = global.$lightbox,
			$contentContainer = $lb.content,
			_content = $contentContainer.children();

		$contentContainer
			.children()
				.css({
					top: $contentContainer.height() / 2 - _content.outerHeight() / 2,
					left: $contentContainer.width() / 2 - _content.outerWidth() / 2
				});

		// if we don’t run it in the live resize but in the queue
		if ( next ) {
			next();
		}
	},

	_queueShowContent: function( next ) {
		var global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox,
			_currentElement = data.currentSetElement,
			_originalStatus = _currentElement.originalStatus,
			_isError = data.showErrorMessage;

		// show content
		$lb.content.children()
			.fadeIn( this.options.animationSpeed, function() {

				// if one of the image sides is bigger than the screen, show panorama icon
				if ( _currentElement.type === "image" && _isError === false ) {
					if ( _originalStatus.statusWidth === 2 || _originalStatus.statusHeight === 2 ) {
						$lb.panoramaIcon
							.show()
							.addClass( "ui-lightbox-panorama-icon-expand" );
					}
				}

				next();
			});
	},

	_queueSlideDownHeader: function( next ) {
		var global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox;

		// show header
		$lb.header.slideDown( this.options.animationSpeed, next );

		// show and update counter
		this._updateCounter();

		// update title
		this._updateTitleWidth();
		this._updateTitle();

		// indicate that animation queue is finshed
		data.ready = true;
	},

	_queueSlideUpHeader: function( next ) {
		var global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox;

		// structure is not ready - start an animation
		data.ready = false;
		$lb.header.slideUp ( this.options.animationSpeed, next );
	},

	_queueHideContent: function( next ) {
		var global = $.ui.rlightbox.global,
			data = global.data,
			$lb = global.$lightbox;
			
		$lb.content.children()
			.fadeOut( this.options.animationSpeed, function() {
				$( this ).remove();
				next();
			});

		// disable panorama
		$lb.panoramaIcon
			.hide()
			.removeClass( "ui-lightbox-panorama-icon-expand ui-lightbox-panorama-icon-shrink" );

		data.panoramaEnabled = false;

		// hide the map
		this._panoramaHideMap();
	}
});

$.extend($.ui.rlightbox, {
	global: {
		$lightbox: {},
		sets: {},
		data: {
			minimalLightboxSize: {
				width: 300,
				height: 300
			},
			lightboxPadding: 12,
			headerHeight: 57,
			ready: false,
			panoramaEnabled: false,
			mapSize: {
				width: 150,
				height: 100
			},
			oembedProvider: "http://oohembed.com/oohembed?callback=?",
			showErrorMessage: false,
			currentSetElement: {}
		}
	}
});
	
})( jQuery );
