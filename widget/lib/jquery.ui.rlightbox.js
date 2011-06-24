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
		var _setElement,
			global = $.ui.rlightbox.global,
			self = this;

		// init the lightbox – do in only once
		global.getLightbox();

		// which type content belongs to: youtube, vimeo, flash, image, etc.
		// what is its url, title (for images), etc …
		_setElement = global.extractAnchor( this );
		
		// add type, url, jQuery element and title of content to a set if content is supported by the lightbox
		// otherwise fall silently
		if ( _setElement.type !== undefined ) {
			
			global.addToSet( _setElement );
		
			// open the lightbox upon click
			this.element.click(function(event) {
				global.open( self );
				event.preventDefault();
			});
		}
	},

	_setOption: function( key, value ) {
	}
});

// In almost every jQuery UI plugin, in an element the plugin is initialised on
// its initial DOM structure it transformed into the plugin's one. Therefore
// ‘this’ always refers to the plugin instance.
// rlightbox takes other approach: there are many elements (anchors) the plugin
// is installed on, but there is only one UI – one DOM structure.
// If we put all these below methods in the widget factory's scope, (the same as
// options and _create) and created only one UI, the UI would have ‘this’ scope
// of the first matched element – the first element in the DOM that rlightbox
// is initialised on. Since different instances can have different
// set of options, ‘this.options’ would always refer to the first instance.
// Since in rlightbox we don’t operate on elements directly but only get their
// urls, all methods are placed in the extended scope of the plugin:
// ‘$.ui.rlightbox.global’. An instance ‘this’ scope is merely used when we
// use options.
$.extend($.ui.rlightbox, {
	global: {
		addToSet: function( setElement ) {
			
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
			var _setName = this.getSetName( setElement.self ),
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
		
		closeLightbox: function() {
			var data = this.data,
				$lb = this.$lightbox;
				
			if ( data.ready ) {
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
				this.panoramaHideMap();

				// lightbox is not ready again
				data.ready = false;
			}
		},
		
		createStructure: function() {
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
			var data = this.data,
				$currentElement = data.currentSetElement.element;
			
			// code taken from jqury.ui.widget.js – it is the default behaviour
			// from the widget factory but we can’t call it because it acts upon
			// this.element – we have to act on a arbitrary one
			$currentElement
				.unbind( "." + "rlightbox" )
				.unbind( "click" )
				.removeData( "rlightbox" );
		},		
		
		extractAnchor: function( thisElement ) {
			
			// _extractAnchor elicits information from anchor element (DOM A element)
			// @url are used for loading content such as images, youtube videos, etc
			// @type is needed to choose suitable loading method in _queueLoadContent
			// @title is used to dispay title of an image or flash content (.flv) –
			// since youtube and vimeo content is got via oembed, title is got later after loading the content
			// $element keeps jQuery object of an anchor and it’s used for example
			// in _getCurrentElementNumber to get the index in array in a set of clicked content
			var _result = {type: undefined},
				$anchor = $( thisElement.element ),
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
									element: $anchor,
									self: thisElement
								}
								
								if ( content.type === "image" || thisElement.options.overwriteTitle ) {
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
		
		getAvailableScreenSize: function() {
			var data = this.data,
				_padding = data.lightboxPadding;
	
			return {
				width: this.getWindowSize( "width" ) - _padding,
				height: this.getWindowSize( "height" ) - data.headerHeight - _padding
			}
		},		
		
		getCurrentElementNumber: function( element ) {
			var _currentNumber,
				data = this.data,
				sets = this.sets,
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
		
		getImageStatus: function( width, height ) {
	
			// statuses (concern both sides):
			// 1 - content fits the window and is larger than minimal lightbox size
			// -1 - content fits the window but is smaller or equal to minimal lightbox size
			// 2 - content is larger than the window
			var _statusWidth, _statusHeight,
				data = this.data,
				_currentElement = data.currentSetElement,
				_windowWidth = this.getWindowSize( "width" ),
				_windowHeight = this.getWindowSize( "height" ),
				_minimalLightboxWidth = data.minimalLightboxSize.width,
				_minimalLightboxHeight = data.minimalLightboxSize.height,
				_imageWidth = _currentElement.width,
				_imageHeight = _currentElement.height,
				_lightboxPadding = data.lightboxPadding,
				_headerHeight = data.headerHeight;
	
			if ( width <= _minimalLightboxWidth ) {
				_statusWidth = -1;
			} else if ( width > _minimalLightboxWidth && width + _lightboxPadding <= _windowWidth ) {
				_statusWidth = 1;
			} else {
				_statusWidth = 2;
			}
	
			if ( height <= _minimalLightboxHeight ) {
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
		
		getLightbox: function() {
			var data = this.data,
				$lb = this.$lightbox,
				self = this;
			
			// do it only once!
			if ( !$lb.root ) {
				
				// create the DOM structure of the lightbox
				this.createStructure();
				
				// remember references to lightbox structure
				this.setReferences();
				
				// close the lightbox upon clicking on the close button and the overlay
				$lb.close.add( $lb.overlay ).click( $.proxy(this.closeLightbox, this) );
				
				// highlight the close button when mouse hovers over it
				$lb.close.hover(
					function() {
						$( this ).toggleClass( "ui-state-hover" );
					}
				);
				
				// add handlers to the content container
				$lb.content
					.mousemove( $.proxy(this.navigationCheckSide, this) )
					.click( $.proxy(this.navigationNext, this) )
					.mousedown( $.proxy(this.panoramaStart, this) )
					.mouseup( $.proxy(this.panoramaStop, this ) );
					
				// zoom in or zoom out an image
				$lb.panoramaIcon
					.click( $.proxy(this.panoramaToggle, this) )
					.hover( $.proxy(this.panoramaHighlight, this) );
		
				// resize lightbox when window size changes
				$( window ).bind( "resize.rlightbox", $.proxy(this.liveResize, this) );
			}
		},
		
		getSetName: function( thisElement ) {
	
			// if an anchor has class of e.g. ‘lb_gallery’ _getSetName() returns ‘gallery’ string as a set
			// otherwise it returns "single" - single content is placed under "single" set  
			var _classNames = $( thisElement.element ).attr( "class" ),
				_classPrefix = thisElement.options.setPrefix + "_",
				_classPattern = new RegExp( _classPrefix + "([\\w-_]+)" ),
				_name = _classPattern.exec( _classNames );
	
			return _name ? _name[1] : "single";
		},
		
		getSizes: function() {
			var _statuses, _statusWidth, _statusHeight, _imageTargetWidth, _imageTargetHeight, _lightboxTargetWidth, _lightboxTargetHeight,
				$lb = this.$lightbox,
				data = this.data,
				self = this,
				_currentElement = data.currentSetElement,
				_windowWidth = this.getWindowSize( "width" ),
				_windowHeight = this.getWindowSize( "height" ),
				_minimalLightboxWidth = data.minimalLightboxSize.width,
				_minimalLightboxHeight = data.minimalLightboxSize.height,
				_imageWidth = _currentElement.width,
				_imageHeight = _currentElement.height,
				_lightboxPadding = data.lightboxPadding,
				_headerHeight = data.headerHeight;
					
			function _calculateSizes( w, h ) {
				_statuses = self.getImageStatus( w, h );
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
						_imageTargetHeight = _lightboxTargetHeight;						
						_heightRatio = _lightboxTargetHeight / h;
	
						if (_statusWidth === -1) {
							_lightboxTargetWidth = _minimalLightboxWidth;
							_imageTargetWidth = Math.ceil( w * _heightRatio );
						} else {
							_lightboxTargetWidth = Math.ceil( w * _heightRatio ) - _lightboxPadding;
							_imageTargetWidth = _lightboxTargetWidth;
		
							if ( _imageTargetWidth <= _minimalLightboxWidth ) {
								_calculateSizes( _imageTargetWidth, _imageTargetHeight );
							}
						}
					} else if ( _statusHeight === 1 || _statusHeight === -1 ) {
	
						// width is larger than window, height fit the window
						_lightboxTargetWidth = _windowWidth - _lightboxPadding;
						_imageTargetWidth = _lightboxTargetWidth;						
						_widthRatio = _lightboxTargetWidth / w;
						
						if ( _statusHeight === -1 ) {
							_lightboxTargetHeight = _minimalLightboxHeight;
							_imageTargetHeight = Math.ceil( h * _widthRatio );
						} else {
							_lightboxTargetHeight = Math.ceil( h * _widthRatio ) - _headerHeight - _lightboxPadding;
							_imageTargetHeight = _lightboxTargetHeight;
	
							if ( _imageTargetHeight <= _minimalLightboxHeight ) {
								_calculateSizes( _imageTargetWidth, _imageTargetHeight );
							}
						}
					} else {
	
						// both width and height are larger than window
						if ( w > h ) {
							_lightboxTargetWidth = _windowWidth - _lightboxPadding;
							_imageTargetWidth = _lightboxTargetWidth;
							_widthRatio = _lightboxTargetWidth / w;
							_lightboxTargetHeight = Math.ceil( h * _widthRatio ) - _lightboxPadding - _headerHeight;
							_imageTargetHeight = _lightboxTargetHeight;
							
							// if after scaling an image is smaller or bigger
							if ( _imageTargetHeight <= _minimalLightboxHeight || _lightboxTargetHeight > _windowHeight ) {
								_calculateSizes( _imageTargetWidth, _imageTargetHeight );
							}
						} else {
							_lightboxTargetHeight = _windowHeight - _headerHeight - _lightboxPadding;
							_imageTargetHeight = _lightboxTargetHeight;							
							_heightRatio = _lightboxTargetHeight / h;
							_lightboxTargetWidth = Math.ceil( w * _heightRatio ) - _lightboxPadding;
							_imageTargetWidth = _lightboxTargetWidth;

							if ( _imageTargetWidth <= _minimalLightboxWidth || _lightboxTargetWidth > _windowWidth ) {
								_calculateSizes( _imageTargetWidth, _imageTargetHeight );
							}
						}
					}
				}
			}
			_calculateSizes( _imageWidth, _imageHeight );
	
			// final status
			_statuses = this.getImageStatus( _imageTargetWidth, _imageTargetHeight );
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
		
		getWindowSize: function( size ) {
			var data = this.data,
				_windowWidth = $( window ).width(),
				_windowHeight = $( window ).height(),
				_minimalLightboxSize = data.minimalLightboxSize,
				_lightboxPadding = data.lightboxPadding,
				_headerHeight = data.headerHeight,
				_minimalLightboxWidth = _minimalLightboxSize.width + _lightboxPadding,
				_minimalLightboxHeight = _minimalLightboxSize.height + _lightboxPadding + _headerHeight;
				
			if ( size === "width" ) {
				if ( _windowWidth < _minimalLightboxWidth ) {
					return _minimalLightboxWidth;
				} else {
					return _windowWidth;
				}
			} else {
				if ( _windowHeight < _minimalLightboxHeight ) {
					return _minimalLightboxHeight;
				} else {
					return _windowHeight;
				}
			}
		},		
		
		liveResize: function() {
			var data = this.data,
				_elementType = data.currentSetElement.type;
	
			// resizes an image when size of the browser window resizes and when Panorama is turned off
			if ( data.ready && data.panoramaEnabled === false && _elementType === "image" ) {
				this.queueResizeLightbox();
				this.updateTitleWidth();
				this.queueCenterContent();
			} else if ( data.ready && (data.panoramaEnabled === false && _elementType !== "image") || (data.panoramaEnabled && _elementType === "image") ) {
	
				// otherwise keep the lightbox centered especially when window is bigger than the lightbox
				this.queueCenterLightbox();
			}
		},
		
		loadContentImage: function( url ) {
			var $lb = this.$lightbox,
				data = this.data,
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
						_currentElement.originalStatus = self.getImageStatus( this.width, this.height );
					
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
						self.showErrorMessage();
						
						// continue the animation queue
						_dfd.resolve();
					}
				);
			
			return _dfd.promise();
		},
		
		loadContentYoutube: function( url ) {
			var _width, _height,
				data = this.data,
				$lb = this.$lightbox,			
				self = this,
				_dfd = $.Deferred(),
				_apiEnd = data.oembedProvider,
				_currentElement = data.currentSetElement,
				_options = _currentElement.self.options,
				_minimalLightboxSize = data.minimalLightboxSize;
	
			// show loader
			$lb.content.addClass( "ui-lightbox-loader" );
			
			$.ajax(
				{
					url: _apiEnd,
					data: {
						url: url,
						maxwidth: _options.videoWidth,
						maxheight: _options.videoHeight
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
					if ( _options.overwriteTitle === false ) {
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
				self.showErrorMessage();
				
				// continue the animation queue
				_dfd.resolve();
			});
			
			return _dfd.promise();
		},		
		
		navigationCheckSide: function( event ) {
			var data = this.data,
				$lb = this.$lightbox,
				$content = $lb.content,
				_currentElementNumber = data.currentElementNumber,
				_totalElementsNumber = data.totalElementsNumber;
	
			// Check which side we are on. Check it only if the lightbox is ready (no animation in progress)
			// clicked image belongs to a gallery and we are not in the Panorama™ mode
			if ( data.ready && data.currentSet !== "single" && data.currentSetElement.type === "image" && data.panoramaEnabled === false ) {
				var _pos = event.pageX - $content.offset().left,
					_center = Math.round( $content.width() / 2 );
	
				if ( _pos <= _center && _currentElementNumber > 1 ) {
					data.side = "left";
					$content.css( "cursor", "w-resize" );
				} else if ( _pos > _center && _currentElementNumber < _totalElementsNumber ) {
					data.side = "right"
					$content.css( "cursor","e-resize" );
				} else {
					data.side = "";
					$content.css( "cursor", "default" );
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
		
		navigationGoToElement: function( number ) {
			
			// goes to a custom element
			var data = this.data,
				sets = this.sets,
				$lb = this.$lightbox,
				_currentSet = data.currentSet;
			
			// which element go to
			data.currentElementNumber = number;
			data.currentSetElement = sets[_currentSet][number - 1];
			
			// reload animation queue and trigger it
			this.setNextQueue();
			$lb.queueContainer.next.dequeue( "lightboxNext" );
		},		
		
		navigationNext: function() {
			var _currentElementNumber, _currentSetElement,
				data = this.data,
				sets = this.sets,
				$lb = this.$lightbox,
				_set = data.currentSet;
	
			// prevent from multi clicking and go to the next image only if it belongs to a gallery
			if ( data.ready && _set !== "single" ) {
				_currentElementNumber = data.currentElementNumber;
	
				if ( _currentElementNumber + 1 <= data.totalElementsNumber && data.side === "right" ) {
					data.currentElementNumber = _currentElementNumber + 1;
	
					// update current element
					_currentSetElement = sets[_set][_currentElementNumber];
					data.currentSetElement = _currentSetElement;
	
					// next element - trigger the queue ‘next’ - first update it
					this.setNextQueue();
					$lb.queueContainer.next.dequeue( "lightboxNext" );
				} else if ( _currentElementNumber - 1 >= 1 && data.side === "left" ){
					data.currentElementNumber = _currentElementNumber - 1;
	
					// update current element
					_currentSetElement = sets[_set][_currentElementNumber - 2];
					data.currentSetElement = _currentSetElement;
					
					// next element - trigger the queue ‘next’ - first update it
					this.setNextQueue();
					$lb.queueContainer.next.dequeue( "lightboxNext" );
				}
			}
		},
		
		open: function( thisElement ) {
			var data = this.data,
				sets = this.sets,
				$lb = this.$lightbox,
				_jqElement = thisElement.element,
				_currentSet = this.getSetName( thisElement ),
				_currentUrl = $( _jqElement ).attr( "href" );
	
			// remember which set content belongs to
			data.currentSet = _currentSet;
	
			// determine and remember how many elements belong to a set
			// determine the current (and clicked) element in a set
			data.totalElementsNumber = sets[_currentSet].length;
			data.currentElementNumber = this.getCurrentElementNumber( _jqElement );
	
			// keep a reference to a current element in a set (consisting of a url, type…)
			data.currentSetElement = sets[_currentSet][data.currentElementNumber - 1];
	
			// set animation queues
			this.setOpenQueue();
			this.setNextQueue();
			
			// start opening the lighbox
			$lb.queueContainer.open.dequeue( "lightboxOpen" );
		},
		
		panoramaCenterContent: function() {
			var _left, _top,
				data = this.data,
				$lb = this.$lightbox,
				_currentElement = data.currentSetElement,
				_screenSize = this.getAvailableScreenSize(),
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
		
		panoramaExpand: function() {
	
			// _panoramaExpand does the main goal of the Panorama™: it displays the natural image size
			var data = this.data,
				$lb = this.$lightbox,
				_currentElement = data.currentSetElement,
				_options = _currentElement.self.options;
	
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
			this.panoramaSetContentSize();
	
			// center the content and the whole lightbox
			this.panoramaCenterContent();
			this.queueCenterLightbox();
	
			// show the map
			if ( _options.showMap ) {
				this.panoramaShowMap();
			}
		},		
		
		panoramaHideMap: function() {
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
		
		panoramaHighlight: function() {
			var _suffixPosition,
				$lb = this.$lightbox,
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
		
		panoramaSetContentSize: function() {
			var _contentWidth, _contentHeight,
				data = this.data,
				$lb = this.$lightbox,
				_currentElement = data.currentSetElement,
				_minLightboxSize = data.minimalLightboxSize,
				_minLightboxWidth = _minLightboxSize.width,
				_minLightboxHeight = _minLightboxSize.height,
				_screenSize = this.getAvailableScreenSize(),
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
		
		panoramaShowMap: function() {
			var _mapViewportWidth, _mapViewportHeight, _mapViewportWidthRatio, _mapViewportHeightRatio,
				_contentViewportWidth, _contentViewportHeight,
				data = this.data,
				_minimalLightboxSize = data.minimalLightboxSize,
				$lb = this.$lightbox,
				$content = $lb.content,
				$image = $content.find( "img" ),
				_imageWidth = $image.width(),
				_imageHeight = $image.height();
				_currentElement = data.currentSetElement,
				_mapSize = data.mapSize;
	
			// show the map and give the viewport relevant size
			// give the viewport relevant size
			_mapViewportWidthRatio = _mapSize.width / _currentElement.width;
			_mapViewportHeightRatio = _mapSize.height / _currentElement.height;
			
			// content doesn't cover whole container
			if ( _imageWidth < _minimalLightboxSize.width ) {
				_contentViewportWidth = _imageWidth;
			} else {
				_contentViewportWidth = $content.width();
			}
			
			if ( _imageHeight < _minimalLightboxSize.height ) {
				_contentViewportHeight = _imageHeight;
			} else {
				_contentViewportHeight = $content.height();
			}
			
			_mapViewportWidth = Math.ceil( _contentViewportWidth * _mapViewportWidthRatio );
			_mapViewportHeight = Math.ceil( _contentViewportHeight * _mapViewportHeightRatio );
	
			$lb.viewport
				.width( _mapViewportWidth )
				.height( _mapViewportHeight );
	
			// show the map
			$lb.map.show();
	
			// used when you scroll the content
			data.viewportRatio = {
				width: _mapViewportWidthRatio,
				height: _mapViewportHeightRatio
			}
	
		},
		
		panoramaShrink: function() {
			var data = this.data,
				$lb = this.$lightbox;
	
			// _panoramaShrink retores the previous size of an image
			data.panoramaEnabled = false;
	
			// show the zoom in icon – let know that we can run panorama mode again
			$lb.panoramaIcon
				.removeClass()
				.addClass( "ui-lightbox-panorama-icon-expand-hover" );
	
			// resize an image to its previous size and center it
			this.queueResizeLightbox();
			this.queueCenterContent();		
	
			// hide the map
			this.panoramaHideMap();
		},		
		
		panoramaStart: function( event ) {
			var data = this.data,
				$lb = this.$lightbox;
	
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
	
			event.preventDefault();
		},
		
		panoramaStop: function( event ) {
	
			// calculate the distance between the starting point from _panoramaStart and this one
			// we use the oposite vector (-1) because dragging the mouse left we move right
			var data = this.data,
				$lb = this.$lightbox,
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
		
		panoramaToggle: function( event ) {
	
			// switches between _panoramaExpand and _panoramaShrink
			// we couldn’t use .toggle( expand, shrink ) on panorama icon because when lb is closed after panorama was turned on (we were in the panorama mode)
			// and open again and next image once again can be zoomed we need to make sure that
			// expand is the first action – using jQuery .toggle() ‘expand’ would be the fist action again (because of its internal queue)
			var data = this.data,
				_panoramaOn = data.panoramaEnabled,
				_localScope = data.currentSetElement.self;
	
			if ( _panoramaOn === false ) {
				this.panoramaExpand();
			} else {
				this.panoramaShrink();			
			}
		},
		
		removeSetElement: function( number ) {
			// when there is an error while loading content, in the error screen
			// there is a possibility to reject content that might have a wrong
			// url; _removeSetElement removes rejects such content in order to
			// the error message not appear again;
			// the method prevents rlightbox from being acted upon such content
			var data = this.data,
				sets = this.sets,
				_currentSet = data.currentSet,
				_total = data.totalElementsNumber;
	
			// remove given element from a set
			sets[_currentSet].splice( number - 1, 1 );
			
			// if there is only one element left, close the lightbox, otherwise load next element
			if( _total === 1 || _currentSet === "single" ) {
				this.closeLightbox();
	
				// remove the instance from encapsulated DOM element (jquery one)
				this.destroy();
			} else {
				this.destroy();
				
				// update total element numbers
				data.totalElementsNumber = sets[_currentSet].length;
				
				// go to a new element
				if ( number === _total ) {
					this.navigationGoToElement( number - 1 );
				} else {
					this.navigationGoToElement( number );
				}
			}
		},		
		
		setNextQueue: function() {
	
			// for description take a look at _setOpenQueue method
			var $lb = this.$lightbox,
				queueList = [
					$.proxy( this.queueSlideUpHeader, this ),
					$.proxy( this.queueHideContent, this ),
					$.proxy( this.queueLoadContent, this ),
					$.proxy( this.queueResizeLightbox, this ),
					$.proxy( this.queueCenterContent, this ),
					$.proxy( this.queueShowContent, this ),
					$.proxy( this.queueSlideDownHeader, this )
				];
	
			// place start animation queue in the queue container
			$lb.queueContainer.next.queue( "lightboxNext", queueList );
		},
		
		setOpenQueue: function() {
			// we have two animated queues: one to open the lightbox and the second to perform next/previous operation
			// half of the operations are the same - they ovelap, and the rest such as ‘show the overlay’, ‘center lightbox’,
			// ‘slide up the header’ and ‘hide content’ are run only in one queue not in both
			// thus to not repeat oneself we keep in the queue lists only references to these methods
			// each one of these methods (that begin with _queue…) are passed ‘next’ parameter that is a reference to another
			// method in the queue.
			// $proxy is needed to have an access to a ‘global’ scope of the plugin – every method that is called in the queue
			// is run in its internal scope - we need to have an access to such method as _getSizes, _open, etc - one the same level.
	
			var $lb = this.$lightbox,
				queueList = [
					$.proxy( this.queueShowOverlay, this ),
					$.proxy( this.queueCenterLightbox, this ),
					$.proxy( this.queueLoadContent, this ),
					$.proxy( this.queueResizeLightbox, this ),
					$.proxy( this.queueCenterContent, this ),
					$.proxy( this.queueShowContent, this ),
					$.proxy( this.queueSlideDownHeader, this )
				];
	
			// place start animation queue in the queue container
			$lb.queueContainer.open.queue( "lightboxOpen", queueList );
		},		
		
		setReferences: function() {
			var $lb = this.$lightbox;
	
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
		
		showErrorMessage: function() {
			
			// shows a screen with a message that content could not be loaded
			// and two buttons: one to try to load content again and one to
			// reject the content; in order to keep the dependencie to minimum
			// buttons are not jQuery UI widgets but use their CSS classes
			var data = this.data,
				$lb = this.$lightbox,
				self = this,
				_currentElement = data.currentSetElement,
				_options = _currentElement.self.options,
				_currentElementNumber = data.currentElementNumber,
				_errorMessage = _options.errorMessage,
				_againLabel = _options.againButtonLabel,
				_rejectLabel = _options.rejectButtonLabel,
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
					self.navigationGoToElement( _currentElementNumber );
				})
				.hover(
					function() {
						$( this ).toggleClass( "ui-state-hover" );
					}
				);
			
			// removes the broken content from list of known contents
			$reject
				.click(function() {
					self.removeSetElement( _currentElementNumber );
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
		
		updateCounter: function() {
			var _current, _total, _newCounter,
				data = this.data,
				$lb = this.$lightbox,
				_currentElement = data.currentSetElement,
				_options = _currentElement.self.options,
				_currentSet = data.currentSet;
				
				if ( _currentSet !== "single" ) {
					_current = data.currentElementNumber;
					_total = data.totalElementsNumber;
				} else {
					_current = 1;
					_total = 1;
				}
				
				_newCounter = _current + _options.counterDelimiter + _total;
	
			$lb.counter.text( _newCounter );
		},
		
		updateTitle: function() {
			var data = this.data,
				$lb = this.$lightbox,
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
		
		updateTitleWidth: function() {
			var $lb = this.$lightbox;
			
			// 12px – 2 × border + 2 × padding
			// 20px – safe distance from the close button
			$lb.headerWrapper.width( $lb.content.width() - 20 - 12 );
		},
		
		queueHideContent: function( next ) {
			var data = this.data,
				$lb = this.$lightbox,
				_currentElement = data.currentSetElement,
				_options = _currentElement.self.options;
				
			$lb.content.children()
				.fadeOut( _options.animationSpeed, function() {
					$( this ).remove();
					next();
				});
	
			// disable panorama
			$lb.panoramaIcon
				.hide()
				.removeClass( "ui-lightbox-panorama-icon-expand ui-lightbox-panorama-icon-shrink" );
	
			data.panoramaEnabled = false;
	
			// hide the map
			this.panoramaHideMap();
		},	
		
		queueShowOverlay: function( next ) {
			var data = this.data,
				$lb = this.$lightbox,
				_currentElement = data.currentSetElement.self;
	
			// let know that lightbox is not ready now
			data.ready = false;
	
			// show overlay
			$( "body" ).css( "overflow", "hidden" );
			$lb.overlay.fadeIn( _currentElement.options.animationSpeed, next );
		},
		
		queueCenterLightbox: function( next ) {
			var $lb = this.$lightbox,
				$root = $lb.root,
				_screenWidth = this.getWindowSize( "width" ),
				_screenHeight = this.getWindowSize( "height" ),
				_lbWidth = $root.outerWidth(),
				_lbHeight = $root.outerHeight();
	
			$root
				.css({
					left: Math.round( (_screenWidth - _lbWidth) / 2 ) + "px",
					top: Math.round( (_screenHeight - _lbHeight) / 2 ) + "px"
				})
				.show( 0, next );
		},
		
		queueLoadContent: function( next ) {
			
			// loads appropriate content using right method
			var _loadContentMethod,
				data = this.data,
				_currentSetElement = data.currentSetElement;
			
			// assume that there will be no error
			data.showErrorMessage = false;
			
			switch ( _currentSetElement.type ) {
				case "image":
					_loadContentMethod = "loadContentImage";
					break;
				
				case "youtube":
					_loadContentMethod = "loadContentYoutube";
					break;
				
				case "vimeo":
					_loadContentMethod = "loadContentYoutube";
					break;
			}
	
			$.when( this[_loadContentMethod](_currentSetElement.url) ).then(function() {
				next();
			});
		},
		
		queueResizeLightbox: function( next ) {
	
			// resizes the lightbox to to house content and centers it on the screen
			var _speed, _animate, _sizes, _imageTargetWidth, _imageTargetHeight,
				_lightboxTargetWidth, _lightboxTargetHeight, _statusWidth, _statusHeight, _img,
				data = this.data,
				$lb = this.$lightbox,
				_padding = data.lightboxPadding,
				_headerHeight = data.headerHeight,
				_currentElement = data.currentSetElement,
				_options = _currentElement.self.options,
				_isError = data.showErrorMessage;
	
			// if content is type of image, resize it to fit the screen
			if ( _currentElement.type === "image" && _isError === false ) {
				_sizes = this.getSizes(),
				_imageTargetWidth = _sizes.imageTargetWidth,
				_imageTargetHeight = _sizes.imageTargetHeight,
				_lightboxTargetWidth = _sizes.lightboxTargetWidth,
				_lightboxTargetHeight = _sizes.lightboxTargetHeight,
				_statusWidth = _sizes.statusWidth,
				_statusHeight = _sizes.statusHeight,
				_img = $lb.content.find( "img" );
	
				// scale the image
				_img
					.width( _imageTargetWidth )
					.height( _imageTargetHeight );
				
				// if you use this method in the context of a queue then use animation; otherwise when used in live resize, don’t animate it
				if ( $.isFunction(next) ) {
					_speed = _options.animationSpeed;
				} else {
					_speed = 0;
				}

			} else if ( (_currentElement.type === "youtube" || _currentElement.type === "vimeo") && _isError === false ){
	
				// if content is flash video
				_speed = _options.animationSpeed;
				_lightboxTargetWidth = _currentElement.width;
				_lightboxTargetHeight = _currentElement.height;
			} else if ( _isError ) {
				_speed = _options.animationSpeed;
				// TODO: zapisać w data
				_lightboxTargetWidth = 500;
				_lightboxTargetHeight = 300;
			}
	
	
			// scale and resize the lightbox
			$lb.root
				.find( "#ui-lightbox-content" )
					.animate( {width: _lightboxTargetWidth}, _speed )
					.animate( {height: _lightboxTargetHeight}, _speed )
					.end()
				.animate( {left: (this.getWindowSize("width") - _lightboxTargetWidth - _padding) / 2}, _speed )
				.animate( {top: (this.getWindowSize("height") - _lightboxTargetHeight - _padding - _headerHeight) / 2}, _speed, next);
		},
		
		queueCenterContent: function( next ) {
			var _content,
				$lb = this.$lightbox,
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
		
		queueShowContent: function( next ) {
			var data = this.data,
				$lb = this.$lightbox,
				_currentElement = data.currentSetElement,
				_options = _currentElement.self.options,
				_originalStatus = _currentElement.originalStatus,
				_isError = data.showErrorMessage;
	
			// show content
			$lb.content.children()
				.fadeIn( _options.animationSpeed, function() {
	
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
		
		queueSlideDownHeader: function( next ) {
			var data = this.data,
				$lb = this.$lightbox,
				_options = data.currentSetElement.self.options;
	
			// show header
			$lb.header.slideDown( _options.animationSpeed, next );
	
			// show and update counter
			this.updateCounter();
	
			// update title
			this.updateTitleWidth();
			this.updateTitle();
	
			// indicate that animation queue is finshed
			data.ready = true;
		},
		
		queueSlideUpHeader: function( next ) {
			var data = this.data,
				$lb = this.$lightbox,
				_currentElement = data.currentSetElement,
				_options = _currentElement.self.options;
	
			// structure is not ready - start an animation
			data.ready = false;
			$lb.header.slideUp ( _options.animationSpeed, next );
		},
		
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
