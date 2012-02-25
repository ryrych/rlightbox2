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
		errorMessage: "Oh dear! Something went wrong! If the problem still appears let the page’s admin know. Would you like to try again or reject the content?",
		againButtonLabel: "Try again",
		rejectButtonLabel: "Reject this content",
		overwriteTitle: false,
		keys: {
			next: [78, 39],
			previous: [80, 37],
			close: [67, 27],
			panorama: [90, null]
		},
		loop: false
	},

	_create: function() {
		var _setElement,
			global = $.ui.rlightbox.global;

		// init the lightbox – do in only once
		global.getLightbox();

		// which type content belongs to: youtube, vimeo, flash, image, etc.
		// what is its url, title (for images), etc…
		_setElement = global.extractAnchor( this );

		// add type, url, jQuery element and title of content to a set if content is supported by the lightbox
		// otherwise fall silently
		if ( _setElement.type !== undefined ) {
			global.addToSet( _setElement );

			// open the lightbox when clicking
			this.element.on( "click", {setElement: _setElement}, function(event) {
				global.open( event.data.setElement );
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
// rlightbox takes another approach: there are many elements (anchors) the plugin
// is installed on, but there is only one UI – one DOM structure.
// If we put all these methods below in the widget factory's scope, (the same as
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
			var _setName = setElement.setName,
				_sets = this.sets,
				_options = setElement.options,
				_setPrefix = _options.setPrefix,
				_class = "." + _setPrefix + "_" + _setName,
				_setElementIndex = $( _class ).index( setElement.$anchor );

			if ( !_sets[_setName] ) {
				// first time - such set has not been created before
				_sets[_setName] = [];
				_sets[_setName].push( setElement );
			} else {
				// set exists already - just add element to it
				// added element respects changes in DOM
				_sets[_setName].splice( _setElementIndex, 0 , setElement );
			}
		},
		
		checkButtonsState: function() {
			var data = this.data,
				$lb = this.$lightbox,
				_currentSet = data.currentSet,
				_currentSetName = _currentSet.name,
				_totalElements = _currentSet.totalElements,
				_currentIndex = _currentSet.currentIndex,
				_isLoop = _currentSet.currentElement.options.loop;
				
			// if lightbox is opened and there is only one element
			// single element or one element in named set
			if ( _currentSetName === "single" || _totalElements === 1 ) {
				this.setButtonState( "disabled" );
			} else if ( _currentIndex === 1 && _isLoop === false ) {
				// in case of 1st element when loop is disabled
				this.setButtonState( "disabled", $lb.prev );
				
				// when there are only two elements in a set
				this.setButtonState( "default", $lb.next );
			} else if ( _currentIndex === _totalElements && _isLoop === false ) {
				// in case of last element
				this.setButtonState( "disabled", $lb.next );
				
				// when there are only two elements in a set
				this.setButtonState( "default", $lb.prev );				
			} else {
				// between first and last elements or when the loop is enabled
				this.setButtonState( "default" );
			}
		},		

		closeLightbox: function() {
			var data = this.data,
				$lb = this.$lightbox,
				_currentSet = data.currentSet;

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
					
				// hide arrow cue
				this.hideArrow();
				
				// reset control buttons states to default
				this.setButtonState( "default" );

				// reset panorama
				this.panoramaHideIcon();

				// reset the counter
				_currentSet.currentIndex = null;
				_currentSet.totalElements = null;

				// remove old title
				$lb.title.empty();		

				// hide the map
				this.panoramaHideMap();

				// lightbox is not ready again
				data.ready = false;
			}
		},

		createStructure: function() {
			var data= this.data;

			// append the structure
			$( data.htmlLightbox )
				.appendTo( "body" )
				.after( data.htmlMap )
				.after( data.htmlOverlay );
		},

		destroy: function() {

			// unwrap $currentElement from jQuery wrapped object and
			// prevents it from being acted upon, unbinding event handlers
			var data = this.data,
				$rlbInstance = data.currentSet.currentElement.$anchor;

			// code taken from jqury.ui.widget.js – it is the default behaviour
			// from the widget factory but we can’t call it because it acts upon
			// this.element – we have to act on a arbitrary one
			$rlbInstance
				.unbind( "." + "rlightbox" )
				.unbind( "click" )
				.removeData( "rlightbox" );
		},
		
        dequeue: function( object, name, data ) {
			var _queue = object[name],
				_fn = _queue.shift(),
				self = this;

			if ( _fn ) {
				_fn.call(this, function( d ) {
					self.dequeue( object, name, d );
				}, data);
			}
        },
		
		extractAnchor: function( jQElement ) {
			// _extractAnchor gets information from an anchor element (DOM A element)
			// @url is used for loading content such as images, youtube videos, etc
			// @type is needed to choose suitable loading method in _queueLoadContent
			// @title is used to dispay title of an image or flash content (.flv) –
			// since vimeo content is got via oembed, title is got later after loading the content
			// @setName is a name of a set, an element belongs to; it is used for the first time in open method
			// @options is a handy shortcut to options of an element rlightbox is initiated on
			// @anchor is a direct access to an anchor rlightbox is initiated on
			var _result = {type: undefined},
				$anchor = jQElement.element,
				_url = $anchor.attr( "href" ),
				_setName = this.getSetName( jQElement );
				_service = {
					youtube: {
						urls: [/(http:\/\/www\.youtube\.com\/watch\?v=([\w-_]+))&?/],
						type: "youtube"
					},
					image: {
						urls: [/.jpg$|.jpeg$|.png$|.gif$/i],
						type: "image"
					},
					vimeo: {
						urls: [/(http:\/\/vimeo\.com\/groups\/\w+\/videos\/(\w+))&?/, /(http:\/\/vimeo\.com\/(\w+))&?/],
						type: "vimeo"
					},
					flash: {
						urls: [/.swf/i],
						type: "flash"
					}
				};

			$.each(_service,
				function( name, content ) {
					// outer loop: _service.youtube, _service.image, etc.
					var _found = false;

					$.each(content.urls,
						function( index, regExp ) {
							// inner loop: urls array
							var _res = regExp.exec( _url );

							if ( _res !== null ) {
								if ( content.type === "image" || content.type === "flash" ) {
									// image and flash urls are not normalised; in case of flash content
									// there may be &with and &height parameters
									_result = {
										url: _url,
										type: content.type,
										title: $anchor.attr( "title" ),
										setName: _setName,
										options: jQElement.options,
										$anchor: $anchor
									};										
								} else if ( content.type === "youtube" || content.type === "vimeo" ) {
									// for Youtube, Vimeo we return a normalised url
									// without additional parameters									
									_result = {
										url: _res[1],
										videoId: _res[2],
										type: content.type,
										setName: _setName,
										options: jQElement.options,
										$anchor: $anchor
									};
									
									if ( jQElement.options.overwriteTitle ) {
										_result.title = $anchor.attr( "title" );
									}
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
			};
		},		

		getCurrentElementNumber: function( element ) {
			var _currentNumber,
				data = this.data,
				sets = this.sets,
				_currentSet = sets[data.currentSet.name];

			// returns a 1 based ordinal number of an image in a set
			$.each(_currentSet, function(i, v) {

				// compare DOM elements
				if ( $(element).get(0) === v.$anchor.get(0) ) {
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
				_currentElement = data.currentSet.currentElement,
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
			};
		},		

		getLightbox: function() {
			var data = this.data,
				$lb = this.$lightbox,
				self = this;

			// if the structure has not been created
			if ( !$lb.root ) {

				// create the DOM structure of the lightbox
				this.createStructure();

				// remember references to lightbox structure
				this.setReferences();

				// close the lightbox when clicking on the close button and the overlay
				$lb.close.add( $lb.overlay ).click( $.proxy(this.closeLightbox, this) );
				
				// goes to the next element when button is clicked
				$lb.next.click( $.proxy(this.next, this) );
				
				// and goes to the prev element when prev button is clicked
				$lb.prev.click( $.proxy(this.prev, this) );			

				// highlight buttons when mouse hovers over them
				$lb.next
					.add( $lb.prev )
					//.add( $lb.play )
					.add( $lb.close )
					.hover(
						function() {
							if ( $(this).is(":not(.ui-state-disabled)") ) {
								self.setButtonState( "highlight", $(this) );
							}
						},
						function() {
							if ( $(this).is(":not(.ui-state-disabled)") ) {
								self.setButtonState( "default", $(this) );								
							}
						}
					);		

				// add handlers to the content container
				$lb.contentContainer
					.mousemove( $.proxy(this.showArrow, this) )
					.mousemove( $.proxy(this.checkSide, this) )
					.mousemove( $.proxy(this.setCursor, this) )
					.click(
						function() {
							if ( data.side === "left" ) {
								self.prev.apply( self );
							} else if ( data.side === "right" ) {
								self.next.apply( self );
							}
						}
					)
					.mousedown( $.proxy(this.panoramaStart, this) )
					.mouseup( $.proxy(this.panoramaStop, this ) )				
					.mouseleave(
						function() {
							self.hideArrow.apply( self );
							data.side = "";
						}
					);

				// zoom in or zoom out an image
				$lb.panoramaIcon
					.click( $.proxy(this.panoramaToggle, this) )
					.hover( $.proxy(this.panoramaHighlight, this) );

				// resize lightbox when window size changes
				$( window ).bind( "resize.rlightbox", $.proxy(this.liveResize, this) );

				// keyboard navigation
				$( document ).keyup( $.proxy(this.handleKeyboard, this) );			
			}
		},

		getOptimalSize: function( sizeName, size ) {
			// returns size not smaller than the minimal size and not bigger than
			// the window size
			var data = this.data,
				_minimalLightboxSize = data.minimalLightboxSize,
				_minimalLightboxWidth = _minimalLightboxSize.width,
				_minimalLightboxHeight = _minimalLightboxSize.height,
				_screenSize = this.getAvailableScreenSize(),
				_screenWidth = _screenSize.width,
				_screenHeight = _screenSize.height;

			if ( sizeName === "width" ) {
				if ( size < _minimalLightboxWidth ) {
					return _minimalLightboxWidth;
				} else if ( size > _screenWidth ) {
					return _screenWidth;
				} else {
					return size;
				}
			} else {
				if ( size < _minimalLightboxHeight ) {
					return _minimalLightboxHeight;
				} else if ( size > _screenHeight ) {
					return _screenHeight;
				} else {
					return size;
				}
			}
		},

		getParam: function( param, url ) {

			// with param ‘with’ and url ‘foo.flv?width=100" it returns ‘100’
			var _result,
				_regExpString = "[\\?&]" + param + "=(\\w+)",
				_regExp = new RegExp( _regExpString );

			_result = _regExp.exec( url );

			if ( _result !== null ) {
				return _result[1];
			} else {
				return null;
			}
		},

		getSetName: function( jQElement ) {
			// if an anchor has class of e.g. ‘lb_gallery’ getSetName() returns ‘gallery’ string as a set name
			// otherwise it returns ‘single’ - single content is placed under ‘single’ set
			var _classNames = jQElement.element.attr( "class" ),
				_classPrefix = jQElement.options.setPrefix + "_",
				_classPattern = new RegExp( _classPrefix + "([\\w-_]+)" ),
				_name = _classPattern.exec( _classNames );

			return _name ? _name[1] : "single";
		},
		
		checkSide: function( event ) {
			var data = this.data,
				$container = this.$lightbox.contentContainer,
				_pos = event.pageX - $container.offset().left,
				_center = Math.round( $container.width() / 2 );

			if ( _pos <= _center ) {
				data.side = "left";
			} else if ( _pos > _center ) {
				data.side = "right";
			}
			
			// for Panorama to work in IE7 & IE8			
			event.preventDefault();
		},

		getSizes: function() {
			var _statuses, _statusWidth, _statusHeight, _imageTargetWidth, _imageTargetHeight, _lightboxTargetWidth, _lightboxTargetHeight,
				_heightRatio, _widthRatio,
				$lb = this.$lightbox,
				data = this.data,
				self = this,
				_currentElement = data.currentSet.currentElement,
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
							if ( _imageTargetHeight <= _minimalLightboxHeight || _lightboxTargetHeight + _lightboxPadding + _headerHeight > _windowHeight ) {
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

		handleKeyboard: function( event ) {
			var data = this.data,
				_currentElement = data.currentSet.currentElement,
				_options = _currentElement.options,
				_keys = _options.keys,
				_key = event.which;

			if ( data.ready === false ) {
				return;
			}

			// handle pressing keys
			if ( _key === _keys.next[0] || _key === _keys.next[1] ) {

				// next keys: [N] & [→]
				// load next content if possible
				this.next();
			} else if ( _key === _keys.previous[0] || _key === _keys.previous[1] ) {

				// prev keys: [P] & [←]
				// load previous content if possible
				this.prev();
			} else if ( _key === _keys.close[0] || _key === _keys.close[1] ) {

				// close keys: [C] & [ESC]
				this.closeLightbox();
			} else if ( (_key === _keys.panorama[0] || _key === _keys.panorama[1]) && _currentElement.type === "image" ) {

				// panorama keys: [Z]
				this.panoramaToggle( event );
			}
		},
		
		hideArrow: function() {
			var $lb = this.$lightbox,
				$arrow = $lb.arrow;
				
			$arrow.hide();
		},		

		liveResize: function() {
			var _elementType,
				data = this.data;
			
			if ( data.ready ) {
				_elementType = data.currentSet.currentElement.type;

				// resizes an image when size of the browser window resizes and when Panorama is turned off
				if ( data.ready && data.panoramaOn === false && _elementType === "image" ) {
					this.updateImageSize();
					this.updateLightboxSize();
					this.updateTitleWidth();
					this.queueCenterContent();
					this.panoramaCheckAvailability();
				} else if ( data.ready && data.panoramaOn && _elementType === "image" ) {
					// otherwise keep the lightbox centered especially when window is bigger than the lightbox
					this.queueCenterLightbox();
					this.panoramaShrink();
					this.panoramaCheckAvailability();
				} else if ( data.ready && _elementType !== "image" ) {
					this.queueCenterLightbox();
				}
			}
		},

		loadContentFlash: function( setElement ) {
			var _width, _height, $contentWrapper, _lightboxTargetWidth, _lightboxTargetHeight,
				data = this.data,
				self = this,
				_loadingFlash = $.Deferred(),
				_flashStructure = data.htmlFlash,
				_url = setElement.url,
				_options = setElement.options;

			function _load() {
				// get width and height from parameters: &with & &height
				// if any exist; ‘inline’ width and height overwrite that of options
				_width = self.getParam( "width", _url );
				_height = self.getParam( "height", _url );			

				// if &width and &height are invalid, use a default one
				if ( _width === null || isNaN(_width) ) {
					_width = _options.videoWidth;
				}

				if ( _height === null || isNaN(_height) ) {
					_height = _options.videoHeight;
				}
				
				// what size the lightbox should have
				_lightboxTargetWidth = self.getOptimalSize( "width", _width );
				_lightboxTargetHeight = self.getOptimalSize( "height", _height );					

				// use real data
				_flashStructure = self.replaceHtmlPatterns(_flashStructure,
					{
						width: _width,
						height: _height,
						url: _url
					}
				);

				// we have to add ‘width’ and ‘height’ to the $contentWrapper
				// explicitly since browsers can’t inherit them
				$contentWrapper = $( "<div></div>" );
				$contentWrapper
					.css(
						{
							display: "none",
							width: _width,
							height: _height
						}
					)
					.append( _flashStructure );
				
				// pass to queueLoadContent()
				_loadingFlash.resolve(
					{
						width: _lightboxTargetWidth,
						height: _lightboxTargetHeight,
						structure: $contentWrapper
					}
				);	
			}

			// delay ‘_load’ because we have to return promise
			setTimeout( _load, 500 );

			return _loadingFlash.promise();
		},

		loadContentImage: function( setElement ) {
			var _imageTargetWidth, _imageTargetHeight, _lightboxTargetWidth, _lightboxTargetHeight,
				data = this.data,
				self = this,
				_loadingImage = $.Deferred(),
				$newImage = $( "<img />" ),
				_url = setElement.url,
				$structure = $([]);
				
			$newImage
				.attr( "src", _url )
				.bind("load",
					function() {
						$( this ).unbind( "load" );
						
						// keep original size of an image – needed when resizing
						setElement.width = this.width;
						setElement.height = this.height;
						
						_sizes = self.getSizes();
						_imageTargetWidth = _sizes.imageTargetWidth;
						_imageTargetHeight = _sizes.imageTargetHeight;
						_lightboxTargetWidth = _sizes.lightboxTargetWidth;
						_lightboxTargetHeight = _sizes.lightboxTargetHeight;
		
						// if scaled size is smaller than the original, show Panorama
						setElement.currentWidth = _imageTargetWidth;
						setElement.currentHeight = _imageTargetHeight;
		
						// scale the image
						$( this )
							.width( _imageTargetWidth )
							.height( _imageTargetHeight );						
						
						// add the loaded image and hide it
						$structure = $structure.add( this ).hide();

						// continue the animation queue
						_loadingImage.resolve(
							{
								width: _lightboxTargetWidth,
								height: _lightboxTargetHeight,
								structure: $structure
							}
						);					
					}
				)
				.error(
					function() {
						_loadingImage.reject();
					}
				)				
				.each(
					function() {
						// the code comes from https://github.com/desandro/imagesloaded
						// cached images don't fire load sometimes, so we reset src.
						if ( this.complete || this.complete === undefined ){
						  var src = this.src;
						  // webkit hack from http://groups.google.com/group/jquery-dev/browse_thread/thread/eee6ab7b2da50e1f
						  // data uri bypasses webkit log warning (thx doug jones)
						  this.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
						  this.src = src;
						}						
					}
				);				

			return _loadingImage.promise();
		},

		loadContentVimeo: function( setElement ) {
			var _width, _height, _lightboxTargetWidth, _lightboxTargetHeight, $structure,
				data = this.data,			
				self = this,
				_loadingVimeo = $.Deferred(),
				_apiEnd = data.providers.vimeo,
				_options = setElement.options,
				_minimalLightboxSize = data.minimalLightboxSize,
				_url = setElement.url;

			$.ajax(
				{
					url: _apiEnd,
					data: {
						url: _url,
						maxwidth: _options.videoWidth,
						maxheight: _options.videoHeight
					},
					dataType: "jsonp",
					timeout: 5000
				}
			)
			.success(
				function( data ) {
					// we have to add ‘width’ and ‘height’ to the $contentWrapper
					// explicitly since browsers can’t inherit them
					$structure = $( "<div></div>" )
						.css( "display", "none" )
						.width( data.width )
						.height( data.height )
						.append( data.html );
						
					// remember video title
					if ( _options.overwriteTitle === false ) {
						setElement.title = data.title;
					}
					
					// what size the lightbox should have
					_lightboxTargetWidth = self.getOptimalSize( "width", data.width );
					_lightboxTargetHeight = self.getOptimalSize( "height", data.height );
					
					// continue the animation queue
					_loadingVimeo.resolve(
						{
							width: _lightboxTargetWidth,
							height: _lightboxTargetHeight,
							structure: $structure
						}
					);
				}
			)
			.error(function() {
				_loadingVimeo.reject();
			});

			return _loadingVimeo.promise();
		},
		
		loadContentYoutube: function( setElement ) {
			var $contentWrapper, _lightboxTargetWidth, _lightboxTargetHeight, $structure,
				data = this.data,
				self = this,
				_loadingYoutube = $.Deferred(),
				_apiEnd = data.providers.youtube,
				_options = setElement.options,
				_minimalLightboxSize = data.minimalLightboxSize,
				_width = _options.videoWidth,
				_height = _options.videoHeight,
				_structure = data.htmlYoutube;
			
			$.ajax(
				{
					url: _apiEnd + setElement.videoId + "?callback=?",
					data: {
						v: 2,
						alt: "jsonc",
						prettyprint: true
					},
					dataType: "jsonp",
					timeout: 5000
				}
			)
			.success(
				function( json ) {
					// if response is successful but there is an error
					if ( json.error ) {//sprawdzić
						_loadingYoutube.reject();
						return;
					}

					// use real data
					_structure = self.replaceHtmlPatterns(_structure,
						{
							width: _width,
							height: _height,
							url: setElement.videoId
						}
					);
						
					// we have to add ‘width’ and ‘height’ to the $contentWrapper
					// explicitly since browsers can’t inherit them
					$structure = $( "<div></div>" )
						.css( "display", "none" )
						.width( _width )
						.height( _height )
						.append( _structure );
							
					// remember video title
					if ( _options.overwriteTitle === false ) {
						setElement.title = json.data.title;
					}
					
					_lightboxTargetWidth = self.getOptimalSize( "width", _width );
					_lightboxTargetHeight = self.getOptimalSize( "height", _height );						
				
					// continue the animation queue
					_loadingYoutube.resolve(
						{
							width: _lightboxTargetWidth,
							height: _lightboxTargetHeight,
							structure: $structure
						}
					);				
				}
			)
			.error(function() {
				_loadingYoutube.reject();
			});

			return _loadingYoutube.promise();
		},
		
		navigationGoToElement: function( number ) {

			// goes to a custom element
			var data = this.data,
				sets = this.sets,
				$lb = this.$lightbox,
				_currentSet = data.currentSet,
				_currentSetName = _currentSet.name

			// which element go to
			_currentSet.currentIndex = number;
			_currentSet.currentElement = sets[_currentSetName][number - 1];

			// reload animation queue and trigger it
			this.setNextQueue();
			this.dequeue( data.queues, "lightboxNext" );
		},		
		
		next: function() {
			var data = this.data,
				sets = this.sets,
				_isReady = data.ready,
				_isPanoramaOn = data.panoramaOn,
				_currentSet = data.currentSet,
				_currentSetName = _currentSet.name,
				_currentIndex = _currentSet.currentIndex,
				_totalElements = _currentSet.totalElements,
				_options = _currentSet.currentElement.options,
				_isLoop = _options.loop,
				_play = true;
				
			if ( _isReady && _currentSetName !== "single" && _isPanoramaOn === false ) {
				if ( _currentIndex + 1 <= _totalElements ) {
					_currentSet.currentIndex = _currentIndex = _currentIndex + 1;			
				} else if ( _currentIndex + 1 > _totalElements && _isLoop ) {
					_currentSet.currentIndex = _currentIndex = 1;
				} else {
					// to prevent form loading last element again when loop is disabled
					_play = false;
				}
				
				if ( _play) {
					_currentSet.currentElement = sets[_currentSetName][_currentIndex - 1];
	
					// next element - trigger the queue ‘next’ - first update it
					this.setNextQueue();
					this.dequeue( data.queues, "lightboxNext" );					
				}
			}
		},

		open: function( setElement ) {
			var data = this.data,
				sets = this.sets,
				$anchor = setElement.$anchor,
				_currentSet = data.currentSet,
				_setName = setElement.setName,
				_url = setElement.url;

			// remember which set content belongs to
			_currentSet.name = _setName;

			// determine and remember how many elements belong to a set
			// determine the current (and clicked) element in a set
			_currentSet.totalElements = sets[_setName].length;
			_currentSet.currentIndex = this.getCurrentElementNumber( $anchor );

			// keep a reference to a current element in a set (consisting of a url, type…)
			_currentSet.currentElement = setElement;

			// set animation queues
			this.setOpenQueue();
			this.setNextQueue();	

			// start opening the lighbox
			this.dequeue( data.queues, "lightboxOpen" );
		},

		panoramaCenterContent: function() {
			var _left, _top,
				data = this.data,
				$lb = this.$lightbox,
				_currentElement = data.currentSet.currentElement,
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

		panoramaCheckAvailability: function() {

			// checks if we can turn on Panorama mode™ ;)
			// having loaded an image we save its original size
			// if the orignal image size is larger than window size we have to
			// scale down the image so it ends up with smaller image size;
			// Panorama™ is enabled only when the image can’t be displayed in its
			// orignal size.
			var data = this.data,
				_currentElement = data.currentSet.currentElement,
				_originalImageWidth = _currentElement.width,
				_originalImageHeight = _currentElement.height,
				_currentImageWidth = _currentElement.currentWidth,
				_currentImageHeight = _currentElement.currentHeight;

			if ( _currentImageWidth < _originalImageWidth || _currentImageHeight < _originalImageHeight ) {
				this.panoramaShowIcon( "expand" );
				
				// cuz we don’t want to check it twice in panoramaToggle()
				data.enablePanorama = true;
			} else {
				data.enablePanorama = false;
				this.panoramaHideIcon();
			}
		},		

		panoramaExpand: function( event ) {

			// _panoramaExpand does the main goal of the Panorama™: it displays the natural image size
			var data = this.data,
				$lb = this.$lightbox,
				_currentElement = data.currentSet.currentElement,
				_options = _currentElement.options;

			// let know that we can scroll now
			data.panoramaOn = true;

			// show the zoom out icon; we add hover state because when we click
			// the icon we lose focus and state end up with normal state
			// not when key is pressed
			if ( event.type === "click" ) {
				this.panoramaShowIcon( "shrink", "-hover" );
			} else {
				this.panoramaShowIcon( "shrink" );
			}
			
			// fixes issue with Panorama in Firefox 3.0, 3.5, 3.6
			$lb.content.css( "overflow", "hidden" );
			
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
			
			// update header width
			this.updateTitleWidth();

			// show the map
			if ( _options.showMap ) {
				this.panoramaShowMap();
			}
			
			// hide arrow cue
			this.hideArrow();
			
			// reset cursor when there is no movement; for example
			// cursor was ‘pointer’, [Z] buttons was pressed (‘default’ cursor)
			// [Z] was pressed again → cursor is still ‘pointer’
			this.setCursor();
		},

		panoramaHideIcon: function() {
			var data = this.data,
				$lb = this.$lightbox;

			$lb.panoramaIcon
				.hide()
				.removeClass( "ui-lightbox-panorama-icon-expand ui-lightbox-panorama-icon-shrink" );
			data.panoramaOn = false;			
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
				_currentElement = data.currentSet.currentElement,
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

		panoramaShowIcon: function( icon, state ) {
			var $lb = this.$lightbox,
				_state = state || "",
				_newClass = "ui-lightbox-panorama-icon-" + icon + _state;

				$lb.panoramaIcon
					.show()
					.removeClass()
					.addClass( _newClass );			
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
				_imageHeight = $image.height(),
				_currentElement = data.currentSet.currentElement,
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
			};

		},

		panoramaShrink: function( event ) {
			var data = this.data,
				$lb = this.$lightbox;

			// _panoramaShrink retores the previous size of an image
			data.panoramaOn = false;

			// show the zoom out icon; we add hover state because when we click
			// the icon we lose focus and state end up with normal state
			// not when key is pressed
			if ( event && event.type === "click" ) {
				this.panoramaShowIcon( "expand", "-hover" );
			} else {
				this.panoramaShowIcon( "expand" );
			}

			// resize an image to its previous size and center it
			this.updateImageSize();
			this.updateLightboxSize();
			this.queueCenterContent();
			
			// fixes issue with Panorama in Firefox 3.0, 3.5, 3.6
			$lb.content.css( "overflow", "visible" );			
			
			// update header width
			this.updateTitleWidth();

			// hide the map
			this.panoramaHideMap();
			
			// reset cursor when there is no movement; for example
			// cursor was ‘pointer’, [Z] buttons was pressed (‘default’ cursor)
			// [Z] was pressed again → cursor is still ‘pointer’
			this.setCursor();
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

			// if we are in the panorama mode (the panorama icon was clicked)
			if ( data.panoramaOn ) {
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
				_panoramaOn = data.panoramaOn,
				_isPanoramaEnabled = data.enablePanorama;

			if ( _isPanoramaEnabled && _panoramaOn === false ) {
				this.panoramaExpand( event );
			} else if ( _isPanoramaEnabled && _panoramaOn ) {
				this.panoramaShrink( event );			
			}
		},
		
		prev: function() {
			var data = this.data,
				sets = this.sets,
				$lb = this.$lightbox,
				_isReady = data.ready,
				_isPanoramaOn = data.panoramaOn,
				_currentSet = data.currentSet,
				_currentSetName = data.currentSet.name,
				_currentIndex = _currentSet.currentIndex,
				_totalElements = _currentSet.totalElements,
				_options = _currentSet.currentElement.options,
				_isLoop = _options.loop,
				_play = true;
				
			if ( _isReady && _currentSetName !== "single" && _isPanoramaOn === false ) {
				if ( _currentIndex - 1 >= 1 ) {
					_currentSet.currentIndex = _currentIndex = _currentIndex - 1;			
				} else if ( _currentIndex - 1 < 1 && _isLoop ) {
					_currentSet.currentIndex = _currentIndex = _totalElements;
				} else {
					// to prevent from loading first element again when loop is disabled
					_play = false;
				}

				if ( _play ) {
					_currentSet.currentElement = sets[_currentSetName][_currentIndex - 1];
	
					// next element - trigger the queue ‘next’ - first update it
					this.setNextQueue();
					this.dequeue( data.queues, "lightboxNext" );					
				}
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
				_currentSetName = _currentSet.name,
				_totalElements = _currentSet.totalElements;

			// remove given element from a set
			sets[_currentSetName].splice( number - 1, 1 );

			// if there is only one element left, close the lightbox, otherwise load next element
			if( _totalElements === 1 || _currentSetName === "single" ) {
				this.closeLightbox();

				// remove the instance from encapsulated DOM element (jquery one)
				this.destroy();
			} else {
				this.destroy();

				// update total element numbers
				_currentSet.totalElements = sets[_currentSetName].length;

				// go to a new element
				if ( number === _totalElements ) {
					this.navigationGoToElement( number - 1 );
				} else {
					this.navigationGoToElement( number );
				}
			}
		},

		replaceHtmlPatterns: function( htmlString, patterns ) {

			// replaces patterns like {width} used in html e.g in data.htmlFlash
			// with real data given in patterns object
			$.each(patterns, function(key, value) {
				var _regExp = new RegExp( "{" + key + "}", "g" );
				htmlString = htmlString.replace( _regExp, value );
			});

			return htmlString;
		},
		
		setButtonState: function( state, jqElement ) {
			var $lb = this.$lightbox,
				jqElem = jqElement || $lb.controlButtons;
				
			switch ( state ) {
				case "default":
					jqElem.removeClass( "ui-state-highlight ui-state-disabled" );
					break;
				
				case "highlight":
					jqElem.addClass( "ui-state-highlight" );
					break;
				
				case "disabled":
					jqElem.addClass( "ui-state-disabled" );
					break;
			}
		},
		
		setCursor: function( event ) {
			var data = this.data,
				$lb = this.$lightbox,
				$contentContainer = $lb.contentContainer,
				_currentSet = data.currentSet,
				_currentSetName = _currentSet.name,
				_currentElement = _currentSet.currentElement,
				_setElementType = _currentElement.type,
				_currentIndex = _currentSet.currentIndex,				
				_totalElements = _currentSet.totalElements,
				_side = data.side,
				_panoramaEnabled = data.panoramaOn,
				_isError = data.showErrorMessage,
				_options = _currentElement.options,
				_isLoop = _options.loop;
			
			if ( data.ready ) {
				if ( (_currentSetName === "single" || _totalElements === 1 || _currentIndex === 1 && _side === "left" || _currentIndex === _totalElements && _side === "right") && _panoramaEnabled === false && (_setElementType === "image" || (_setElementType !== "image" && _isError)) ) {

					// single element or single element in a named set or first element in a set or last element in a set
					// WHEN panorama is DISABLED, and when element type is ‘image’ or the Error Screen is shown
					// and when loop is DISABLED
					if ( _isLoop === false ) {
						$contentContainer.css( "cursor", "default" );						
					} else {
						
						// otherwise show ‘pointer’ in cases mentioned above
						$contentContainer.css( "cursor", "pointer" );						
					}

				} else if ( _panoramaEnabled ) {

					// panorama is enabled
					$contentContainer.css( "cursor", "move" );
				} else if ( _setElementType === "image" || (_setElementType !== "image" && _isError) ) {
					
					// between first and last element in an image set or when the Error Screen is shown
					$contentContainer.css( "cursor", "pointer" );
				} else {

					// for flash videos
					$contentContainer.css( "cursor", "auto" );
				}
			} else {
				$contentContainer.css( "cursor", "default" );
			}
			
			// for Panorama to work in IE7 & IE8
			if ( event ) {
				event.preventDefault();
			}
		},
		
		setErrorMessage: function() {
			// shows a screen with a message that content could not be loaded
			// and two buttons: one to try to load content again and one to
			// reject the content; in order to keep the dependencie to minimum
			// buttons are not jQuery UI widgets but use their CSS classes
			var $again, $reject, $errorScreenStructure,
				data = this.data,
				$lb = this.$lightbox,
				self = this,
				_currentSet = data.currentSet,
				_currentElement = _currentSet.currentElement,
				_options = _currentElement.options,
				_currentIndex = _currentSet.currentIndex,
				_errorMessage = _options.errorMessage,
				_againLabel = _options.againButtonLabel,
				_rejectLabel = _options.rejectButtonLabel,
				_errorScreenStructure = data.htmlErrorScreen,
				_errorScreenSize = data.errorScreenSize,
				_errorScreenWidth = _errorScreenSize.width,
				_errorScreenHeight = _errorScreenSize.height;

			// use real data
			_errorScreenStructure = self.replaceHtmlPatterns(_errorScreenStructure,
				{
					message: _errorMessage,
					labelAgain: _againLabel,
					labelReject: _rejectLabel				
				}
			);			
				
			$errorScreenStructure = $( _errorScreenStructure );

			$again = $errorScreenStructure.find( "#ui-lightbox-error-footer-again" );
			$reject = $errorScreenStructure.find( "#ui-lightbox-error-footer-reject" );
			
			// ‘again’ button give a user a chance to try loading content again
			$again
				.click(function() {
					self.navigationGoToElement( _currentIndex );
				})
				.hover(
					function() {
						$( this ).toggleClass( "ui-state-hover" );
					}
				);

			// removes the broken content from list of known contents
			$reject
				.click(function() {
					self.removeSetElement( _currentIndex );
				})
				.hover(
					function() {
						$( this ).toggleClass( "ui-state-hover" );
					}
				);			

			// treat the message as a normal content
			$errorScreenStructure
				.width( _errorScreenWidth )
				.height( _errorScreenHeight )
				.hide();

			return $errorScreenStructure;
		},		
		
		setNextQueue: function() {
			// for description take a look at _setOpenQueue method
			var data = this.data,
				$lb = this.$lightbox,
				queueList = [
					this.queueSlideUpHeader,
					this.queueHideContent,
					this.queueLoadContent,
					this.queueResizeLightbox,
					this.queueCenterContent,
					this.queueShowContent,
					this.queueSlideDownHeader
				];

			// place start animation queue in the queue container
			data.queues.lightboxNext = queueList.slice( 0 );
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
			var data = this.data,
				$lb = this.$lightbox,
				queueList = [
					this.queueShowOverlay,
					this.queueCenterLightbox,
					this.queueLoadContent,
					this.queueResizeLightbox,
					this.queueCenterContent,
					this.queueShowContent,
					this.queueSlideDownHeader
				];

			// place start animation queue in the queue container
			data.queues.lightboxOpen = queueList.slice( 0 );
		},		

		setReferences: function() {
			var $lb = this.$lightbox;

			// save references to wrapped set for later use
			$lb.root = $( "#ui-lightbox" );
			$lb.panoramaIcon = $lb.root.find( "#ui-lightbox-panorama-icon" );
			$lb.contentContainer = $lb.root.find( "#ui-lightbox-content-container" );
			$lb.content = $lb.contentContainer.find( "#ui-lightbox-content" );
			$lb.arrow = $lb.contentContainer.find( "#ui-lightbox-arrow" );
			$lb.header = $lb.root.find( "#ui-lightbox-bottombar" );
			$lb.headerWrapper = $lb.header.find( "#ui-lightbox-title-wrapper" );		
			$lb.overlay = $( "#ui-lightbox-overlay" );
			$lb.next = $lb.root.find( "#ui-lightbox-button-next" );
			$lb.prev = $lb.root.find( "#ui-lightbox-button-prev" );
			//$lb.play = $lb.root.find( "#ui-lightbox-button-play" );
			$lb.controlButtons = $lb.next.add( $lb.prev );//.add( $lb.play );
			$lb.close = $lb.root.find( "#ui-lightbox-button-close" );
			$lb.counter = $lb.root.find( "#ui-lightbox-counter" );
			$lb.title = $lb.root.find( "#ui-lightbox-title" );
			$lb.map = $( "#ui-lightbox-map" );
			$lb.viewport = $lb.map.children().eq( 0 );
		},
		
		showArrow: function( event ) {
			var data = this.data,
				$lb = this.$lightbox,
				$arrow = $lb.arrow,
				_isError = data.showErrorMessage,
				_side = data.side,
				_currentSet = data.currentSet,
				_currentElement = _currentSet.currentElement,
				_currentSetName = _currentSet.name,
				_currentIndex = _currentSet.currentIndex,
				_totalElements = _currentSet.totalElements,
				_isLoop = _currentElement.options.loop;
			
			// show arrow cues only in image set or in The Error Screen when it is part of a set
			if ( data.ready && data.currentSetName !== "single" && (_currentElement.type === "image" || _isError) && data.panoramaOn === false ) {

				if ( _side === "left" && (_currentIndex > 1 || _isLoop) ) {
					$arrow
						.show()
						.removeClass("ui-lightbox-arrow-next ui-corner-left")
						.addClass("ui-lightbox-arrow-prev ui-corner-right")
						.find("span")
							.removeClass("ui-icon-carat-1-e")
							.addClass("ui-icon-carat-1-w");
				} else if ( _side === "right" && (_currentIndex < _totalElements || _isLoop) ) {
					$arrow
						.show()
						.removeClass("ui-lightbox-arrow-prev ui-corner-right")
						.addClass("ui-lightbox-arrow-next ui-corner-left")
						.find("span")
							.removeClass("ui-icon-carat-1-w")
							.addClass("ui-icon-carat-1-e");
				} else {
					this.hideArrow();
				}
			}
			
			// for Panorama to work in IE7 & IE8			
			if ( event ) {
				event.preventDefault();
			}
		},

		updateCounter: function() {
			var _current, _total, _newCounter,
				data = this.data,
				$lb = this.$lightbox,
				_currentSet = data.currentSet,
				_currentElement = _currentSet.currentElement,
				_options = _currentElement.options,
				_currentSetName = _currentSet.name;

				if ( _currentSetName !== "single" ) {
					_current = _currentSet.currentIndex;
					_total = _currentSet.totalElements;
				} else {
					_current = 1;
					_total = 1;
				}

				_newCounter = _current + _options.counterDelimiter + _total;

			$lb.counter.text( _newCounter );
		},
		
		updateImageSize: function() {
			var $lb = this.$lightbox,
				$img = $lb.content.find( "img" ),
				_sizes = this.getSizes();
				
			$img
				.width( _sizes.imageTargetWidth )
				.height( _sizes.imageTargetHeight )
		},
		
		updateLightboxSize: function() {
			var _sizes = this.getSizes();
			
			this.queueResizeLightbox(
				{
					width: _sizes.lightboxTargetWidth,
					height: _sizes.lightboxTargetHeight
				}
			);
		},

		updateTitle: function() {
			var data = this.data,
				$lb = this.$lightbox,
				_currentElement = data.currentSet.currentElement;

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
			$lb.header.width( $lb.content.width() - 12 );
		},

		queueHideContent: function( next ) {
			var data = this.data,
				$lb = this.$lightbox,
				_currentElement = data.currentSet.currentElement,
				_options = _currentElement.options;

			$lb.content.children()
				.fadeOut( _options.animationSpeed, function() {
					$( this ).remove();
					next();
				});

			// disable panorama
			$lb.panoramaIcon
				.hide()
				.removeClass( "ui-lightbox-panorama-icon-expand ui-lightbox-panorama-icon-shrink" );

			data.panoramaOn = false;

			// hide the map
			this.panoramaHideMap();
		},	

		queueShowOverlay: function( next ) {
			var data = this.data,
				$lb = this.$lightbox,
				_options = data.currentSet.currentElement.options;

			// let know that lightbox is not ready
			data.ready = false;
			
			// change cursor to default
			this.setCursor();			

			// show overlay
			$lb.overlay.fadeIn( _options.animationSpeed, next );
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
				self = this,
				$lb = this.$lightbox,
				$content = $lb.content,
				_currentElement = data.currentSet.currentElement;

			switch ( _currentElement.type ) {
				case "image":
					_loadContentMethod = "loadContentImage";
					break;

				case "youtube":
					_loadContentMethod = "loadContentYoutube";
					break;

				case "vimeo":
					_loadContentMethod = "loadContentVimeo";
					break;

				case "flash":
					_loadContentMethod = "loadContentFlash";
			}

			// show spinner
			$content.addClass( "ui-lightbox-loader" );
			
			$.when( this[_loadContentMethod](_currentElement) ).then(function(d) {
				// when content has been loaded successfully
				$content
					.removeClass( "ui-lightbox-loader" )
					.empty()
					.append( d.structure );
				
				// continue the queue – resize the lightbox
				next({
					width: d.width,
					height: d.height
				});
			}, function() {
				// when there is an error, there is only one structure we have to add –
				// the error screen structure so it is not passed as parameter of the promise
				$content
					.removeClass( "ui-lightbox-loader" )
					.empty()
					.append( self.setErrorMessage() );
				
				// continue the queue – resize the lightbox
				next({
					width: data.errorScreenSize.width,
					height: data.errorScreenSize.height
				});
			});
		},

		queueResizeLightbox: function( next, targetSize ) {
			// resizes the lightbox to house content and centers it on the screen
			var _speed, _targetWidth, _targetHeight,
				data = this.data,
				$lb = this.$lightbox,
				$root = $lb.root,
				_screenWidth = this.getWindowSize( "width" ),
				_screenHeight = this.getWindowSize( "height" ),
				_padding = data.lightboxPadding,
				_headerHeight = data.headerHeight,
				_currentElement = data.currentSet.currentElement,
				_options = _currentElement.options;
			
			if ( !$.isFunction(next) ) {
				// used in the context of live resize
				_targetWidth = next.width;
				_targetHeight = next.height;
				_speed = 0;
			} else {
				// in the context of the queue
				_targetWidth = targetSize.width;
				_targetHeight = targetSize.height;
				_speed = _options.animationSpeed;
			}

			$root
				.find( "#ui-lightbox-content" )
					.animate( {width: _targetWidth}, _speed )
					.animate( {height: _targetHeight}, _speed )
					.end()
				.animate( {left: (_screenWidth - _targetWidth - _padding) / 2}, _speed )
				.animate( {top: (_screenHeight - _targetHeight - _padding - _headerHeight) / 2}, _speed, next);				
		},

		queueCenterContent: function( next ) {
			var _content,
				$lb = this.$lightbox,
				$contentContainer = $lb.content,
				$content = $contentContainer.children();

			$contentContainer
				.children()
					.css({
						top: $contentContainer.height() / 2 - $content.outerHeight() / 2,
						left: $contentContainer.width() / 2 - $content.outerWidth() / 2
					});

			// if we don’t run it in the live resize but in the queue
			if ( next ) {
				next();
			}
		},

		queueShowContent: function( next ) {
			var data = this.data,
				$lb = this.$lightbox,
				self = this,
				_currentElement = data.currentSet.currentElement,
				_options = _currentElement.options;		

			// show content
			$lb.content.children()
				.fadeIn( _options.animationSpeed, function() {
					// if one of the image sides is bigger than the screen, show panorama icon
					if ( _currentElement.type === "image" ) {
						self.panoramaCheckAvailability();
					}

					next();
				});
		},

		queueSlideDownHeader: function( next ) {
			var data = this.data,
				$lb = this.$lightbox,
				_options = data.currentSet.currentElement.options;

			// show header
			$lb.header.slideDown( _options.animationSpeed, next );

			// show and update counter
			this.updateCounter();

			// update title
			this.updateTitleWidth();
			this.updateTitle();
			
			// update buttons states
			this.checkButtonsState();
			
			// indicate that animation queue is finshed
			data.ready = true;
			
			// if you go from penulimate/second element to the last/first element change cursor to ‘default’
			// must be after ‘data.ready = true’!!!
			this.setCursor();
			
			// show arrow cue whenever possible when there is no mouse mouvement
			this.showArrow();
		},

		queueSlideUpHeader: function( next ) {
			var data = this.data,
				$lb = this.$lightbox,
				_currentElement = data.currentSet.currentElement,
				_options = _currentElement.options;

			// structure is not ready - start an animation
			data.ready = false;
			
			// hide arrow cue
			this.hideArrow();
			
			// change cursor to default
			this.setCursor();				
			
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
			panoramaOn: false,
			mapSize: {
				width: 150,
				height: 100
			},
			providers: {
				vimeo: "http://www.vimeo.com/api/oembed.json?callback=?",
				youtube: "http://gdata.youtube.com/feeds/api/videos/"
			},
			currentSet: {},
			enablePanorama: false,
			errorScreenSize: {
				width: 500,
				height: 500
			},
			htmlFlash: "" +
				"<object classid='clsid:D27CDB6E-AE6D-11cf-96B8-444553540000' width='{width}' height='{height}'>" +
					"<param name='movie' value='{url}' />" +
						"<!--[if !IE]>-->" +
						"<object type='application/x-shockwave-flash' data='{url}' width='{width}' height='{height}'>" +
						"<!--<![endif]-->" +
						"<!--[if !IE]>-->" +
						"</object>" +
						"<!--<![endif]-->" +
				"</object>",
			htmlErrorScreen: "" +
				"<div id='ui-lightbox-error'>" +
					"<div id='ui-lightbox-error-message' class='ui-lightbox-error-icon-sign'>{message}</div>" +
					"<div id='ui-lightbox-error-footer'>" +
						"<button aria-disabled='false' role='button' id='ui-lightbox-error-footer-again' class='ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-primary'>" +
							"<span class='ui-button-icon-primary ui-icon ui-icon-refresh'></span>" +
							"<span class='ui-button-text'>{labelAgain}</span>" +
						"</button>" +
						"<button aria-disabled='false' role='button' id='ui-lightbox-error-footer-reject' class='ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-primary'>" +
							"<span class='ui-button-icon-primary ui-icon ui-icon-trash'></span>" +
							"<span class='ui-button-text'>{labelReject}</span>" +
						"</button>" + 
					"</div>" +
				"</div>",
			htmlYoutube: "<iframe class='youtube-player' type='text/html' width='{width}' height='{height}' src='http://www.youtube.com/embed/{url}' frameborder='0'></iframe>",
			htmlLightbox: "" +
				"<div id='ui-lightbox' class='ui-widget ui-widget-content ui-corner-all' style='display: none'>" +
					"<div id='ui-lightbox-panorama-icon' style='display: none'></div>" +
					"<div id='ui-lightbox-content-container'>" +
						"<div id='ui-lightbox-content' class='ui-widget-content'></div>" +
						"<a id='ui-lightbox-arrow' class='ui-widget-header' style='display: none'>" +
							"<span class='ui-icon'>go</span>" +
						"</a>" +
					"</div>" +
					"<div id='ui-lightbox-bottombar' class='ui-widget-header ui-corner-all' style='display: none'>" +
						"<p id='ui-lightbox-title-wrapper'>" +
							"<span id='ui-lightbox-title'></span>" +
						"</p>" +
						"<p id='ui-lightbox-bottombar-bottom'>" +
							"<a id='ui-lightbox-button-prev' class='ui-lightbox-button'>" +
								"<span class='ui-icon ui-icon-circle-arrow-w'>prev</span>" +
							"</a>" +
							"<span id='ui-lightbox-counter'></span>" +
							"<a id='ui-lightbox-button-next' class='ui-lightbox-button'>" +
								"<span class='ui-icon ui-icon-circle-arrow-e'>next</span>" +
							"</a>" +
							//"<span id='ui-lightbox-separator'>|</span>" +
							//"<a id='ui-lightbox-button-play' class='ui-lightbox-button'>" +
							//	"<span class='ui-icon ui-icon-circle-triangle-e'>play</span>" +
							//"</a>" +
						"</p>" +
						"<a id='ui-lightbox-button-close' class='ui-lightbox-button'>" +
							"<span class='ui-icon ui-icon-closethick'>close</span>" +
						"</a>" +
					"</div>" +
				"</div>",
			htmlMap: "" +
				"<div id='ui-lightbox-map' style='display: none'>" +
					"<div id='ui-lightbox-map-viewport'></div>" +
				"</div>",
			htmlOverlay: "<div id='ui-lightbox-overlay' class='ui-widget-overlay' style='display: none'></div>",
			queues: {}
		}
	}
});
})( jQuery );
