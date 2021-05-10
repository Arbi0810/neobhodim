
; /* Start:"a:4:{s:4:"full";s:100:"/bitrix/templates/innet_market_s1/components/bitrix/catalog.section/catalog/script.js?15541984378298";s:6:"source";s:85:"/bitrix/templates/innet_market_s1/components/bitrix/catalog.section/catalog/script.js";s:3:"min";s:0:"";s:3:"map";s:0:"";}"*/
(function() {
	'use strict';

	if (!!window.JCCatalogSectionComponent)
		return;

	window.JCCatalogSectionComponent = function(params) {
		this.formPosting = false;
		this.siteId = params.siteId || '';
		this.ajaxId = params.ajaxId || '';
		this.template = params.template || '';
		this.componentPath = params.componentPath || '';
		this.parameters = params.parameters || '';

		if (params.navParams)
		{
			this.navParams = {
				NavNum: params.navParams.NavNum || 1,
				NavPageNomer: parseInt(params.navParams.NavPageNomer) || 1,
				NavPageCount: parseInt(params.navParams.NavPageCount) || 1
			};
		}

		this.bigData = params.bigData || {enabled: false};
		this.container = document.querySelector('[data-entity="' + params.container + '"]');
		this.showMoreButton = null;
		this.showMoreButtonMessage = null;

		if (this.bigData.enabled && BX.util.object_keys(this.bigData.rows).length > 0)
		{
			BX.cookie_prefix = this.bigData.js.cookiePrefix || '';
			BX.cookie_domain = this.bigData.js.cookieDomain || '';
			BX.current_server_time = this.bigData.js.serverTime;

			BX.ready(BX.delegate(this.bigDataLoad, this));
		}

		if (params.initiallyShowHeader)
		{
			BX.ready(BX.delegate(this.showHeader, this));
		}

		if (params.deferredLoad)
		{
			BX.ready(BX.delegate(this.deferredLoad, this));
		}

		if (params.lazyLoad)
		{
			this.showMoreButton = document.querySelector('[data-use="show-more-' + this.navParams.NavNum + '"]');
			this.showMoreButtonMessage = this.showMoreButton.innerHTML;
			BX.bind(this.showMoreButton, 'click', BX.proxy(this.showMore, this));
		}

		if (params.loadOnScroll)
		{
			BX.bind(window, 'scroll', BX.proxy(this.loadOnScroll, this));
		}
	};

	window.JCCatalogSectionComponent.prototype =
	{
		checkButton: function()
		{
			if (this.showMoreButton)
			{
				if (this.navParams.NavPageNomer == this.navParams.NavPageCount)
				{
					BX.remove(this.showMoreButton);
				}
				else
				{
					this.container.appendChild(this.showMoreButton);
				}
			}
		},

		enableButton: function()
		{
			if (this.showMoreButton)
			{
				BX.removeClass(this.showMoreButton, 'disabled');
				this.showMoreButton.innerHTML = this.showMoreButtonMessage;
			}
		},

		disableButton: function()
		{
			if (this.showMoreButton)
			{
				BX.addClass(this.showMoreButton, 'disabled');
				this.showMoreButton.innerHTML = BX.message('BTN_MESSAGE_LAZY_LOAD_WAITER');
			}
		},

		loadOnScroll: function()
		{
			var scrollTop = BX.GetWindowScrollPos().scrollTop,
				containerBottom = BX.pos(this.container).bottom;

			if (scrollTop + window.innerHeight > containerBottom)
			{
				this.showMore();
			}
		},

		showMore: function()
		{
			if (this.navParams.NavPageNomer < this.navParams.NavPageCount)
			{
				var data = {};
				data['action'] = 'showMore';
				data['PAGEN_' + this.navParams.NavNum] = this.navParams.NavPageNomer + 1;

				if (!this.formPosting)
				{
					this.formPosting = true;
					this.disableButton();
					this.sendRequest(data);
				}
			}
		},

		bigDataLoad: function()
		{
			var url = 'https://analytics.bitrix.info/crecoms/v1_0/recoms.php',
				data = BX.ajax.prepareData(this.bigData.params);

			if (data)
			{
				url += (url.indexOf('?') !== -1 ? '&' : '?') + data;
			}

			var onReady = BX.delegate(function(result){
				this.sendRequest({
					action: 'deferredLoad',
					bigData: 'Y',
					items: result && result.items || [],
					rid: result && result.id,
					count: this.bigData.count,
					rowsRange: this.bigData.rowsRange,
					shownIds: this.bigData.shownIds
				});
			}, this);

			BX.ajax({
				method: 'GET',
				dataType: 'json',
				url: url,
				timeout: 3,
				onsuccess: onReady,
				onfailure: onReady
			});
		},

		deferredLoad: function()
		{
			this.sendRequest({action: 'deferredLoad'});
		},

		sendRequest: function(data)
		{
			var defaultData = {
				siteId: this.siteId,
				template: this.template,
				parameters: this.parameters
			};

			if (this.ajaxId)
			{
				defaultData.AJAX_ID = this.ajaxId;
			}

			BX.ajax({
				url: this.componentPath + '/ajax.php' + (document.location.href.indexOf('clear_cache=Y') !== -1 ? '?clear_cache=Y' : ''),
				method: 'POST',
				dataType: 'json',
				timeout: 60,
				data: BX.merge(defaultData, data),
				onsuccess: BX.delegate(function(result){
					if (!result || !result.JS)
						return;

					BX.ajax.processScripts(
						BX.processHTML(result.JS).SCRIPT,
						false,
						BX.delegate(function(){this.showAction(result, data);}, this)
					);
				}, this)
			});
		},

		showAction: function(result, data)
		{
			if (!data)
				return;

			switch (data.action)
			{
				case 'showMore':
					this.processShowMoreAction(result);
					break;
				case 'deferredLoad':
					this.processDeferredLoadAction(result, data.bigData === 'Y');
					break;
			}
		},

		processShowMoreAction: function(result)
		{
			this.formPosting = false;
			this.enableButton();

			if (result)
			{
				this.navParams.NavPageNomer++;
				this.processItems(result.items);
				this.processPagination(result.pagination);
				this.checkButton();
			}
		},

		processDeferredLoadAction: function(result, bigData)
		{
			if (!result)
				return;

			var position = bigData ? this.bigData.rows : {};

			this.processItems(result.items, BX.util.array_keys(position));
		},

		processItems: function(itemsHtml, position)
		{
			if (!itemsHtml)
				return;

			var processed = BX.processHTML(itemsHtml, false),
				temporaryNode = BX.create('DIV');

			var items, k, origRows;

			temporaryNode.innerHTML = processed.HTML;
			items = temporaryNode.querySelectorAll('[data-entity="items-row"]');

			if (items.length)
			{
				this.showHeader(true);

				for (k in items)
				{
					if (items.hasOwnProperty(k))
					{
						origRows = position ? this.container.querySelectorAll('[data-entity="items-row"]') : false;
						items[k].style.opacity = 0;

						if (origRows && BX.type.isDomNode(origRows[position[k]]))
						{
							origRows[position[k]].parentNode.insertBefore(items[k], origRows[position[k]]);
						}
						else
						{
							this.container.appendChild(items[k]);
						}
					}
				}

				new BX.easing({
					duration: 2000,
					start: {opacity: 0},
					finish: {opacity: 100},
					transition: BX.easing.makeEaseOut(BX.easing.transitions.quad),
					step: function(state){
						for (var k in items)
						{
							if (items.hasOwnProperty(k))
							{
								items[k].style.opacity = state.opacity / 100;
							}
						}
					},
					complete: function(){
						for (var k in items)
						{
							if (items.hasOwnProperty(k))
							{
								items[k].removeAttribute('style');
							}
						}
					}
				}).animate();
			}

			BX.ajax.processScripts(processed.SCRIPT);
		},

		processPagination: function(paginationHtml)
		{
			if (!paginationHtml)
				return;

			var pagination = document.querySelectorAll('[data-pagination-num="' + this.navParams.NavNum + '"]');
			for (var k in pagination)
			{
				if (pagination.hasOwnProperty(k))
				{
					pagination[k].innerHTML = paginationHtml;
				}
			}
		},

		showHeader: function(animate)
		{
			var parentNode = BX.findParent(this.container, {attr: {'data-entity': 'parent-container'}}),
				header;

			if (parentNode && BX.type.isDomNode(parentNode))
			{
				header = parentNode.querySelector('[data-entity="header"]');

				if (header && header.getAttribute('data-showed') != 'true')
				{
					header.style.display = '';

					if (animate)
					{
						new BX.easing({
							duration: 2000,
							start: {opacity: 0},
							finish: {opacity: 100},
							transition: BX.easing.makeEaseOut(BX.easing.transitions.quad),
							step: function(state){
								header.style.opacity = state.opacity / 100;
							},
							complete: function(){
								header.removeAttribute('style');
								header.setAttribute('data-showed', 'true');
							}
						}).animate();
					}
					else
					{
						header.style.opacity = 100;
					}
				}
			}
		}
	};
})();
/* End */
;
; /* Start:"a:4:{s:4:"full";s:96:"/bitrix/templates/innet_market_s1/components/bitrix/catalog.item/innet/script.js?155419843774336";s:6:"source";s:80:"/bitrix/templates/innet_market_s1/components/bitrix/catalog.item/innet/script.js";s:3:"min";s:0:"";s:3:"map";s:0:"";}"*/
(function (window){
	'use strict';

	if (window.JCCatalogItem)
		return;

	var BasketButton = function(params)
	{
		BasketButton.superclass.constructor.apply(this, arguments);
		this.buttonNode = BX.create('span', {
			props: {className: 'custom-btn custom-btn--style-1 btn-md', id: this.id},
			style: typeof params.style === 'object' ? params.style : {},
			text: params.text,
			events: this.contextEvents
		});

		if (BX.browser.IsIE())
		{
			this.buttonNode.setAttribute("hideFocus", "hidefocus");
		}
	};
	BX.extend(BasketButton, BX.PopupWindowButton);

	window.JCCatalogItem = function (arParams)
	{
		this.productType = 0;
		this.showQuantity = true;
		this.showAbsent = true;
		this.secondPict = false;
		this.showOldPrice = false;
		this.showMaxQuantity = 'N';
		this.relativeQuantityFactor = 5;
		this.showPercent = false;
		this.showSkuProps = false;
		this.basketAction = 'ADD';
		this.showClosePopup = false;
		this.useCompare = false;
		this.useDelay = false;
		this.showSubscription = false;
		this.visual = {
			ID: '',
			PICT_ID: '',
			SECOND_PICT_ID: '',
			PICT_SLIDER_ID: '',
			QUANTITY_ID: '',
			QUANTITY_UP_ID: '',
			QUANTITY_DOWN_ID: '',
			PRICE_ID: '',
			PRICE_OLD_ID: '',
			DSC_PERC: '',
			SECOND_DSC_PERC: '',
			DISPLAY_PROP_DIV: '',
			BASKET_PROP_DIV: '',
			SUBSCRIBE_ID: ''
		};
		this.product = {
			checkQuantity: false,
			maxQuantity: 0,
			stepQuantity: 1,
			isDblQuantity: false,
			canBuy: true,
			name: '',
			pict: {},
			id: 0,
			addUrl: '',
			buyUrl: ''
		};

		this.basketMode = '';
		this.basketData = {
			useProps: false,
			emptyProps: false,
			quantity: 'quantity',
			props: 'prop',
			basketUrl: '',
			sku_props: '',
			sku_props_var: 'basket_props',
			add_url: '',
			buy_url: ''
		};

		this.compareData = {
			compareUrl: '',
			compareDeleteUrl: '',
			comparePath: ''
		};

		this.delayData = {
            delayUrl: '',
            delayDeleteUrl: '',
            delayPath: ''
		};

		this.defaultPict = {
			pict: null,
			secondPict: null
		};

		this.defaultSliderOptions = {
			interval: 3000,
			wrap: true
		};
		this.slider = {
			options: {},
			items: [],
			active: null,
			sliding: null,
			paused: null,
			interval: null,
			progress: null
		};
		this.touch = null;

		this.checkQuantity = false;
		this.maxQuantity = 0;
		this.minQuantity = 0;
		this.stepQuantity = 1;
		this.isDblQuantity = false;
		this.canBuy = true;
		this.precision = 6;
		this.precisionFactor = Math.pow(10, this.precision);
		this.bigData = false;
		this.fullDisplayMode = false;
		this.viewMode = '';
		this.templateTheme = '';

		this.currentPriceMode = '';
		this.currentPrices = [];
		this.currentPriceSelected = 0;
		this.currentQuantityRanges = [];
		this.currentQuantityRangeSelected = 0;

		this.offers = [];
		this.offerNum = 0;
		this.treeProps = [];
		this.selectedValues = {};

		this.obProduct = null;
		this.blockNodes = {};
		this.obQuantity = null;
		this.obQuantityUp = null;
		this.obQuantityDown = null;
		this.obQuantityLimit = {};
		this.obPict = null;
		this.obSecondPict = null;
		this.obPictSlider = null;
		this.obPictSliderIndicator = null;
		this.obPrice = null;
		this.obTree = null;
		this.obBuyBtn = null;
		this.obBasketActions = null;
		this.obNotAvail = null;
		this.obSubscribe = null;
		this.obDscPerc = null;
		this.obSecondDscPerc = null;
		this.obSkuProps = null;
		this.obMeasure = null;
		this.obCompare = null;
		this.obDelay = null;

		this.obPopupWin = null;
		this.basketUrl = '';
		this.basketParams = {};
		this.isTouchDevice = BX.hasClass(document.documentElement, 'bx-touch');
		this.hoverTimer = null;
		this.hoverStateChangeForbidden = false;
		this.mouseX = null;
		this.mouseY = null;

		this.useEnhancedEcommerce = false;
		this.dataLayerName = 'dataLayer';
		this.brandProperty = false;

		this.errorCode = 0;

		if (typeof arParams === 'object')
		{
			if (arParams.PRODUCT_TYPE)
			{
				this.productType = parseInt(arParams.PRODUCT_TYPE, 10);
			}

			this.showQuantity = arParams.SHOW_QUANTITY;
			this.showAbsent = arParams.SHOW_ABSENT;
			this.secondPict = arParams.SECOND_PICT;
			this.showOldPrice = arParams.SHOW_OLD_PRICE;
			this.showMaxQuantity = arParams.SHOW_MAX_QUANTITY;
			this.relativeQuantityFactor = parseInt(arParams.RELATIVE_QUANTITY_FACTOR);
			this.showPercent = arParams.SHOW_DISCOUNT_PERCENT;
			this.showSkuProps = arParams.SHOW_SKU_PROPS;
			this.showSubscription = arParams.USE_SUBSCRIBE;

			if (arParams.ADD_TO_BASKET_ACTION)
			{
				this.basketAction = arParams.ADD_TO_BASKET_ACTION;
			}

			this.showClosePopup = arParams.SHOW_CLOSE_POPUP;
			this.useCompare = arParams.DISPLAY_COMPARE;
			this.useDelay = arParams.DISPLAY_DELAY;
			this.fullDisplayMode = arParams.PRODUCT_DISPLAY_MODE === 'Y';
			this.bigData = arParams.BIG_DATA;
			this.viewMode = arParams.VIEW_MODE || '';
			this.templateTheme = arParams.TEMPLATE_THEME || '';
			this.useEnhancedEcommerce = arParams.USE_ENHANCED_ECOMMERCE === 'Y';
			this.dataLayerName = arParams.DATA_LAYER_NAME;
			this.brandProperty = arParams.BRAND_PROPERTY;

			this.visual = arParams.VISUAL;

			switch (this.productType)
			{
				case 0: // no catalog
				case 1: // product
				case 2: // set
					if (arParams.PRODUCT && typeof arParams.PRODUCT === 'object')
					{
						this.currentPriceMode = arParams.PRODUCT.ITEM_PRICE_MODE;
						this.currentPrices = arParams.PRODUCT.ITEM_PRICES;
						this.currentPriceSelected = arParams.PRODUCT.ITEM_PRICE_SELECTED;
						this.currentQuantityRanges = arParams.PRODUCT.ITEM_QUANTITY_RANGES;
						this.currentQuantityRangeSelected = arParams.PRODUCT.ITEM_QUANTITY_RANGE_SELECTED;

						if (this.showQuantity)
						{
							this.product.checkQuantity = arParams.PRODUCT.CHECK_QUANTITY;
							this.product.isDblQuantity = arParams.PRODUCT.QUANTITY_FLOAT;

							if (this.product.checkQuantity)
							{
								this.product.maxQuantity = (this.product.isDblQuantity ? parseFloat(arParams.PRODUCT.MAX_QUANTITY) : parseInt(arParams.PRODUCT.MAX_QUANTITY, 10));
							}

							this.product.stepQuantity = (this.product.isDblQuantity ? parseFloat(arParams.PRODUCT.STEP_QUANTITY) : parseInt(arParams.PRODUCT.STEP_QUANTITY, 10));

							this.checkQuantity = this.product.checkQuantity;
							this.isDblQuantity = this.product.isDblQuantity;
							this.stepQuantity = this.product.stepQuantity;
							this.maxQuantity = this.product.maxQuantity;
							this.minQuantity = this.currentPriceMode === 'Q'
								? parseFloat(this.currentPrices[this.currentPriceSelected].MIN_QUANTITY)
								: this.stepQuantity;

							if (this.isDblQuantity)
							{
								this.stepQuantity = Math.round(this.stepQuantity * this.precisionFactor) / this.precisionFactor;
							}
						}

						this.product.canBuy = arParams.PRODUCT.CAN_BUY;

						if (arParams.PRODUCT.MORE_PHOTO_COUNT)
						{
							this.product.morePhotoCount = arParams.PRODUCT.MORE_PHOTO_COUNT;
							this.product.morePhoto = arParams.PRODUCT.MORE_PHOTO;
						}

						if (arParams.PRODUCT.RCM_ID)
						{
							this.product.rcmId = arParams.PRODUCT.RCM_ID;
						}

						this.canBuy = this.product.canBuy;
						this.product.name = arParams.PRODUCT.NAME;
						this.product.pict = arParams.PRODUCT.PICT;
						this.product.id = arParams.PRODUCT.ID;
						this.product.DETAIL_PAGE_URL = arParams.PRODUCT.DETAIL_PAGE_URL;

						if (arParams.PRODUCT.ADD_URL)
						{
							this.product.addUrl = arParams.PRODUCT.ADD_URL;
						}

						if (arParams.PRODUCT.BUY_URL)
						{
							this.product.buyUrl = arParams.PRODUCT.BUY_URL;
						}

						if (arParams.BASKET && typeof arParams.BASKET === 'object')
						{
							this.basketData.useProps = arParams.BASKET.ADD_PROPS;
							this.basketData.emptyProps = arParams.BASKET.EMPTY_PROPS;
						}
					}
					else
					{
						this.errorCode = -1;
					}

					break;
				case 3: // sku
					if (arParams.PRODUCT && typeof arParams.PRODUCT === 'object')
					{
						this.product.name = arParams.PRODUCT.NAME;
						this.product.id = arParams.PRODUCT.ID;
						this.product.DETAIL_PAGE_URL = arParams.PRODUCT.DETAIL_PAGE_URL;
						this.product.morePhotoCount = arParams.PRODUCT.MORE_PHOTO_COUNT;
						this.product.morePhoto = arParams.PRODUCT.MORE_PHOTO;

						if (arParams.PRODUCT.RCM_ID)
						{
							this.product.rcmId = arParams.PRODUCT.RCM_ID;
						}
					}

					if (arParams.OFFERS && BX.type.isArray(arParams.OFFERS))
					{
						this.offers = arParams.OFFERS;
						this.offerNum = 0;

						if (arParams.OFFER_SELECTED)
						{
							this.offerNum = parseInt(arParams.OFFER_SELECTED, 10);
						}

						if (isNaN(this.offerNum))
						{
							this.offerNum = 0;
						}

						if (arParams.TREE_PROPS)
						{
							this.treeProps = arParams.TREE_PROPS;
						}

						if (arParams.DEFAULT_PICTURE)
						{
							this.defaultPict.pict = arParams.DEFAULT_PICTURE.PICTURE;
							this.defaultPict.secondPict = arParams.DEFAULT_PICTURE.PICTURE_SECOND;
						}
					}

					break;
				default:
					this.errorCode = -1;
			}
			if (arParams.BASKET && typeof arParams.BASKET === 'object')
			{
				if (arParams.BASKET.QUANTITY)
				{
					this.basketData.quantity = arParams.BASKET.QUANTITY;
				}

				if (arParams.BASKET.PROPS)
				{
					this.basketData.props = arParams.BASKET.PROPS;
				}

				if (arParams.BASKET.BASKET_URL)
				{
					this.basketData.basketUrl = arParams.BASKET.BASKET_URL;
				}

				if (3 === this.productType)
				{
					if (arParams.BASKET.SKU_PROPS)
					{
						this.basketData.sku_props = arParams.BASKET.SKU_PROPS;
					}
				}

				if (arParams.BASKET.ADD_URL_TEMPLATE)
				{
					this.basketData.add_url = arParams.BASKET.ADD_URL_TEMPLATE;
				}

				if (arParams.BASKET.BUY_URL_TEMPLATE)
				{
					this.basketData.buy_url = arParams.BASKET.BUY_URL_TEMPLATE;
				}

				if (this.basketData.add_url === '' && this.basketData.buy_url === '')
				{
					this.errorCode = -1024;
				}
			}

			if (this.useCompare)
			{
				if (arParams.COMPARE && typeof arParams.COMPARE === 'object')
				{
					if (arParams.COMPARE.COMPARE_PATH)
					{
						this.compareData.comparePath = arParams.COMPARE.COMPARE_PATH;
					}

					if (arParams.COMPARE.COMPARE_URL_TEMPLATE)
					{
						this.compareData.compareUrl = arParams.COMPARE.COMPARE_URL_TEMPLATE;
					}
					else
					{
						this.useCompare = false;
					}

					if (arParams.COMPARE.COMPARE_DELETE_URL_TEMPLATE)
					{
						this.compareData.compareDeleteUrl = arParams.COMPARE.COMPARE_DELETE_URL_TEMPLATE;
					}
					else
					{
						this.useCompare = false;
					}
				}
				else
				{
					this.useCompare = false;
				}
			}

			if (this.useDelay)
			{
				if (arParams.DELAY && typeof arParams.DELAY === 'object')
				{
					if (arParams.DELAY.DELAY_PATH)
					{
						this.delayData.delayPath = arParams.DELAY.DELAY_PATH;
					}

					if (arParams.DELAY.DELAY_URL_TEMPLATE)
					{
						this.delayData.delayUrl = arParams.DELAY.DELAY_URL_TEMPLATE;
					}
					else
					{
						this.useDelay = false;
					}

					if (arParams.DELAY.DELAY_DELETE_URL_TEMPLATE)
					{
						this.delayData.delayDeleteUrl = arParams.DELAY.DELAY_DELETE_URL_TEMPLATE;
					}
					else
					{
						this.useDelay = false;
					}
				}
				else
				{
					this.useDelay = false;
				}
			}
		}

		if (this.errorCode === 0)
		{
			BX.ready(BX.delegate(this.init,this));
		}
	};

	window.JCCatalogItem.prototype = {
		init: function()
		{
			var i = 0,
				treeItems = null;

			this.obProduct = BX(this.visual.ID);
			if (!this.obProduct)
			{
				this.errorCode = -1;
			}

			this.obPict = BX(this.visual.PICT_ID);
			if (!this.obPict)
			{
                // Закомментировано, т.к. не даёт добавлять в корзину товар без торговых предложений
                //this.errorCode = -2;
			}

			if (this.secondPict && this.visual.SECOND_PICT_ID)
			{
				this.obSecondPict = BX(this.visual.SECOND_PICT_ID);
			}

			this.obPictSlider = BX(this.visual.PICT_SLIDER_ID);
			this.obPictSliderIndicator = BX(this.visual.PICT_SLIDER_ID + '_indicator');
			this.obPictSliderProgressBar = BX(this.visual.PICT_SLIDER_ID + '_progress_bar');
			if (!this.obPictSlider)
			{
				this.errorCode = -4;
			}

			this.obPrice = BX(this.visual.PRICE_ID);
			this.obPriceOld = BX(this.visual.PRICE_OLD_ID);
			this.obPriceTotal = BX(this.visual.PRICE_TOTAL_ID);
			if (!this.obPrice)
			{
				this.errorCode = -16;
			}

			if (this.showQuantity && this.visual.QUANTITY_ID)
			{
				this.obQuantity = BX(this.visual.QUANTITY_ID);
				this.blockNodes.quantity = this.obProduct.querySelector('[data-entity="quantity-block"]');

				if (!this.isTouchDevice)
				{
					BX.bind(this.obQuantity, 'focus', BX.proxy(this.onFocus, this));
					BX.bind(this.obQuantity, 'blur', BX.proxy(this.onBlur, this));
				}

				if (this.visual.QUANTITY_UP_ID)
				{
					this.obQuantityUp = BX(this.visual.QUANTITY_UP_ID);
				}

				if (this.visual.QUANTITY_DOWN_ID)
				{
					this.obQuantityDown = BX(this.visual.QUANTITY_DOWN_ID);
				}
			}

			if (this.visual.QUANTITY_LIMIT && this.showMaxQuantity !== 'N')
			{
				this.obQuantityLimit.all = BX(this.visual.QUANTITY_LIMIT);
				if (this.obQuantityLimit.all)
				{
					this.obQuantityLimit.value = this.obQuantityLimit.all.querySelector('[data-entity="quantity-limit-value"]');
					if (!this.obQuantityLimit.value)
					{
						this.obQuantityLimit.all = null;
					}
				}
			}

			if (this.productType === 3 && this.fullDisplayMode)
			{
				if (this.visual.TREE_ID)
				{
					this.obTree = BX(this.visual.TREE_ID);
					if (!this.obTree)
					{
						this.errorCode = -256;
					}
				}

				if (this.visual.QUANTITY_MEASURE)
				{
					this.obMeasure = BX(this.visual.QUANTITY_MEASURE);
				}
			}

			this.obBasketActions = BX(this.visual.BASKET_ACTIONS_ID);
			if (this.obBasketActions)
			{
				if (this.visual.BUY_ID)
				{
					this.obBuyBtn = BX(this.visual.BUY_ID);
				}
			}

			this.obNotAvail = BX(this.visual.NOT_AVAILABLE_MESS);

			if (this.showSubscription)
			{
				this.obSubscribe = BX(this.visual.SUBSCRIBE_ID);
			}

			if (this.showPercent)
			{
				if (this.visual.DSC_PERC)
				{
					this.obDscPerc = BX(this.visual.DSC_PERC);
				}
				if (this.secondPict && this.visual.SECOND_DSC_PERC)
				{
					this.obSecondDscPerc = BX(this.visual.SECOND_DSC_PERC);
				}
			}

			if (this.showSkuProps)
			{
				if (this.visual.DISPLAY_PROP_DIV)
				{
					this.obSkuProps = BX(this.visual.DISPLAY_PROP_DIV);
				}
			}

			if (this.errorCode === 0)
			{
				// product slider events
				if (this.isTouchDevice)
				{
					BX.bind(this.obPictSlider, 'touchstart', BX.proxy(this.touchStartEvent, this));
					BX.bind(this.obPictSlider, 'touchend', BX.proxy(this.touchEndEvent, this));
					BX.bind(this.obPictSlider, 'touchcancel', BX.proxy(this.touchEndEvent, this));
				}
				else
				{
					if (this.viewMode === 'CARD')
					{
						// product hover events
						BX.bind(this.obProduct, 'mouseenter', BX.proxy(this.hoverOn, this));
						BX.bind(this.obProduct, 'mouseleave', BX.proxy(this.hoverOff, this));
					}

					// product slider events
					BX.bind(this.obProduct, 'mouseenter', BX.proxy(this.cycleSlider, this));
					BX.bind(this.obProduct, 'mouseleave', BX.proxy(this.stopSlider, this));
				}

				if (this.bigData)
				{
					var links = BX.findChildren(this.obProduct, {tag:'a'}, true);
					if (links)
					{
						for (i in links)
						{
							if (links.hasOwnProperty(i))
							{
								if (links[i].getAttribute('href') == this.product.DETAIL_PAGE_URL)
								{
									BX.bind(links[i], 'click', BX.proxy(this.rememberProductRecommendation, this));
								}
							}
						}
					}
				}

				if (this.showQuantity)
				{
					if (this.obQuantityUp)
					{
						BX.bind(this.obQuantityUp, 'click', BX.delegate(this.quantityUp, this));
					}

					if (this.obQuantityDown)
					{
						BX.bind(this.obQuantityDown, 'click', BX.delegate(this.quantityDown, this));
					}

					if (this.obQuantity)
					{
						BX.bind(this.obQuantity, 'change', BX.delegate(this.quantityChange, this));
					}
				}

				switch (this.productType)
				{
					case 0: // no catalog
					case 1: // product
					case 2: // set
						if (parseInt(this.product.morePhotoCount) > 1 && this.obPictSlider)
						{
							this.initializeSlider();
						}

						this.checkQuantityControls();

						break;
					case 3: // sku
						if (this.offers.length > 0)
						{
							treeItems = BX.findChildren(this.obTree, {tagName: 'li'}, true);

							if (treeItems && treeItems.length)
							{
								for (i = 0; i < treeItems.length; i++)
								{
									BX.bind(treeItems[i], 'click', BX.delegate(this.selectOfferProp, this));
								}
							}

							this.setCurrent();
						}
						else if (parseInt(this.product.morePhotoCount) > 1 && this.obPictSlider)
						{
							this.initializeSlider();
						}

						break;
				}

				if (this.obBuyBtn)
				{
					if (this.basketAction === 'ADD')
					{
						BX.bind(this.obBuyBtn, 'click', BX.proxy(this.add2Basket, this));
					}
					else
					{
						BX.bind(this.obBuyBtn, 'click', BX.proxy(this.buyBasket, this));
					}
				}

				if (this.useCompare)
				{
					this.obCompare = BX(this.visual.COMPARE_LINK_ID);
					if (this.obCompare)
					{
						BX.bind(this.obCompare, 'click', BX.proxy(this.compare, this));
					}

					BX.addCustomEvent('onCatalogDeleteCompare', BX.proxy(this.checkDeletedCompare, this));
				}

				if (this.useDelay)
				{
					this.obDelay = BX(this.visual.DELAY_LINK_ID);
					if (this.obDelay)
					{
						BX.bind(this.obDelay, 'click', BX.proxy(this.delay, this));
					}

					BX.addCustomEvent('onCatalogDeleteDelay', BX.proxy(this.checkDeletedDelay, this));
				}
			}/* else {
                console.log('Error code: '+this.errorCode);
                console.log(this.visual);
            }*/
		},

		setAnalyticsDataLayer: function(action)
		{
			if (!this.useEnhancedEcommerce || !this.dataLayerName)
				return;

			var item = {},
				info = {},
				variants = [],
				i, k, j, propId, skuId, propValues;

			switch (this.productType)
			{
				case 0: //no catalog
				case 1: //product
				case 2: //set
					item = {
						'id': this.product.id,
						'name': this.product.name,
						'price': this.currentPrices[this.currentPriceSelected] && this.currentPrices[this.currentPriceSelected].PRICE,
						'brand': BX.type.isArray(this.brandProperty) ? this.brandProperty.join('/') : this.brandProperty
					};
					break;
				case 3: //sku
					for (i in this.offers[this.offerNum].TREE)
					{
						if (this.offers[this.offerNum].TREE.hasOwnProperty(i))
						{
							propId = i.substring(5);
							skuId = this.offers[this.offerNum].TREE[i];

							for (k in this.treeProps)
							{
								if (this.treeProps.hasOwnProperty(k) && this.treeProps[k].ID == propId)
								{
									for (j in this.treeProps[k].VALUES)
									{
										propValues = this.treeProps[k].VALUES[j];
										if (propValues.ID == skuId)
										{
											variants.push(propValues.NAME);
											break;
										}
									}

								}
							}
						}
					}

					item = {
						'id': this.offers[this.offerNum].ID,
						'name': this.offers[this.offerNum].NAME,
						'price': this.currentPrices[this.currentPriceSelected] && this.currentPrices[this.currentPriceSelected].PRICE,
						'brand': BX.type.isArray(this.brandProperty) ? this.brandProperty.join('/') : this.brandProperty,
						'variant': variants.join('/')
					};
					break;
			}

			switch (action)
			{
				case 'addToCart':
					info = {
						'event': 'addToCart',
						'ecommerce': {
							'currencyCode': this.currentPrices[this.currentPriceSelected] && this.currentPrices[this.currentPriceSelected].CURRENCY || '',
							'add': {
								'products': [{
									'name': item.name || '',
									'id': item.id || '',
									'price': item.price || 0,
									'brand': item.brand || '',
									'category': item.category || '',
									'variant': item.variant || '',
									'quantity': this.showQuantity && this.obQuantity ? this.obQuantity.value : 1
								}]
							}
						}
					};
					break;
			}

			window[this.dataLayerName] = window[this.dataLayerName] || [];
			window[this.dataLayerName].push(info);
		},

		hoverOn: function(event)
		{
			clearTimeout(this.hoverTimer);
			this.obProduct.style.height = getComputedStyle(this.obProduct).height;
			BX.addClass(this.obProduct, 'hover');

			BX.PreventDefault(event);
		},

		hoverOff: function(event)
		{
			if (this.hoverStateChangeForbidden)
				return;

			BX.removeClass(this.obProduct, 'hover');
			this.hoverTimer = setTimeout(
				BX.delegate(function(){
					this.obProduct.style.height = 'auto';
				}, this),
				300
			);

			BX.PreventDefault(event);
		},

		onFocus: function()
		{
			this.hoverStateChangeForbidden = true;
			BX.bind(document, 'mousemove', BX.proxy(this.captureMousePosition, this));
		},

		onBlur: function()
		{
			this.hoverStateChangeForbidden = false;
			BX.unbind(document, 'mousemove', BX.proxy(this.captureMousePosition, this));

			var cursorElement = document.elementFromPoint(this.mouseX, this.mouseY);
			if (!cursorElement || !this.obProduct.contains(cursorElement))
			{
				this.hoverOff();
			}
		},

		captureMousePosition: function(event)
		{
			this.mouseX = event.clientX;
			this.mouseY = event.clientY;
		},

		getCookie: function(name)
		{
			var matches = document.cookie.match(new RegExp(
				"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
			));

			return matches ? decodeURIComponent(matches[1]) : null;
		},

		rememberProductRecommendation: function()
		{
			// save to RCM_PRODUCT_LOG
			var cookieName = BX.cookie_prefix + '_RCM_PRODUCT_LOG',
				cookie = this.getCookie(cookieName),
				itemFound = false;

			var cItems = [],
				cItem;

			if (cookie)
			{
				cItems = cookie.split('.');
			}

			var i = cItems.length;

			while (i--)
			{
				cItem = cItems[i].split('-');

				if (cItem[0] == this.product.id)
				{
					// it's already in recommendations, update the date
					cItem = cItems[i].split('-');

					// update rcmId and date
					cItem[1] = this.product.rcmId;
					cItem[2] = BX.current_server_time;

					cItems[i] = cItem.join('-');
					itemFound = true;
				}
				else
				{
					if ((BX.current_server_time - cItem[2]) > 3600 * 24 * 30)
					{
						cItems.splice(i, 1);
					}
				}
			}

			if (!itemFound)
			{
				// add recommendation
				cItems.push([this.product.id, this.product.rcmId, BX.current_server_time].join('-'));
			}

			// serialize
			var plNewCookie = cItems.join('.'),
				cookieDate = new Date(new Date().getTime() + 1000 * 3600 * 24 * 365 * 10).toUTCString();

			document.cookie = cookieName + "=" + plNewCookie + "; path=/; expires=" + cookieDate + "; domain=" + BX.cookie_domain;
		},

		quantityUp: function()
		{
			var curValue = 0,
				boolSet = true;

			if (this.errorCode === 0 && this.showQuantity && this.canBuy)
			{
				curValue = (this.isDblQuantity ? parseFloat(this.obQuantity.value) : parseInt(this.obQuantity.value, 10));
				if (!isNaN(curValue))
				{
					curValue += this.stepQuantity;
					if (this.checkQuantity)
					{
						if (curValue > this.maxQuantity)
						{
							boolSet = false;
						}
					}

					if (boolSet)
					{
						if (this.isDblQuantity)
						{
							curValue = Math.round(curValue * this.precisionFactor) / this.precisionFactor;
						}

						this.obQuantity.value = curValue;

						this.setPrice();
					}
				}
			}
		},

		quantityDown: function()
		{
			var curValue = 0,
				boolSet = true;

			if (this.errorCode === 0 && this.showQuantity && this.canBuy)
			{
				curValue = (this.isDblQuantity ? parseFloat(this.obQuantity.value) : parseInt(this.obQuantity.value, 10));
				if (!isNaN(curValue))
				{
					curValue -= this.stepQuantity;

					this.checkPriceRange(curValue);

					if (curValue < this.minQuantity)
					{
						boolSet = false;
					}

					if (boolSet)
					{
						if (this.isDblQuantity)
						{
							curValue = Math.round(curValue * this.precisionFactor) / this.precisionFactor;
						}

						this.obQuantity.value = curValue;

						this.setPrice();
					}
				}
			}
		},

		quantityChange: function()
		{
			var curValue = 0,
				intCount;

			if (this.errorCode === 0 && this.showQuantity)
			{
				if (this.canBuy)
				{
					curValue = this.isDblQuantity ? parseFloat(this.obQuantity.value) : Math.round(this.obQuantity.value);
					if (!isNaN(curValue))
					{
						if (this.checkQuantity)
						{
							if (curValue > this.maxQuantity)
							{
								curValue = this.maxQuantity;
							}
						}

						this.checkPriceRange(curValue);

						if (curValue < this.minQuantity)
						{
							curValue = this.minQuantity;
						}
						else
						{
							intCount = Math.round(
									Math.round(curValue * this.precisionFactor / this.stepQuantity) / this.precisionFactor
								) || 1;
							curValue = (intCount <= 1 ? this.stepQuantity : intCount * this.stepQuantity);
							curValue = Math.round(curValue * this.precisionFactor) / this.precisionFactor;
						}

						this.obQuantity.value = curValue;
					}
					else
					{
						this.obQuantity.value = this.minQuantity;
					}
				}
				else
				{
					this.obQuantity.value = this.minQuantity;
				}

				this.setPrice();
			}
		},

		quantitySet: function(index)
		{
			var resetQuantity, strLimit;
			
			var newOffer = this.offers[index],
				oldOffer = this.offers[this.offerNum];

			if (this.errorCode === 0)
			{
				this.canBuy = newOffer.CAN_BUY;

				this.currentPriceMode = newOffer.ITEM_PRICE_MODE;
				this.currentPrices = newOffer.ITEM_PRICES;
				this.currentPriceSelected = newOffer.ITEM_PRICE_SELECTED;
				this.currentQuantityRanges = newOffer.ITEM_QUANTITY_RANGES;
				this.currentQuantityRangeSelected = newOffer.ITEM_QUANTITY_RANGE_SELECTED;

				if (this.canBuy)
				{
					if (this.blockNodes.quantity)
					{
						BX.style(this.blockNodes.quantity, 'display', '');
					}

					if (this.obBasketActions)
					{
						BX.style(this.obBasketActions, 'display', '');
					}

					if (this.obNotAvail)
					{
						BX.style(this.obNotAvail, 'display', 'none');
					}

					if (this.obSubscribe)
					{
						BX.style(this.obSubscribe, 'display', 'none');
					}
				}
				else
				{
					if (this.blockNodes.quantity)
					{
						BX.style(this.blockNodes.quantity, 'display', 'none');
					}

					if (this.obBasketActions)
					{
						BX.style(this.obBasketActions, 'display', 'none');
					}

					if (this.obNotAvail)
					{
						BX.style(this.obNotAvail, 'display', '');
					}

					if (this.obSubscribe)
					{
						if (newOffer.CATALOG_SUBSCRIBE === 'Y')
						{
							BX.style(this.obSubscribe, 'display', '');
							this.obSubscribe.setAttribute('data-item', newOffer.ID);
							BX(this.visual.SUBSCRIBE_ID + '_hidden').click();
						}
						else
						{
							BX.style(this.obSubscribe, 'display', 'none');
						}
					}
				}

				this.isDblQuantity = newOffer.QUANTITY_FLOAT;
				this.checkQuantity = newOffer.CHECK_QUANTITY;

				if (this.isDblQuantity)
				{
					this.stepQuantity = Math.round(parseFloat(newOffer.STEP_QUANTITY) * this.precisionFactor) / this.precisionFactor;
					this.maxQuantity = parseFloat(newOffer.MAX_QUANTITY);
					this.minQuantity = this.currentPriceMode === 'Q' ? parseFloat(this.currentPrices[this.currentPriceSelected].MIN_QUANTITY) : this.stepQuantity;
				}
				else
				{
					this.stepQuantity = parseInt(newOffer.STEP_QUANTITY, 10);
					this.maxQuantity = parseInt(newOffer.MAX_QUANTITY, 10);
					this.minQuantity = this.currentPriceMode === 'Q' ? parseInt(this.currentPrices[this.currentPriceSelected].MIN_QUANTITY) : this.stepQuantity;
				}

				if (this.showQuantity)
				{
					var isDifferentMinQuantity = oldOffer.ITEM_PRICES.length
						&& oldOffer.ITEM_PRICES[oldOffer.ITEM_PRICE_SELECTED]
						&& oldOffer.ITEM_PRICES[oldOffer.ITEM_PRICE_SELECTED].MIN_QUANTITY != this.minQuantity;

					if (this.isDblQuantity)
					{
						resetQuantity = Math.round(parseFloat(oldOffer.STEP_QUANTITY) * this.precisionFactor) / this.precisionFactor !== this.stepQuantity
							|| isDifferentMinQuantity
							|| oldOffer.MEASURE !== newOffer.MEASURE
							|| (
								this.checkQuantity
								&& parseFloat(oldOffer.MAX_QUANTITY) > this.maxQuantity
								&& parseFloat(this.obQuantity.value) > this.maxQuantity
							);
					}
					else
					{
						resetQuantity = parseInt(oldOffer.STEP_QUANTITY, 10) !== this.stepQuantity
							|| isDifferentMinQuantity
							|| oldOffer.MEASURE !== newOffer.MEASURE
							|| (
								this.checkQuantity
								&& parseInt(oldOffer.MAX_QUANTITY, 10) > this.maxQuantity
								&& parseInt(this.obQuantity.value, 10) > this.maxQuantity
							);
					}

					this.obQuantity.disabled = !this.canBuy;

					if (resetQuantity)
					{
						this.obQuantity.value = this.minQuantity;
					}

					if (this.obMeasure)
					{
						if (newOffer.MEASURE)
						{
							BX.adjust(this.obMeasure, {html: newOffer.MEASURE});
						}
						else
						{
							BX.adjust(this.obMeasure, {html: ''});
						}
					}
				}

				if (this.obQuantityLimit.all)
				{
					if (!this.checkQuantity || this.maxQuantity == 0)
					{
						BX.adjust(this.obQuantityLimit.value, {html: ''});
						BX.adjust(this.obQuantityLimit.all, {style: {display: 'none'}});
					}
					else
					{
						if (this.showMaxQuantity === 'M')
						{
							strLimit = (this.maxQuantity / this.stepQuantity >= this.relativeQuantityFactor)
								? BX.message('RELATIVE_QUANTITY_MANY')
								: BX.message('RELATIVE_QUANTITY_FEW');
						}
						else
						{
							strLimit = this.maxQuantity;

							if (newOffer.MEASURE)
							{
								strLimit += (' ' + newOffer.MEASURE);
							}
						}

						BX.adjust(this.obQuantityLimit.value, {html: strLimit});
						BX.adjust(this.obQuantityLimit.all, {style: {display: ''}});
					}
				}
			}
		},

		initializeSlider: function()
		{
			var wrap = this.obPictSlider.getAttribute('data-slider-wrap');
			if (wrap)
			{
				this.slider.options.wrap = wrap === 'true';
			}
			else
			{
				this.slider.options.wrap = this.defaultSliderOptions.wrap;
			}

			if (this.isTouchDevice)
			{
				this.slider.options.interval = false;
			}
			else
			{
				this.slider.options.interval = parseInt(this.obPictSlider.getAttribute('data-slider-interval')) || this.defaultSliderOptions.interval;
				// slider interval must be more than 700ms because of css transitions
				if (this.slider.options.interval < 700)
				{
					this.slider.options.interval = 700;
				}

				if (this.obPictSliderIndicator)
				{
					var controls = this.obPictSliderIndicator.querySelectorAll('[data-go-to]');
					for (var i in controls)
					{
						if (controls.hasOwnProperty(i))
						{
							BX.bind(controls[i], 'click', BX.proxy(this.sliderClickHandler, this));
						}
					}
				}

				if (this.obPictSliderProgressBar)
				{
					if (this.slider.progress)
					{
						this.resetProgress();
						this.cycleSlider();
					}
					else
					{
						this.slider.progress = new BX.easing({
							transition: BX.easing.transitions.linear,
							step: BX.delegate(function(state){
								this.obPictSliderProgressBar.style.width = state.width / 10 + '%';
							}, this)
						});
					}
				}
			}
		},

		checkTouch: function(event)
		{
			if (!event || !event.changedTouches)
				return false;

			return event.changedTouches[0].identifier === this.touch.identifier;
		},

		touchStartEvent: function(event)
		{
			if (event.touches.length != 1)
				return;

			this.touch = event.changedTouches[0];
		},

		touchEndEvent: function(event)
		{
			if (!this.checkTouch(event))
				return;

			var deltaX = this.touch.pageX - event.changedTouches[0].pageX,
				deltaY = this.touch.pageY - event.changedTouches[0].pageY;

			if (Math.abs(deltaX) >= Math.abs(deltaY) + 10)
			{
				if (deltaX > 0)
				{
					this.slideNext();
				}

				if (deltaX < 0)
				{
					this.slidePrev();
				}
			}
		},

		sliderClickHandler: function(event)
		{
			var target = BX.getEventTarget(event),
				slideIndex = target.getAttribute('data-go-to');

			if (slideIndex)
			{
				this.slideTo(slideIndex)
			}

			BX.PreventDefault(event);
		},

		slideNext: function()
		{
			if (this.slider.sliding)
				return;

			return this.slide('next');
		},

		slidePrev: function()
		{
			if (this.slider.sliding)
				return;

			return this.slide('prev');
		},

		slideTo: function(pos)
		{
			this.slider.active = BX.findChild(this.obPictSlider, {className: 'item active'}, true, false);
			this.slider.progress && (this.slider.interval = true);

			var activeIndex = this.getItemIndex(this.slider.active);

			if (pos > (this.slider.items.length - 1) || pos < 0)
				return;

			if (this.slider.sliding)
				return false;

			if (activeIndex == pos)
			{
				this.stopSlider();
				this.cycleSlider();
				return;
			}

			return this.slide(pos > activeIndex ? 'next' : 'prev', this.eq(this.slider.items, pos));
		},

		slide: function(type, next)
		{
			var active = BX.findChild(this.obPictSlider, {className: 'item active'}, true, false),
				isCycling = this.slider.interval,
				direction = type === 'next' ? 'left' : 'right';

			next = next || this.getItemForDirection(type, active);

			if (BX.hasClass(next, 'active'))
			{
				return (this.slider.sliding = false);
			}

			this.slider.sliding = true;

			isCycling && this.stopSlider();

			if (this.obPictSliderIndicator)
			{
				BX.removeClass(this.obPictSliderIndicator.querySelector('.active'), 'active');
				var nextIndicator = this.obPictSliderIndicator.querySelectorAll('[data-go-to]')[this.getItemIndex(next)];
				nextIndicator && BX.addClass(nextIndicator, 'active');
			}

			if (BX.hasClass(this.obPictSlider, 'slide') && !BX.browser.IsIE())
			{
				var self = this;
				BX.addClass(next, type);
				next.offsetWidth; // force reflow
				BX.addClass(active, direction);
				BX.addClass(next, direction);
				setTimeout(function() {
					BX.addClass(next, 'active');
					BX.removeClass(active, 'active');
					BX.removeClass(active, direction);
					BX.removeClass(next, type);
					BX.removeClass(next, direction);
					self.slider.sliding = false;
				}, 700);
			}
			else
			{
				BX.addClass(next, 'active');
				this.slider.sliding = false;
			}

			this.obPictSliderProgressBar && this.resetProgress();
			isCycling && this.cycleSlider();
		},

		stopSlider: function(event)
		{
			event || (this.slider.paused = true);

			this.slider.interval && clearInterval(this.slider.interval);

			if (this.slider.progress)
			{
				this.slider.progress.stop();

				var width = parseInt(this.obPictSliderProgressBar.style.width);

				this.slider.progress.options.duration = this.slider.options.interval * width / 200;
				this.slider.progress.options.start = {width: width * 10};
				this.slider.progress.options.finish = {width: 0};
				this.slider.progress.options.complete = null;
				this.slider.progress.animate();
			}
		},

		cycleSlider: function(event)
		{
			event || (this.slider.paused = false);

			this.slider.interval && clearInterval(this.slider.interval);

			if (this.slider.options.interval && !this.slider.paused)
			{
				if (this.slider.progress)
				{
					this.slider.progress.stop();

					var width = parseInt(this.obPictSliderProgressBar.style.width);

					this.slider.progress.options.duration = this.slider.options.interval * (100 - width) / 100;
					this.slider.progress.options.start = {width: width * 10};
					this.slider.progress.options.finish = {width: 1000};
					this.slider.progress.options.complete = BX.delegate(function(){
						this.slider.interval = true;
						this.slideNext();
					}, this);
					this.slider.progress.animate();
				}
				else
				{
					this.slider.interval = setInterval(BX.proxy(this.slideNext, this), this.slider.options.interval);
				}
			}
		},

		resetProgress: function()
		{
			this.slider.progress && this.slider.progress.stop();
			this.obPictSliderProgressBar.style.width = 0;
		},

		getItemForDirection: function(direction, active)
		{
			var activeIndex = this.getItemIndex(active),
				willWrap = direction === 'prev' && activeIndex === 0
					|| direction === 'next' && activeIndex == (this.slider.items.length - 1);

			if (willWrap && !this.slider.options.wrap)
				return active;

			var delta = direction === 'prev' ? -1 : 1,
				itemIndex = (activeIndex + delta) % this.slider.items.length;

			return this.eq(this.slider.items, itemIndex);
		},

		getItemIndex: function(item)
		{
			this.slider.items = BX.findChildren(item.parentNode, {className: 'item'}, true);

			return this.slider.items.indexOf(item || this.slider.active);
		},

		eq: function(obj, i)
		{
			var len = obj.length,
				j = +i + (i < 0 ? len : 0);

			return j >= 0 && j < len ? obj[j] : {};
		},

		selectOfferProp: function()
		{
			var i = 0,
				value = '',
				strTreeValue = '',
				arTreeItem = [],
				rowItems = null,
				target = BX.proxy_context;

			if (target && target.hasAttribute('data-treevalue'))
			{
				if (BX.hasClass(target, 'selected'))
					return;

				strTreeValue = target.getAttribute('data-treevalue');
				arTreeItem = strTreeValue.split('_');
				if (this.searchOfferPropIndex(arTreeItem[0], arTreeItem[1]))
				{
					rowItems = BX.findChildren(target.parentNode, {tagName: 'li'}, false);
					if (rowItems && 0 < rowItems.length)
					{
						for (i = 0; i < rowItems.length; i++)
						{
							value = rowItems[i].getAttribute('data-onevalue');
							if (value === arTreeItem[1])
							{
								BX.addClass(rowItems[i], 'selected');
							}
							else
							{
								BX.removeClass(rowItems[i], 'selected');
							}
						}
					}
				}
			}
		},

		searchOfferPropIndex: function(strPropID, strPropValue)
		{
			var strName = '',
				arShowValues = false,
				i, j,
				arCanBuyValues = [],
				allValues = [],
				index = -1,
				arFilter = {},
				tmpFilter = [];

			for (i = 0; i < this.treeProps.length; i++)
			{
				if (this.treeProps[i].ID === strPropID)
				{
					index = i;
					break;
				}
			}

			if (-1 < index)
			{
				for (i = 0; i < index; i++)
				{
					strName = 'PROP_'+this.treeProps[i].ID;
					arFilter[strName] = this.selectedValues[strName];
				}
				strName = 'PROP_'+this.treeProps[index].ID;
				arShowValues = this.getRowValues(arFilter, strName);
				if (!arShowValues)
				{
					return false;
				}
				if (!BX.util.in_array(strPropValue, arShowValues))
				{
					return false;
				}
				arFilter[strName] = strPropValue;
				for (i = index+1; i < this.treeProps.length; i++)
				{
					strName = 'PROP_'+this.treeProps[i].ID;
					arShowValues = this.getRowValues(arFilter, strName);
					if (!arShowValues)
					{
						return false;
					}
					allValues = [];
					if (this.showAbsent)
					{
						arCanBuyValues = [];
						tmpFilter = [];
						tmpFilter = BX.clone(arFilter, true);
						for (j = 0; j < arShowValues.length; j++)
						{
							tmpFilter[strName] = arShowValues[j];
							allValues[allValues.length] = arShowValues[j];
							if (this.getCanBuy(tmpFilter))
								arCanBuyValues[arCanBuyValues.length] = arShowValues[j];
						}
					}
					else
					{
						arCanBuyValues = arShowValues;
					}
					if (this.selectedValues[strName] && BX.util.in_array(this.selectedValues[strName], arCanBuyValues))
					{
						arFilter[strName] = this.selectedValues[strName];
					}
					else
					{
						if (this.showAbsent)
							arFilter[strName] = (arCanBuyValues.length > 0 ? arCanBuyValues[0] : allValues[0]);
						else
							arFilter[strName] = arCanBuyValues[0];
					}
					this.updateRow(i, arFilter[strName], arShowValues, arCanBuyValues);
				}
				this.selectedValues = arFilter;
				this.changeInfo();
			}
			return true;
		},

		updateRow: function(intNumber, activeID, showID, canBuyID)
		{
			var i = 0,
				value = '',
				isCurrent = false,
				rowItems = null;

			var lineContainer = this.obTree.querySelectorAll('[data-entity="sku-line-block"]'),
				listContainer;

			if (intNumber > -1 && intNumber < lineContainer.length)
			{
				listContainer = lineContainer[intNumber].querySelector('ul');
				rowItems = BX.findChildren(listContainer, {tagName: 'li'}, false);
				if (rowItems && 0 < rowItems.length)
				{
					for (i = 0; i < rowItems.length; i++)
					{
						value = rowItems[i].getAttribute('data-onevalue');
						isCurrent = value === activeID;

						if (isCurrent)
						{
							BX.addClass(rowItems[i], 'selected');
						}
						else
						{
							BX.removeClass(rowItems[i], 'selected');
						}

						if (BX.util.in_array(value, canBuyID))
						{
							BX.removeClass(rowItems[i], 'notallowed');
						}
						else
						{
							BX.addClass(rowItems[i], 'notallowed');
						}

						rowItems[i].style.display = BX.util.in_array(value, showID) ? '' : 'none';

						if (isCurrent)
						{
							lineContainer[intNumber].style.display = (value == 0 && canBuyID.length == 1) ? 'none' : '';
						}
					}
				}
			}
		},

		getRowValues: function(arFilter, index)
		{
			var i = 0,
				j,
				arValues = [],
				boolSearch = false,
				boolOneSearch = true;

			if (0 === arFilter.length)
			{
				for (i = 0; i < this.offers.length; i++)
				{
					if (!BX.util.in_array(this.offers[i].TREE[index], arValues))
					{
						arValues[arValues.length] = this.offers[i].TREE[index];
					}
				}
				boolSearch = true;
			}
			else
			{
				for (i = 0; i < this.offers.length; i++)
				{
					boolOneSearch = true;
					for (j in arFilter)
					{
						if (arFilter[j] !== this.offers[i].TREE[j])
						{
							boolOneSearch = false;
							break;
						}
					}
					if (boolOneSearch)
					{
						if (!BX.util.in_array(this.offers[i].TREE[index], arValues))
						{
							arValues[arValues.length] = this.offers[i].TREE[index];
						}
						boolSearch = true;
					}
				}
			}
			return (boolSearch ? arValues : false);
		},

		getCanBuy: function(arFilter)
		{
			var i, j,
				boolSearch = false,
				boolOneSearch = true;

			for (i = 0; i < this.offers.length; i++)
			{
				boolOneSearch = true;
				for (j in arFilter)
				{
					if (arFilter[j] !== this.offers[i].TREE[j])
					{
						boolOneSearch = false;
						break;
					}
				}
				if (boolOneSearch)
				{
					if (this.offers[i].CAN_BUY)
					{
						boolSearch = true;
						break;
					}
				}
			}

			return boolSearch;
		},

		setCurrent: function()
		{
			var i,
				j = 0,
				arCanBuyValues = [],
				strName = '',
				arShowValues = false,
				arFilter = {},
				tmpFilter = [],
				current = this.offers[this.offerNum].TREE;

			for (i = 0; i < this.treeProps.length; i++)
			{
				strName = 'PROP_'+this.treeProps[i].ID;
				arShowValues = this.getRowValues(arFilter, strName);
				if (!arShowValues)
				{
					break;
				}
				if (BX.util.in_array(current[strName], arShowValues))
				{
					arFilter[strName] = current[strName];
				}
				else
				{
					arFilter[strName] = arShowValues[0];
					this.offerNum = 0;
				}
				if (this.showAbsent)
				{
					arCanBuyValues = [];
					tmpFilter = [];
					tmpFilter = BX.clone(arFilter, true);
					for (j = 0; j < arShowValues.length; j++)
					{
						tmpFilter[strName] = arShowValues[j];
						if (this.getCanBuy(tmpFilter))
						{
							arCanBuyValues[arCanBuyValues.length] = arShowValues[j];
						}
					}
				}
				else
				{
					arCanBuyValues = arShowValues;
				}
				this.updateRow(i, arFilter[strName], arShowValues, arCanBuyValues);
			}
			this.selectedValues = arFilter;
			this.changeInfo();
		},

		changeInfo: function()
		{
			var i, j,
				index = -1,
				boolOneSearch = true,
				quantityChanged;

			for (i = 0; i < this.offers.length; i++)
			{
				boolOneSearch = true;
				for (j in this.selectedValues)
				{
					if (this.selectedValues[j] !== this.offers[i].TREE[j])
					{
						boolOneSearch = false;
						break;
					}
				}
				if (boolOneSearch)
				{
					index = i;
					break;
				}
			}
			if (index > -1)
			{
				if (parseInt(this.offers[index].MORE_PHOTO_COUNT) > 1 && this.obPictSlider)
				{
					// hide pict and second_pict containers
					if (this.obPict)
					{
						this.obPict.style.display = 'none';
					}

					if (this.obSecondPict)
					{
						this.obSecondPict.style.display = 'none';
					}

					// clear slider container
					BX.cleanNode(this.obPictSlider);

					// fill slider container with slides
					for (i in this.offers[index].MORE_PHOTO)
					{
						if (this.offers[index].MORE_PHOTO.hasOwnProperty(i))
						{
							this.obPictSlider.appendChild(
								BX.create('SPAN', {
									props: {className: 'product-item-image-slide item' + (i == 0 ? ' active' : '')},
									style: {backgroundImage: 'url(' + this.offers[index].MORE_PHOTO[i].SRC + ')'}
								})
							);
						}
					}

					// fill slider indicator if exists
					if (this.obPictSliderIndicator)
					{
						BX.cleanNode(this.obPictSliderIndicator);

						for (i in this.offers[index].MORE_PHOTO)
						{
							if (this.offers[index].MORE_PHOTO.hasOwnProperty(i))
							{
								this.obPictSliderIndicator.appendChild(
									BX.create('DIV', {
										attrs: {'data-go-to': i},
										props: {className: 'product-item-image-slider-control' + (i == 0 ? ' active' : '')}
									})
								);
								this.obPictSliderIndicator.appendChild(document.createTextNode(' '));
							}
						}

						this.obPictSliderIndicator.style.display = '';
					}

					if (this.obPictSliderProgressBar)
					{
						this.obPictSliderProgressBar.style.display = '';
					}

					// show slider container
					this.obPictSlider.style.display = '';
					this.initializeSlider();
				}
				else
				{
					// hide slider container
					if (this.obPictSlider)
					{
						this.obPictSlider.style.display = 'none';
					}

					if (this.obPictSliderIndicator)
					{
						this.obPictSliderIndicator.style.display = 'none';
					}

					if (this.obPictSliderProgressBar)
					{
						this.obPictSliderProgressBar.style.display = 'none';
					}

					// show pict and pict_second containers
					if (this.obPict)
					{
						if (this.offers[index].PREVIEW_PICTURE)
						{
							BX.adjust(this.obPict, {style: {backgroundImage: 'url(' + this.offers[index].PREVIEW_PICTURE.SRC + ')'}});
						}
						else
						{
							BX.adjust(this.obPict, {style: {backgroundImage: 'url(' + this.defaultPict.pict.SRC + ')'}});
						}

						this.obPict.style.display = '';
					}

					if (this.secondPict && this.obSecondPict)
					{
						if (this.offers[index].PREVIEW_PICTURE_SECOND)
						{
							BX.adjust(this.obSecondPict, {style: {backgroundImage: 'url(' + this.offers[index].PREVIEW_PICTURE_SECOND.SRC + ')'}});
						}
						else if (this.offers[index].PREVIEW_PICTURE.SRC)
						{
							BX.adjust(this.obSecondPict, {style: {backgroundImage: 'url(' + this.offers[index].PREVIEW_PICTURE.SRC + ')'}});
						}
						else if (this.defaultPict.secondPict)
						{
							BX.adjust(this.obSecondPict, {style: {backgroundImage: 'url(' + this.defaultPict.secondPict.SRC + ')'}});
						}
						else
						{
							BX.adjust(this.obSecondPict, {style: {backgroundImage: 'url(' + this.defaultPict.pict.SRC + ')'}});
						}

						this.obSecondPict.style.display = '';
					}
				}

				if (this.showSkuProps && this.obSkuProps)
				{
					if (this.offers[index].DISPLAY_PROPERTIES.length)
					{
						BX.adjust(this.obSkuProps, {style: {display: ''}, html: this.offers[index].DISPLAY_PROPERTIES});
					}
					else
					{
						BX.adjust(this.obSkuProps, {style: {display: 'none'}, html: ''});
					}
				}

				this.quantitySet(index);
				this.setPrice();
				
				this.setCompared(this.offers[index].COMPARED);
				this.setDelayed(this.offers[index].DELAY);
				this.offerNum = index;
			}
		},

		checkPriceRange: function(quantity)
		{
			if (typeof quantity === 'undefined'|| this.currentPriceMode != 'Q')
				return;

			var range, found = false;

			for (var i in this.currentQuantityRanges)
			{
				if (this.currentQuantityRanges.hasOwnProperty(i))
				{
					range = this.currentQuantityRanges[i];

					if (
						parseInt(quantity) >= parseInt(range.SORT_FROM)
						&& (
							range.SORT_TO == 'INF'
							|| parseInt(quantity) <= parseInt(range.SORT_TO)
						)
					)
					{
						found = true;
						this.currentQuantityRangeSelected = range.HASH;
						break;
					}
				}
			}

			if (!found && (range = this.getMinPriceRange()))
			{
				this.currentQuantityRangeSelected = range.HASH;
			}

			for (var k in this.currentPrices)
			{
				if (this.currentPrices.hasOwnProperty(k))
				{
					if (this.currentPrices[k].QUANTITY_HASH == this.currentQuantityRangeSelected)
					{
						this.currentPriceSelected = k;
						break;
					}
				}
			}
		},

		getMinPriceRange: function()
		{
			var range;

			for (var i in this.currentQuantityRanges)
			{
				if (this.currentQuantityRanges.hasOwnProperty(i))
				{
					if (
						!range
						|| parseInt(this.currentQuantityRanges[i].SORT_FROM) < parseInt(range.SORT_FROM)
					)
					{
						range = this.currentQuantityRanges[i];
					}
				}
			}

			return range;
		},

		checkQuantityControls: function()
		{
			if (!this.obQuantity)
				return;

			var reachedTopLimit = this.checkQuantity && parseFloat(this.obQuantity.value) + this.stepQuantity > this.maxQuantity,
				reachedBottomLimit = parseFloat(this.obQuantity.value) - this.stepQuantity < this.minQuantity;

			if (reachedTopLimit)
			{
				BX.addClass(this.obQuantityUp, 'product-item-amount-field-btn-disabled');
			}
			else if (BX.hasClass(this.obQuantityUp, 'product-item-amount-field-btn-disabled'))
			{
				BX.removeClass(this.obQuantityUp, 'product-item-amount-field-btn-disabled');
			}

			if (reachedBottomLimit)
			{
				BX.addClass(this.obQuantityDown, 'product-item-amount-field-btn-disabled');
			}
			else if (BX.hasClass(this.obQuantityDown, 'product-item-amount-field-btn-disabled'))
			{
				BX.removeClass(this.obQuantityDown, 'product-item-amount-field-btn-disabled');
			}

			if (reachedTopLimit && reachedBottomLimit)
			{
				this.obQuantity.setAttribute('disabled', 'disabled');
			}
			else
			{
				this.obQuantity.removeAttribute('disabled');
			}
		},

		setPrice: function()
		{
			var obData, price;

			if (this.obQuantity)
			{
				this.checkPriceRange(this.obQuantity.value);
			}

			this.checkQuantityControls();

			price = this.currentPrices[this.currentPriceSelected];

			if (this.obPrice)
			{
				if (price)
				{
					BX.adjust(this.obPrice, {html: BX.Currency.currencyFormat(price.RATIO_PRICE, price.CURRENCY, true)});
				}
				else
				{
					BX.adjust(this.obPrice, {html: ''});
				}

				if (this.showOldPrice && this.obPriceOld)
				{
					if (price && price.RATIO_PRICE !== price.RATIO_BASE_PRICE)
					{
						BX.adjust(this.obPriceOld, {
							style: {display: ''},
							html: BX.Currency.currencyFormat(price.RATIO_BASE_PRICE, price.CURRENCY, true)
						});
					}
					else
					{
						BX.adjust(this.obPriceOld, {
							style: {display: 'none'},
							html: ''
						});
					}
				}

				if (this.obPriceTotal)
				{
					if (price && this.obQuantity && this.obQuantity.value != this.stepQuantity)
					{
						BX.adjust(this.obPriceTotal, {
							html: BX.message('PRICE_TOTAL_PREFIX') + ' <strong>'
							+ BX.Currency.currencyFormat(price.PRICE * this.obQuantity.value, price.CURRENCY, true)
							+ '</strong>',
							style: {display: ''}
						});
					}
					else
					{
						BX.adjust(this.obPriceTotal, {
							html: '',
							style: {display: 'none'}
						});
					}
				}

				if (this.showPercent)
				{
					if (price && parseInt(price.DISCOUNT) > 0)
					{
						obData = {style: {display: ''}, html: -price.PERCENT + '%'};
					}
					else
					{
						obData = {style: {display: 'none'}, html: ''};
					}

					if (this.obDscPerc)
					{
						BX.adjust(this.obDscPerc, obData);
					}

					if (this.obSecondDscPerc)
					{
						BX.adjust(this.obSecondDscPerc, obData);
					}
				}
			}
		},

		compare: function(event)
		{
			/*var checkbox = this.obCompare.querySelector('[data-entity="compare-checkbox"]'),
				target = BX.getEventTarget(event),
				checked = true;

			if (checkbox)
			{
				checked = target === checkbox ? checkbox.checked : !checkbox.checked;
			}*/

            var checked = !this.obCompare.classList.contains("active") ? 1 : 0;

            console.log(this.compareData);
			//var url = checked ? this.compareData.compareUrl : this.compareData.compareDeleteUrl,
			var url = !this.obCompare.classList.contains("active") ? this.compareData.compareUrl : this.compareData.compareDeleteUrl,
				compareLink;

			if (url)
			{
				//if (target !== checkbox) {
					BX.PreventDefault(event);
					this.setCompared(checked);
				//}

				switch (this.productType)
				{
					case 0: // no catalog
					case 1: // product
					case 2: // set
						compareLink = url.replace('#ID#', this.product.id.toString());
						break;
					case 3: // sku
						compareLink = url.replace('#ID#', this.offers[this.offerNum].ID);
						break;
				}

				BX.ajax({
					method: 'POST',
					dataType: checked ? 'json' : 'html',
					url: compareLink + (compareLink.indexOf('?') !== -1 ? '&' : '?') + 'ajax_action=Y',
					onsuccess: checked
						? BX.proxy(this.compareResult, this)
						: BX.proxy(this.compareDeleteResult, this)
				});
			}
		},

		compareResult: function(result)
		{
			var popupContent, popupButtons;

			if (this.obPopupWin)
			{
				this.obPopupWin.close();
			}

			if (!BX.type.isPlainObject(result))
				return;

			this.initPopupWindow();

			if (this.offers.length > 0)
			{
				this.offers[this.offerNum].COMPARED = result.STATUS === 'OK';
            }

			if (result.STATUS === 'OK')
			{
				BX.onCustomEvent('OnCompareChange');

				popupContent = '<div style="width: 100%; margin: 0; text-align: center;"><p>'
					+ BX.message('COMPARE_MESSAGE_OK')
					+ '</p></div>';


				if (this.showClosePopup)
				{
					popupButtons = [
						new BasketButton({
							text: BX.message('BTN_MESSAGE_COMPARE_REDIRECT'),
							events: {
								click: BX.delegate(this.compareRedirect, this)
							},
							style: {marginRight: '10px'}
						}),
						new BasketButton({
							text: BX.message('BTN_MESSAGE_CLOSE_POPUP'),
							events: {
								click: BX.delegate(this.obPopupWin.close, this.obPopupWin)
							}
						})
					];
				}
				else
				{
					popupButtons = [
						new BasketButton({
							text: BX.message('BTN_MESSAGE_COMPARE_REDIRECT'),
							events: {
								click: BX.delegate(this.compareRedirect, this)
							}
						})
					];
				}
			}
			else
			{
				popupContent = '<div style="width: 100%; margin: 0; text-align: center;"><p>'
					+ (result.MESSAGE ? result.MESSAGE : BX.message('COMPARE_UNKNOWN_ERROR'))
					+ '</p></div>';
				popupButtons = [
					new BasketButton({
						text: BX.message('BTN_MESSAGE_CLOSE'),
						events: {
							click: BX.delegate(this.obPopupWin.close, this.obPopupWin)
						}
					})
				];
			}

			this.obPopupWin.setTitleBar(BX.message('COMPARE_TITLE'));
			this.obPopupWin.setContent(popupContent);
			this.obPopupWin.setButtons(popupButtons);
			this.obPopupWin.show();
		},

		compareDeleteResult: function()
		{
			BX.onCustomEvent('OnCompareChange');

            this.obCompare.classList.remove("active");

			if (this.offers && this.offers.length)
			{
				this.offers[this.offerNum].COMPARED = false;
			}
		},

		setCompared: function(state)
		{
			if (!this.obCompare)
				return;

            if (state){
                this.obCompare.classList.add("active");
            }
			else
				this.obCompare.classList.remove("active");

			/*var checkbox = this.obCompare.querySelector('[data-entity="compare-checkbox"]');
			if (checkbox)
			{
				checkbox.checked = state;
			}*/
		},

		setCompareInfo: function(comparedIds)
		{
			if (!BX.type.isArray(comparedIds))
				return;

			for (var i in this.offers)
			{
				if (this.offers.hasOwnProperty(i))
				{
					this.offers[i].COMPARED = BX.util.in_array(this.offers[i].ID, comparedIds);
				}
			}
		},

		compareRedirect: function()
		{
			if (this.compareData.comparePath)
			{
				location.href = this.compareData.comparePath;
			}
			else
			{
				this.obPopupWin.close();
			}
		},

		checkDeletedCompare: function(id)
		{
			switch (this.productType)
			{
				case 0: // no catalog
				case 1: // product
				case 2: // set
					if (this.product.id == id)
					{
						this.setCompared(false);
					}

					break;
				case 3: // sku
					var i = this.offers.length;
					while (i--)
					{
						if (this.offers[i].ID == id)
						{
							this.offers[i].COMPARED = false;

							if (this.offerNum == i)
							{
								this.setCompared(false);
							}

							break;
						}
					}
			}
		},



        delay: function(event)
        {
            /*var checkbox = this.obDelay.querySelector('[data-entity="delay-checkbox"]'),
             target = BX.getEventTarget(event),
             checked = true;

             if (checkbox)
             {
             checked = target === checkbox ? checkbox.checked : !checkbox.checked;
             }*/

            var checked = !this.obDelay.classList.contains("active") ? 1 : 0;

            //var url = checked ? this.delayData.delayUrl : this.delayData.delayDeleteUrl,
            var url = !this.obDelay.classList.contains("active") ? this.delayData.delayUrl : this.delayData.delayDeleteUrl,
                delayLink;

            if (url)
            {
                //if (target !== checkbox) {
                BX.PreventDefault(event);
                this.setDelayed(checked);
                //}

                switch (this.productType)
                {
                    case 0: // no catalog
                    case 1: // product
                    case 2: // set
                        delayLink = url.replace('#ID#', this.product.id.toString());
                        break;
                    case 3: // sku
                        delayLink = url.replace('#ID#', this.offers[this.offerNum].ID);
                        break;
                }

                BX.ajax({
                    method: 'POST',
                    dataType: checked ? 'json' : 'html',
                    url: delayLink,
                    onsuccess: checked
                        ? BX.proxy(this.delayResult, this)
                        : BX.proxy(this.delayDeleteResult, this)
                });
            }
        },

        delayResult: function(result)
        {
            var popupContent, popupButtons;

            if (this.obPopupWin)
            {
                this.obPopupWin.close();
            }

            if (result){
                var status = 'OK';
            } else {

            }

            //if (!BX.type.isPlainObject(result))
            //    return;

            this.initPopupWindow();

            if (this.offers.length > 0)
            {
                this.offers[this.offerNum].DELAY = status === 'OK';
            }

            if (status === 'OK')
            {
                BX.onCustomEvent('OnDelayChange');
				this.delayChange(result);

                popupContent = '<div style="width: 100%; margin: 0; text-align: center;"><p>'
                + BX.message('DELAY_MESSAGE_OK')
                + '</p></div>';


                if (this.showClosePopup)
                {
                    popupButtons = [
                        new BasketButton({
                            text: BX.message('BTN_MESSAGE_DELAY_REDIRECT'),
                            events: {
                                click: BX.delegate(this.delayRedirect, this)
                            },
                            style: {marginRight: '10px'}
                        }),
                        new BasketButton({
                            text: BX.message('BTN_MESSAGE_CLOSE_POPUP'),
                            events: {
                                click: BX.delegate(this.obPopupWin.close, this.obPopupWin)
                            }
                        })
                    ];
                }
                else
                {
                    popupButtons = [
                        new BasketButton({
                            text: BX.message('BTN_MESSAGE_DELAY_REDIRECT'),
                            events: {
                                click: BX.delegate(this.delayRedirect, this)
                            }
                        })
                    ];
                }
            }
            else
            {
                popupContent = '<div style="width: 100%; margin: 0; text-align: center;"><p>'
                + (result.MESSAGE ? result.MESSAGE : BX.message('DELAY_UNKNOWN_ERROR'))
                + '</p></div>';
                popupButtons = [
                    new BasketButton({
                        text: BX.message('BTN_MESSAGE_CLOSE'),
                        events: {
                            click: BX.delegate(this.obPopupWin.close, this.obPopupWin)
                        }
                    })
                ];
            }

            this.obPopupWin.setTitleBar(BX.message('DELAY_TITLE'));
            this.obPopupWin.setContent(popupContent);
            this.obPopupWin.setButtons(popupButtons);
            this.obPopupWin.show();
        },

        delayDeleteResult: function(result)
        {
            BX.onCustomEvent('OnDelayChange');
			
			if (result)
				this.delayChange(result);
			else
				this.delayChange();

            this.obDelay.classList.remove("active");

            if (this.offers && this.offers.length)
            {
                this.offers[this.offerNum].DELAY = false;
            }
        },
		
		delayChange: function(result)
		{
			var obCountDelay = BX("count_delay"),
				obCountDelayMobile = BX("count_delay_mobile");
			
			if (obCountDelay)
				this.delayChangeObject(obCountDelay, result);
			
			if (obCountDelayMobile)
				this.delayChangeObject(obCountDelayMobile, result);
		},
		
		delayChangeObject: function(object, result)
		{
			if (result)
			{
				object.style.display = "block";
				object.innerHTML = result;
			}
			else
			{
				object.style.display = "none";
				object.innerHTML = '';
			}
		},

        setDelayed: function(state)
        {
            if (!this.obDelay)
                return;

            if (state){
                this.obDelay.classList.add("active");
            }
			else
				this.obDelay.classList.remove("active");

            /*var checkbox = this.obCompare.querySelector('[data-entity="delay-checkbox"]');
             if (checkbox)
             {
             checkbox.checked = state;
             }*/
        },

        setDelayInfo: function(delayedIds)
        {
            if (!BX.type.isArray(delayedIds))
                return;

            for (var i in this.offers)
            {
                if (this.offers.hasOwnProperty(i))
                {
                    this.offers[i].DELAY = BX.util.in_array(this.offers[i].ID, delayedIds);
                }
            }
        },

        delayRedirect: function()
        {
            if (this.delayData.delayPath)
            {
                location.href = this.delayData.delayPath;
            }
            else
            {
                this.obPopupWin.close();
            }
        },

        checkDeletedDelay: function(id)
        {
            switch (this.productType)
            {
                case 0: // no catalog
                case 1: // product
                case 2: // set
                    if (this.product.id == id)
                    {
                        this.setDelayed(false);
                    }

                    break;
                case 3: // sku
                    var i = this.offers.length;
                    while (i--)
                    {
                        if (this.offers[i].ID == id)
                        {
                            this.offers[i].DELAY = false;

                            if (this.offerNum == i)
                            {
                                this.setDelayed(false);
                            }

                            break;
                        }
                    }
            }
        },





		initBasketUrl: function()
		{
			this.basketUrl = (this.basketMode === 'ADD' ? this.basketData.add_url : this.basketData.buy_url);
			switch (this.productType)
			{
				case 1: // product
				case 2: // set
					this.basketUrl = this.basketUrl.replace('#ID#', this.product.id.toString());
					break;
				case 3: // sku
					this.basketUrl = this.basketUrl.replace('#ID#', this.offers[this.offerNum].ID);
					break;
			}
			this.basketParams = {
				'ajax_basket': 'Y'
			};
			if (this.showQuantity)
			{
				this.basketParams[this.basketData.quantity] = this.obQuantity.value;
			}
			if (this.basketData.sku_props)
			{
				this.basketParams[this.basketData.sku_props_var] = this.basketData.sku_props;
			}
		},

		fillBasketProps: function()
		{
			if (!this.visual.BASKET_PROP_DIV)
			{
				return;
			}
			var
				i = 0,
				propCollection = null,
				foundValues = false,
				obBasketProps = null;

			if (this.basketData.useProps && !this.basketData.emptyProps)
			{
				if (this.obPopupWin && this.obPopupWin.contentContainer)
				{
					obBasketProps = this.obPopupWin.contentContainer;
				}
			}
			else
			{
				obBasketProps = BX(this.visual.BASKET_PROP_DIV);
			}
			if (obBasketProps)
			{
				propCollection = obBasketProps.getElementsByTagName('select');
				if (propCollection && propCollection.length)
				{
					for (i = 0; i < propCollection.length; i++)
					{
						if (!propCollection[i].disabled)
						{
							switch (propCollection[i].type.toLowerCase())
							{
								case 'select-one':
									this.basketParams[propCollection[i].name] = propCollection[i].value;
									foundValues = true;
									break;
								default:
									break;
							}
						}
					}
				}
				propCollection = obBasketProps.getElementsByTagName('input');
				if (propCollection && propCollection.length)
				{
					for (i = 0; i < propCollection.length; i++)
					{
						if (!propCollection[i].disabled)
						{
							switch (propCollection[i].type.toLowerCase())
							{
								case 'hidden':
									this.basketParams[propCollection[i].name] = propCollection[i].value;
									foundValues = true;
									break;
								case 'radio':
									if (propCollection[i].checked)
									{
										this.basketParams[propCollection[i].name] = propCollection[i].value;
										foundValues = true;
									}
									break;
								default:
									break;
							}
						}
					}
				}
			}
			if (!foundValues)
			{
				this.basketParams[this.basketData.props] = [];
				this.basketParams[this.basketData.props][0] = 0;
			}
		},

		add2Basket: function()
		{
			this.basketMode = 'ADD';
			this.basket();
		},

		buyBasket: function()
		{
			this.basketMode = 'BUY';
			this.basket();
		},

		sendToBasket: function()
		{
			if (!this.canBuy)
			{
				return;
			}

			// check recommendation
			if (this.product && this.product.id && this.bigData)
			{
				this.rememberProductRecommendation();
			}

			this.initBasketUrl();
			this.fillBasketProps();
			BX.ajax({
				method: 'POST',
				dataType: 'json',
				url: this.basketUrl,
				data: this.basketParams,
				onsuccess: BX.proxy(this.basketResult, this)
			});
		},

		basket: function()
		{
			var contentBasketProps = '';
			if (!this.canBuy)
			{
				return;
			}
			switch (this.productType)
			{
				case 1: // product
				case 2: // set
					if (this.basketData.useProps && !this.basketData.emptyProps)
					{
						this.initPopupWindow();
						this.obPopupWin.setTitleBar(BX.message('TITLE_BASKET_PROPS'));
						if (BX(this.visual.BASKET_PROP_DIV))
						{
							contentBasketProps = BX(this.visual.BASKET_PROP_DIV).innerHTML;
						}
						this.obPopupWin.setContent(contentBasketProps);
						this.obPopupWin.setButtons([
							new BasketButton({
								text: BX.message('BTN_MESSAGE_SEND_PROPS'),
								events: {
									click: BX.delegate(this.sendToBasket, this)
								}
							})
						]);
						this.obPopupWin.show();
					}
					else
					{
						this.sendToBasket();
					}
					break;
				case 3: // sku
					this.sendToBasket();
					break;
			}
		},

		basketResult: function(arResult)
		{
			var strContent = '',
				strPict = '',
				successful,
				buttons = [];

			if (this.obPopupWin)
				this.obPopupWin.close();

			if (!BX.type.isPlainObject(arResult))
				return;

			successful = arResult.STATUS === 'OK';

			if (successful)
			{
				this.setAnalyticsDataLayer('addToCart');
			}

			if (successful && this.basketAction === 'BUY')
			{
				this.basketRedirect();
			}
			else
			{
				this.initPopupWindow();

				if (successful)
				{
					BX.onCustomEvent('OnBasketChange');

					if  (BX.findParent(this.obProduct, {className: 'bx_sale_gift_main_products'}, 10))
					{
						BX.onCustomEvent('onAddToBasketMainProduct', [this]);
					}

					switch (this.productType)
					{
						case 1: // product
						case 2: // set
							strPict = this.product.pict.SRC;
							break;
						case 3: // sku
							strPict = (this.offers[this.offerNum].PREVIEW_PICTURE ?
									this.offers[this.offerNum].PREVIEW_PICTURE.SRC :
									this.defaultPict.pict.SRC
							);
							break;
					}

					strContent = '<div style="width: 100%; margin: 0; text-align: center;"><img src="'
						+ strPict + '" height="130" style="max-height:130px"><p>' + this.product.name + '</p></div>';

					if (this.showClosePopup)
					{
						buttons = [
							new BasketButton({
								text: BX.message("BTN_MESSAGE_BASKET_REDIRECT"),
								events: {
									click: BX.delegate(this.basketRedirect, this)
								},
								style: {marginRight: '10px'}
							}),
							new BasketButton({
								text: BX.message("BTN_MESSAGE_CLOSE_POPUP"),
								events: {
									click: BX.delegate(this.obPopupWin.close, this.obPopupWin)
								}
							})
						];
					}
					else
					{
						buttons = [
							new BasketButton({
								text: BX.message("BTN_MESSAGE_BASKET_REDIRECT"),
								events: {
									click: BX.delegate(this.basketRedirect, this)
								}
							})
						];
					}
				}
				else
				{
					strContent = '<div style="width: 100%; margin: 0; text-align: center;"><p>'
						+ (arResult.MESSAGE ? arResult.MESSAGE : BX.message('BASKET_UNKNOWN_ERROR'))
						+ '</p></div>';
					buttons = [
						new BasketButton({
							text: BX.message('BTN_MESSAGE_CLOSE'),
							events: {
								click: BX.delegate(this.obPopupWin.close, this.obPopupWin)
							}
						})
					];
				}
				this.obPopupWin.setTitleBar(successful ? BX.message('TITLE_SUCCESSFUL') : BX.message('TITLE_ERROR'));
				this.obPopupWin.setContent(strContent);
				this.obPopupWin.setButtons(buttons);
				this.obPopupWin.show();
			}
		},

		basketRedirect: function()
		{
			location.href = (this.basketData.basketUrl ? this.basketData.basketUrl : BX.message('BASKET_URL'));
		},

		initPopupWindow: function()
		{
			if (this.obPopupWin)
				return;

			this.obPopupWin = BX.PopupWindowManager.create('CatalogSectionBasket_' + this.visual.ID, null, {
				autoHide: true,
				offsetLeft: 0,
				offsetTop: 0,
				overlay : true,
				closeByEsc: true,
				titleBar: true,
				closeIcon: true,
				contentColor: 'white',
				className: this.templateTheme ? 'bx-' + this.templateTheme : ''
			});
		}
	};
})(window);
/* End */
;
; /* Start:"a:4:{s:4:"full";s:100:"/bitrix/components/bitrix/catalog.product.subscribe/templates/.default/script.min.js?155419794811818";s:6:"source";s:80:"/bitrix/components/bitrix/catalog.product.subscribe/templates/.default/script.js";s:3:"min";s:84:"/bitrix/components/bitrix/catalog.product.subscribe/templates/.default/script.min.js";s:3:"map";s:84:"/bitrix/components/bitrix/catalog.product.subscribe/templates/.default/script.map.js";}"*/
(function(e){if(!!e.JCCatalogProductSubscribe){return}var t=function(e){t.superclass.constructor.apply(this,arguments);this.nameNode=BX.create("span",{props:{id:this.id},style:typeof e.style==="object"?e.style:{},text:e.text});this.buttonNode=BX.create("span",{attrs:{className:e.className},style:{marginBottom:"0",borderBottom:"0 none transparent"},children:[this.nameNode],events:this.contextEvents});if(BX.browser.IsIE()){this.buttonNode.setAttribute("hideFocus","hidefocus")}};BX.extend(t,BX.PopupWindowButton);e.JCCatalogProductSubscribe=function(e){this.buttonId=e.buttonId;this.buttonClass=e.buttonClass;this.jsObject=e.jsObject;this.ajaxUrl="/bitrix/components/bitrix/catalog.product.subscribe/ajax.php";this.alreadySubscribed=e.alreadySubscribed;this.listIdAlreadySubscribed=e.listIdAlreadySubscribed;this.urlListSubscriptions=e.urlListSubscriptions;this.listOldItemId={};this.landingId=e.landingId;this.elemButtonSubscribe=null;this.elemPopupWin=null;this.defaultButtonClass="bx-catalog-subscribe-button";this._elemButtonSubscribeClickHandler=BX.delegate(this.subscribe,this);this._elemHiddenClickHandler=BX.delegate(this.checkSubscribe,this);BX.ready(BX.delegate(this.init,this))};e.JCCatalogProductSubscribe.prototype.init=function(){if(!!this.buttonId){this.elemButtonSubscribe=BX(this.buttonId);this.elemHiddenSubscribe=BX(this.buttonId+"_hidden")}if(!!this.elemButtonSubscribe){BX.bind(this.elemButtonSubscribe,"click",this._elemButtonSubscribeClickHandler)}if(!!this.elemHiddenSubscribe){BX.bind(this.elemHiddenSubscribe,"click",this._elemHiddenClickHandler)}this.setButton(this.alreadySubscribed);this.setIdAlreadySubscribed(this.listIdAlreadySubscribed)};e.JCCatalogProductSubscribe.prototype.checkSubscribe=function(){if(!this.elemHiddenSubscribe||!this.elemButtonSubscribe)return;if(this.listOldItemId.hasOwnProperty(this.elemButtonSubscribe.dataset.item)){this.setButton(true)}else{BX.ajax({method:"POST",dataType:"json",url:this.ajaxUrl,data:{sessid:BX.bitrix_sessid(),checkSubscribe:"Y",itemId:this.elemButtonSubscribe.dataset.item},onsuccess:BX.delegate(function(e){if(e.subscribe){this.setButton(true);this.listOldItemId[this.elemButtonSubscribe.dataset.item]=true}else{this.setButton(false)}},this)})}};e.JCCatalogProductSubscribe.prototype.subscribe=function(){this.elemButtonSubscribe=BX.proxy_context;if(!this.elemButtonSubscribe)return false;BX.ajax({method:"POST",dataType:"json",url:this.ajaxUrl,data:{sessid:BX.bitrix_sessid(),subscribe:"Y",itemId:this.elemButtonSubscribe.dataset.item,siteId:BX.message("SITE_ID"),landingId:this.landingId},onsuccess:BX.delegate(function(e){if(e.success){this.createSuccessPopup(e);this.setButton(true);this.listOldItemId[this.elemButtonSubscribe.dataset.item]=true}else if(e.contactFormSubmit){this.initPopupWindow();this.elemPopupWin.setTitleBar(BX.message("CPST_SUBSCRIBE_POPUP_TITLE"));var s=this.createContentForPopup(e);this.elemPopupWin.setContent(s);this.elemPopupWin.setButtons([new t({text:BX.message("CPST_SUBSCRIBE_BUTTON_NAME"),className:"btn btn-primary",events:{click:BX.delegate(function(){if(!this.validateContactField(e.contactTypeData)){return false}BX.ajax.submitAjax(s,{method:"POST",url:this.ajaxUrl,processData:true,onsuccess:BX.delegate(function(e){e=BX.parseJSON(e,{});if(e.success){this.createSuccessPopup(e);this.setButton(true);this.listOldItemId[this.elemButtonSubscribe.dataset.item]=true}else if(e.error){if(e.hasOwnProperty("setButton")){this.listOldItemId[this.elemButtonSubscribe.dataset.item]=true;this.setButton(true)}var t=e.message;if(e.hasOwnProperty("typeName")){t=e.message.replace("USER_CONTACT",e.typeName)}BX("bx-catalog-subscribe-form-notify").style.color="red";BX("bx-catalog-subscribe-form-notify").innerHTML=t}},this)})},this)}}),new t({text:BX.message("CPST_SUBSCRIBE_BUTTON_CLOSE"),className:"btn",events:{click:BX.delegate(function(){this.elemPopupWin.destroy()},this)}})]);this.elemPopupWin.show()}else if(e.error){if(e.hasOwnProperty("setButton")){this.listOldItemId[this.elemButtonSubscribe.dataset.item]=true;this.setButton(true)}this.showWindowWithAnswer({status:"error",message:e.message})}},this)})};e.JCCatalogProductSubscribe.prototype.validateContactField=function(e){var t=BX.findChildren(BX("bx-catalog-subscribe-form"),{tag:"input",attribute:{id:"userContact"}},true);if(!t.length||typeof e!=="object"){BX("bx-catalog-subscribe-form-notify").style.color="red";BX("bx-catalog-subscribe-form-notify").innerHTML=BX.message("CPST_SUBSCRIBE_VALIDATE_UNKNOW_ERROR");return false}var s,a,i,r=[],o=[];for(var c=0;c<t.length;c++){s=t[c].getAttribute("data-id");a=t[c].value;i=BX("bx-contact-use-"+s);if(i&&i.value=="N"){o.push(true);continue}if(!a.length){r.push(BX.message("CPST_SUBSCRIBE_VALIDATE_ERROR_EMPTY_FIELD").replace("#FIELD#",e[s].contactLable))}}if(t.length==o.length){BX("bx-catalog-subscribe-form-notify").style.color="red";BX("bx-catalog-subscribe-form-notify").innerHTML=BX.message("CPST_SUBSCRIBE_VALIDATE_ERROR");return false}if(r.length){BX("bx-catalog-subscribe-form-notify").style.color="red";for(var n=0;n<r.length;n++){BX("bx-catalog-subscribe-form-notify").innerHTML=r[n]}return false}return true};e.JCCatalogProductSubscribe.prototype.reloadCaptcha=function(){BX.ajax.get(this.ajaxUrl+"?reloadCaptcha=Y","",function(e){BX("captcha_sid").value=e;BX("captcha_img").src="/bitrix/tools/captcha.php?captcha_sid="+e+""})};e.JCCatalogProductSubscribe.prototype.createContentForPopup=function(e){if(!e.hasOwnProperty("contactTypeData")){return null}var t=e.contactTypeData,s=Object.keys(t).length,a="",i="N",r=document.createDocumentFragment();if(s>1){i="Y";a="display:none;";r.appendChild(BX.create("p",{text:BX.message("CPST_SUBSCRIBE_MANY_CONTACT_NOTIFY")}))}r.appendChild(BX.create("p",{props:{id:"bx-catalog-subscribe-form-notify"}}));for(var o in t){if(s>1){r.appendChild(BX.create("div",{props:{className:"bx-catalog-subscribe-form-container"},children:[BX.create("div",{props:{className:"checkbox"},children:[BX.create("lable",{props:{className:"bx-filter-param-label"},attrs:{onclick:this.jsObject+".selectContactType("+o+", event);"},children:[BX.create("input",{props:{type:"hidden",id:"bx-contact-use-"+o,name:"contact["+o+"][use]",value:"N"}}),BX.create("input",{props:{id:"bx-contact-checkbox-"+o,type:"checkbox"}}),BX.create("span",{props:{className:"bx-filter-param-text"},text:t[o].contactLable})]})]})]}))}r.appendChild(BX.create("div",{props:{id:"bx-catalog-subscribe-form-container-"+o,className:"bx-catalog-subscribe-form-container",style:a},children:[BX.create("div",{props:{className:"bx-catalog-subscribe-form-container-label"},text:BX.message("CPST_SUBSCRIBE_LABLE_CONTACT_INPUT").replace("#CONTACT#",t[o].contactLable)}),BX.create("div",{props:{className:"bx-catalog-subscribe-form-container-input"},children:[BX.create("input",{props:{id:"userContact",className:"",type:"text",name:"contact["+o+"][user]"},attrs:{"data-id":o}})]})]}))}if(e.hasOwnProperty("captchaCode")){r.appendChild(BX.create("div",{props:{className:"bx-catalog-subscribe-form-container"},children:[BX.create("span",{props:{className:"bx-catalog-subscribe-form-star-required"},text:"*"}),BX.message("CPST_ENTER_WORD_PICTURE"),BX.create("div",{props:{className:"bx-captcha"},children:[BX.create("input",{props:{type:"hidden",id:"captcha_sid",name:"captcha_sid",value:e.captchaCode}}),BX.create("img",{props:{id:"captcha_img",src:"/bitrix/tools/captcha.php?captcha_sid="+e.captchaCode+""},attrs:{width:"180",height:"40",alt:"captcha",onclick:this.jsObject+".reloadCaptcha();"}})]}),BX.create("div",{props:{className:"bx-catalog-subscribe-form-container-input"},children:[BX.create("input",{props:{id:"captcha_word",className:"",type:"text",name:"captcha_word"},attrs:{maxlength:"50"}})]})]}))}var c=BX.create("form",{props:{id:"bx-catalog-subscribe-form"},children:[BX.create("input",{props:{type:"hidden",name:"manyContact",value:i}}),BX.create("input",{props:{type:"hidden",name:"sessid",value:BX.bitrix_sessid()}}),BX.create("input",{props:{type:"hidden",name:"itemId",value:this.elemButtonSubscribe.dataset.item}}),BX.create("input",{props:{type:"hidden",name:"landingId",value:this.landingId}}),BX.create("input",{props:{type:"hidden",name:"siteId",value:BX.message("SITE_ID")}}),BX.create("input",{props:{type:"hidden",name:"contactFormSubmit",value:"Y"}})]});c.appendChild(r);return c};e.JCCatalogProductSubscribe.prototype.selectContactType=function(t,s){var a=BX("bx-catalog-subscribe-form-container-"+t),i="",r=BX("bx-contact-checkbox-"+t);if(!a){return false}if(r!=s.target){if(r.checked){r.checked=false}else{r.checked=true}}if(a.currentStyle){i=a.currentStyle.display}else if(e.getComputedStyle){var o=e.getComputedStyle(a,null);i=o.getPropertyValue("display")}if(i==="none"){BX("bx-contact-use-"+t).value="Y";BX.style(a,"display","")}else{BX("bx-contact-use-"+t).value="N";BX.style(a,"display","none")}};e.JCCatalogProductSubscribe.prototype.createSuccessPopup=function(e){this.initPopupWindow();this.elemPopupWin.setTitleBar(BX.message("CPST_SUBSCRIBE_POPUP_TITLE"));var s=BX.create("div",{props:{className:"bx-catalog-popup-content"},children:[BX.create("p",{props:{className:"bx-catalog-popup-message"},text:e.message})]});this.elemPopupWin.setContent(s);this.elemPopupWin.setButtons([new t({text:BX.message("CPST_SUBSCRIBE_BUTTON_CLOSE"),className:"btn btn-primary",events:{click:BX.delegate(function(){this.elemPopupWin.destroy()},this)}})]);this.elemPopupWin.show()};e.JCCatalogProductSubscribe.prototype.initPopupWindow=function(){this.elemPopupWin=BX.PopupWindowManager.create("CatalogSubscribe_"+this.buttonId,null,{autoHide:false,offsetLeft:0,offsetTop:0,overlay:true,closeByEsc:true,titleBar:true,closeIcon:true,contentColor:"white"})};e.JCCatalogProductSubscribe.prototype.setButton=function(e){this.alreadySubscribed=Boolean(e);if(this.alreadySubscribed){this.elemButtonSubscribe.className=this.buttonClass+" "+this.defaultButtonClass+" disabled";this.elemButtonSubscribe.innerHTML="<span>"+BX.message("CPST_TITLE_ALREADY_SUBSCRIBED")+"</span>";BX.unbind(this.elemButtonSubscribe,"click",this._elemButtonSubscribeClickHandler)}else{this.elemButtonSubscribe.className=this.buttonClass+" "+this.defaultButtonClass;this.elemButtonSubscribe.innerHTML="<span>"+BX.message("CPST_SUBSCRIBE_BUTTON_NAME")+"</span>";BX.bind(this.elemButtonSubscribe,"click",this._elemButtonSubscribeClickHandler)}};e.JCCatalogProductSubscribe.prototype.setIdAlreadySubscribed=function(e){if(BX.type.isPlainObject(e)){this.listOldItemId=e}};e.JCCatalogProductSubscribe.prototype.showWindowWithAnswer=function(e){e=e||{};if(!e.message){if(e.status=="success"){e.message=BX.message("CPST_STATUS_SUCCESS")}else{e.message=BX.message("CPST_STATUS_ERROR")}}var t=BX.create("div",{props:{className:"bx-catalog-subscribe-alert"},children:[BX.create("span",{props:{className:"bx-catalog-subscribe-aligner"}}),BX.create("span",{props:{className:"bx-catalog-subscribe-alert-text"},text:e.message}),BX.create("div",{props:{className:"bx-catalog-subscribe-alert-footer"}})]});var s=BX.PopupWindowManager.getCurrentPopup();if(s){s.destroy()}var a=setTimeout(function(){var e=BX.PopupWindowManager.getCurrentPopup();if(!e||e.uniquePopupId!="bx-catalog-subscribe-status-action"){return}e.close();e.destroy()},3500);var i=BX.PopupWindowManager.create("bx-catalog-subscribe-status-action",null,{content:t,onPopupClose:function(){this.destroy();clearTimeout(a)},autoHide:true,zIndex:2e3,className:"bx-catalog-subscribe-alert-popup"});i.show();BX("bx-catalog-subscribe-status-action").onmouseover=function(e){clearTimeout(a)};BX("bx-catalog-subscribe-status-action").onmouseout=function(e){a=setTimeout(function(){var e=BX.PopupWindowManager.getCurrentPopup();if(!e||e.uniquePopupId!="bx-catalog-subscribe-status-action"){return}e.close();e.destroy()},3500)}}})(window);
/* End */
;; /* /bitrix/templates/innet_market_s1/components/bitrix/catalog.section/catalog/script.js?15541984378298*/
; /* /bitrix/templates/innet_market_s1/components/bitrix/catalog.item/innet/script.js?155419843774336*/
; /* /bitrix/components/bitrix/catalog.product.subscribe/templates/.default/script.min.js?155419794811818*/

//# sourceMappingURL=page_5803403a2704d6af697fbc814ad05f74.map.js