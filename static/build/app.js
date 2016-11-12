//https://github.com/asvd/dragscroll
(function (window, document) {

    var dragged = [];
    var reset = function() {
        var i = 0, el;

        //var tables = document.querySelector('#tables');

        while (i < dragged.length) {
            el = dragged[i++];
            el = el.container || el;
            el.removeEventListener('mousedown', el.md);
            window.removeEventListener('mouseup', el.mu);
            window.removeEventListener('mousemove', el.mm);
        }

        // cloning into array since HTMLCollection is updated dynamically
        dragged = [ document.documentElement, document.body ];
        for (i = 0; i < dragged.length;) {
            (function(el) {
                var lastClientX, lastClientY, pushed, scroller;
                var container = el.container || el;
                
                //mouse down
                container.addEventListener('mousedown', container.md = function(ev) {
                    if (ev.button === 0 && (!el.hasAttribute('nochilddrag') || document.elementFromPoint(ev.pageX, ev.pageY) == container)) {
                        pushed = 1;
                        lastClientX = ev.clientX;
                        lastClientY = ev.clientY;

                        ev.preventDefault();
                    }
                });

                //mouse up
                window.addEventListener('mouseup', container.mu = function() {
                    pushed = 0;
                });

                //mouse move
                window.addEventListener('mousemove', container.mm = function(ev) {
                    if (pushed) {
                        scroller = el.scroller || el;

                        var newLeft = scroller.scrollLeft - ((lastClientX * -1) + (ev.clientX));
                        var newTop = scroller.scrollTop - ((lastClientY * -1) + ( ev.clientY));

                        scroller.scrollLeft = newLeft;
                        lastClientX = ev.clientX;

                        scroller.scrollTop = newTop;
                        lastClientY = ev.clientY;
                    }
                });
            })(dragged[i++]);
        }
    };

    if (document.readyState == 'complete') {
        reset();
    } else {
        window.addEventListener('load', reset, 0);
    }
})(window, document);
(function(window, document, localStorage) {

    var i, j, scrolled;

    var responsiveBreakpoints = {
        COMPACT: 690
    };


    var documentElement = document.documentElement;

    var filterTypes = {
        PERIOD: 'period', GROUP: 'group', BLOCK: 'block', CATEGORY: 'category', STATE: 'state', YEAR: 'year', FIND: 'find'
    };

    var units = {
        C: 'c',
        F: 'f',
        K: 'k'
    };

    var titles = {
        am: 'Relative atmoic mass',
        an: 'Atomic number'
    };

    var css = {
        FILTERED: 'filtered',
        FILTERING: 'filtering',
        UNFILTERED: 'unfiltered'
    };

    var wrapSize = {
        width: 25000,
        height: 15000
    };

    var nodes = {
        header: document.querySelector('header'),
        wrap: document.querySelector('#wrap'),
        toggleAbout: document.querySelector('#toggle-about'),
        toggleFilters: document.querySelector('#toggle-filters'),
        filters: document.querySelector('#filters'),
        zoom: document.querySelector('[zoom]'),
        tables: document.querySelector('#tables'),
        elements: document.querySelectorAll('td[s]'),
        temp: document.querySelector('#temp'),
        find: document.querySelector('#find'),
        year: document.querySelector('#year'),
        findReset: document.querySelector('#find-reset'),
        yearReset: document.querySelector('#year-reset')
    };
    nodes.tempUnit = nodes.temp.nextElementSibling;

    var model = {
        loadedArea: { y: documentElement.clientHeight, x: documentElement.clientWidth },
        zoom: parseInt(nodes.zoom.getAttribute('zoom')),
        temp: 298,
        tempUnit: localStorage.tempUnit || 'k',

        filter: {
            year: new Date().getFullYear(),
            find: '',
            group: [],
            block: [],
            period: [],
            category: [],
            state: []
        }
    };
    model.init = function() {

        //build up a list of elements in memory from the initial information in the dom
        var node, elements = {};
        for(i = 0; i < nodes.elements.length; i++) {
            node = nodes.elements[i];
            var select = node.querySelector.bind(node);
            var cat = node.getAttribute('c');
            var year = parseInt(node.getAttribute('y'));
            var isActinideOrLanthanide = cat === 'l' || cat === 'a';
            var nodeIndex = getElIndex(node);
            var temps = node.getAttribute('t').split(',');
            var el = elements[node.getAttribute('s')] = {
                zoomAvailable: model.zoom,
                node: node,
                c: cat,
                y: year,
                s: select('.s'),
                n: select('.n'),
                an: select('.an'),
                am: select('.am'),
                d: select('.d'),
                md: select('.md'),
                r: select('.r'),
                g: isActinideOrLanthanide ? cat : nodeIndex,
                p: !isActinideOrLanthanide ? getElIndex(node.parentNode) : null,
                b: isActinideOrLanthanide ? 'f' : (nodeIndex < 3 ? 's' : (nodeIndex < 13 ? 'd' : 'p')),
                mp: temps[0] || null,
                bp: temps[1] || null
            };

            //add title
            addTitle(el, 'an');
            addTitle(el, 'am');
        }
        model.elements = elements;
    };
    model.zoomWith = function(mod, point) {
        if((mod < 0 && model.zoom > 0) || (mod > 0 && model.zoom < 4)) {
            model.zoom = model.zoom + mod;
            view.zoomTo(mod, point);
        }
    };
    model.zoomTo = function(to, point) {
        var mod = to - model.zoom;
        model.zoomWith(mod, point)
    };
    model.addFieldsForElement = function(data) {
        var el = model.elements[data.symbol];
        el.zoomAvailable = Math.max(el.zoomAvailable, model.zoom);
        view.injectFieldsForElement(data);
    };


    function addOrRemoveFromArray(arr, value) {
        var index = arr.indexOf(value);
        if(index > -1) {
            arr.splice(index, 1);
        } else {
            arr.push(value);
        }
    }

    model.updateFilter = function(type, value) {

        //group
        if(type === filterTypes.GROUP ||
            type === filterTypes.PERIOD ||
            type === filterTypes.CATEGORY ||
            type === filterTypes.BLOCK ||
            type === filterTypes.STATE) {
            addOrRemoveFromArray(model.filter[type], value);
        }

        //find
        else if(type === filterTypes.FIND) {
            model.filter.find = (value && value.toLowerCase().trim()) || '';
        }

        //year
        else if(type === filterTypes.YEAR) {
            if(!isNaN(parseInt(value))) {
                model.filter.year = parseInt(value);
            }
        }

        view.applyFilter();

        if(window.ga) {
            window.ga(function(tracker) {
                tracker.send('action', 'Filter', JSON.stringify(model.filter[type]));
            });
        }
    };

    model.resetPositionFilter = function() {
        model.filter.group = [];
        model.filter.period = [];
        model.filter.block = [];
        view.applyFilter();
    };


    // view ------------------------------------------------------------------------------------------------------------

    var view = {};
    view.origin = null;
    //init
    view.init = function() {

        //set up viewport
        document.body.style.overflow = 'ontouchstart' in window || navigator.maxTouchPoints ? 'auto' : 'hidden';

        nodes.wrap.style.width = toPx(wrapSize.width);
        nodes.wrap.style.height = toPx(wrapSize.height);

        //enable filters
        nodes.filters.style.display = 'block';

        view.center();

        view.fitToScreen();
        window.addEventListener('resize', view.fitToScreen);

        //add header titles
        function addCellHeaderTitle(name) {
            var title, inputs = document.querySelectorAll('input[name="' + name.toLowerCase() + '"]');
            for(i = 0; i < inputs.length; i++) {
                title = name + ' ' + inputs[i].value;
                inputs[i].nextElementSibling.setAttribute('title', title);
            }
        }
        addCellHeaderTitle('Group');
        addCellHeaderTitle('Period');
        addCellHeaderTitle('Block');

        //initialize state and temperature
        nodes.tempUnit.value = model.tempUnit;
        view.tempUnitChanged();

        //initialize year
        nodes.year.value = model.filter.year;

        //initial help display
        if(!localStorage.skipAbout) {
            nodes.toggleAbout.checked = true;
            localStorage.skipAbout = 'y'
        }
    };

    view.center = function () {
        var tl, tt, tw, th,
            ww, wh,
            vw, vh,
            tables;

        vw = window.innerWidth;
        vh = window.innerHeight;

        ww = wrapSize.width;
        wh = wrapSize.height;

        tables = rect(nodes.tables);
        tw = tables.width;
        th = tables.height;

        tl = (ww - tw) / 2;
        tt = (wh - th) / 2;

        nodes.tables.style.transformOrigin = '0 0';
        nodes.tables.style.left = toPx(tl);
        nodes.tables.style.top = toPx(tt);

        window.scrollTo(
            tables.width > vw ? tl : (ww - vw) / 2,
            tables.height > vh ? tt : (wh - vh) / 2
        );
    };

    view.fitToScreen = function() {
        var windowWidth = window.innerWidth;
        var detailsWidth =
            windowWidth < responsiveBreakpoints.COMPACT ?
            (((window.innerWidth - 50) / (nodes.tables.querySelector('td').offsetWidth * 10)) * 100) + '%' :
                '100%';

        var cssRules = document.styleSheets[0].cssRules;
        var cssRulesArray = Array.prototype.slice.call(cssRules);
        var detailsRule = cssRulesArray.filter(function(rule) {
            return rule.selectorText === '[zoom="4"] .details';
        })[0];
        var resourcesRule = cssRulesArray.filter(function(rule) {
            return rule.selectorText === '[zoom="4"] .r';
        })[0];
        
        if(detailsRule && resourcesRule) {
            detailsRule.style.width = detailsWidth;
            resourcesRule.style.width = detailsWidth;            
        } else {
            console.warn('Could not find rules to update for fit-to-screen');
        }
    };

    view.tempChanged = function () {
        var temp = parseInt(nodes.temp.value);
        if(isNaN(temp)) {
            temp = model.temp;
        }
        model.temp = model.tempUnit === units.C ? temp + 273.15 : (model.tempUnit === units.F ? (temp + 459.67) * 5/9 : temp);
        view.applyFilter();
    };

    view.tempUnitChanged = function() {
        model.tempUnit = nodes.tempUnit.value;
        var temp = model.tempUnit === units.C ? model.temp - 273.15 : (model.tempUnit === units.F ? model.temp * 9/5 - 459.67 : model.temp);
        nodes.temp.value = Math.round(temp);
        localStorage.tempUnit = model.tempUnit;
    };

    view.zoomTo = function (dir, point) {

        var tables = nodes.tables;

        view.origin = dir < 0 && view.origin ? view.origin : {
            x: (((rect(tables).left * -1) + point.x) / (rect(tables).width)),
            y: (((rect(tables).top * -1) + point.y) / (rect(tables).height))
        };

        nodes.tables.style.transformOrigin = (view.origin.x * 100) + '% ' + (view.origin.y * 100) + '%';

        //correct scroll position for transform origin
        var dx = (tables.offsetLeft + view.origin.x * tables.offsetWidth) - (window.pageXOffset + point.x);
        var dy = (tables.offsetTop + view.origin.y * tables.offsetHeight) - (window.pageYOffset + point.y);
        window.scrollBy(dx, dy);

        nodes.zoom.setAttribute('zoom', model.zoom);
        view.panTo(dir);
        history.replaceState(null, '', '?z=' + model.zoom);

        if(window.ga) {
            window.ga(function(tracker) {
                tracker.send('action', 'Zoom', dir);
            });
        }
    };

    view.panTo = function (dir) {
        var zoom = model.zoom;
        var symbolsToFetch = [],symbolsToShow = [];
        if(!dir || dir > 0) {
            //only load elements currently in the viewport
            symbolsToShow = Object.keys(model.elements).reduce(function(toShow, symbol) {
                if(inViewport(model.elements[symbol].node)) {
                    toShow.push(symbol);
                }
                return toShow;
            }, []);
            symbolsToFetch = symbolsToShow.reduce(function(toShow, symbol) {
                if(model.elements[symbol].zoomAvailable < zoom) {
                    model.elements[symbol].zoomAvailable = zoom;
                    toShow.push(symbol);
                }
                return toShow;
            }, []);
        }
        if(symbolsToFetch.length) {
            fetch('/fields?z=' + zoom + '&s=' + encodeURIComponent(JSON.stringify(symbolsToFetch)), function (data) {
                data.forEach(model.addFieldsForElement);
            });
        }
    };

    view.injectFieldsForElement = function(data) {
        function inject(data, fieldNames) {
            for(i = 0; i < fieldNames.length; i++) {
                var node = model.elements[data.symbol].node;
                if(!node.querySelectorAll('.' + fieldNames[i]).length) {
                    var wrapper = document.createElement('div');
                    wrapper.innerHTML = data[fieldNames[i]];
                    var inject = wrapper.firstChild;
                    node.firstElementChild.appendChild(inject);
                    model.elements[data.symbol][fieldNames[i]] = inject;
                    addTitle(model.elements[data.symbol], fieldNames[i]);
                }
            }
        }

        if(model.zoom === 1) {
            inject(data, ['an' ]);
        }
        if(model.zoom === 2) {
            inject(data, ['n', 'am']);
        }
        if(model.zoom === 3) {
            inject(data, ['n', 'am', 'd']);
        }
        if(model.zoom === 4) {
            inject(data, ['n', 'am', 'd', 'md', 'r']);
        }
    };

    view.applyFilter = function() {

        nodes.tables.classList.add(css.FILTERING);

        var match, matchGroup, matchPeriod, matchBlock, matchPosition, matchCategory, matchFind, matchYear, matchState;
        var positionFilterOn;
        var filter = model.filter;
        var elements = model.elements;
        var symbols = Object.keys(elements);
        for(i = 0; i < symbols.length; i++) {
            var el = elements[symbols[i]];

            //checkbox groups
            positionFilterOn = filter.group.length || filter.period.length || filter.block.length;
            matchGroup = positionFilterOn && filter.group.indexOf(el.g + '') > -1;
            matchPeriod = positionFilterOn && filter.period.indexOf(el.p + '') > -1;
            matchBlock = positionFilterOn && filter.block.indexOf(el.b) > -1;
            matchPosition = !positionFilterOn || (matchGroup || matchPeriod || matchBlock);

            matchCategory = !filter.category.length || filter.category.indexOf(el.c) > -1;

            //find
            matchFind =
                !filter.find ||
                ((el.s.textContent.toLowerCase().indexOf(filter.find) === 0 ||
                el.s.getAttribute('title').toLowerCase().indexOf(filter.find) === 0));

            //year
            matchYear = !filter.year || ((isNaN(el.y) || el.y <= filter.year));

            //state
            matchState = !filter.state.length ||
                ((filter.state.indexOf('gas') > -1 &&  el.bp && el.bp < model.temp ) ||
                (filter.state.indexOf('liquid') > -1 &&  el.mp && el.bp && el.mp < model.temp && el.bp > model.temp) ||
                (filter.state.indexOf('solid') > -1 && el.mp && el.mp > model.temp));

            //overall
            match = matchPosition && matchCategory && matchFind && matchYear && matchState;
            el.node.classList.toggle(css.UNFILTERED, !match);
        }
    };

    // controller ------------------------------------------------------------------------------------------------------

    var controller = {};
    controller.init = function() {

        nodes.filters.onmousedown = function(ev) {
            ev.stopPropagation();
        };

        //filters
        document.onclick = function(ev) {
            var el = ev.target;

            //center button
            if(el.id === 'center') {
                view.center();
                ev.preventDefault();
            }

            //zoom buttons
            else if(el.tagName === 'A' && el.parentNode.id === 'zoom') {
                model.zoomWith(parseInt(el.getAttribute('value')), getCenterPoint());
                ev.preventDefault();
            }

            //resources tabs
            else if(el.tagName === 'A' && el.parentNode.parentNode.classList.contains('tabs-nav')) {
                var tabs =  el.parentNode.parentNode.children;
                for(i = 0; i < tabs.length; i++) {
                    tabs[i].style.display = tabs[i].firstElementChild === el ?
                        tabs[i].classList.add('active') : tabs[i].classList.remove('active');
                }
                var target = document.querySelector(el.getAttribute('href'));
                var panes = target.parentNode.children;
                for(i = 0; i < panes.length; i++) {
                    panes[i].style.display = panes[i] === target ? 'block' : 'none';
                    var iframePlaceholder = target.querySelector('.iframe');
                    if(iframePlaceholder) {
                        var iframe = document.createElement('iframe');
                        iframePlaceholder.parentNode.appendChild(iframe);
                        for(j = 0; j < iframePlaceholder.attributes.length; j++) {
                            iframe.setAttribute(iframePlaceholder.attributes[j].name, iframePlaceholder.attributes[j].value);
                        }
                        iframePlaceholder.parentNode.removeChild(iframePlaceholder);
                        continue;
                    }
                    var adsPlaceholder = target.querySelector('.ads');
                    if(adsPlaceholder && !adsPlaceholder.getAttribute('initialized')) {
                        var searchTerm = adsPlaceholder.getAttribute('term'),
                            searchCategory = adsPlaceholder.getAttribute('category') || 'All',
                            design = adsPlaceholder.getAttribute('design');
                        window.amzn_assoc_placement = 'adunit';
                        window.amzn_assoc_search_bar = 'false';
                        window.amzn_assoc_tracking_id = 'periodictab05-20';
                        window.amzn_assoc_ad_mode = 'search';
                        window.amzn_assoc_ad_type = 'smart';
                        window.amzn_assoc_marketplace = 'amazon';
                        window.amzn_assoc_region = 'US';
                        window.amzn_assoc_title = '';
                        window.amzn_assoc_default_search_phrase = searchTerm;
                        window.amzn_assoc_default_category = searchCategory;
                        window.amzn_assoc_linkid = '37694af719272b63fc4a6d8c15ffe65d';
                        window.amzn_assoc_rows = '4';
                        
                        if(design === 'text_links') {
                            window.amzn_assoc_design = 'text_links';    
                        } else {
                            delete window.amzn_assoc_design;
                        }

                        document.write = function(html) {
                            adsPlaceholder.innerHTML = html;
                        };

                        var adsScript = document.createElement('script');
                        adsScript.src = '//z-na.amazon-adsystem.com/widgets/onejs?MarketPlace=US';
                        target.appendChild(adsScript);

                        adsPlaceholder.setAttribute('initialized', 'initialized');
                    }
                    
                    
                }
                if(window.ga) {
                    window.ga(function(tracker) {
                        tracker.send('screenview', 'Tabs', 'open', target);
                    });                    
                }
                
                ev.preventDefault();
            }

            //reset filters
            else if(el.id === 'reset-position-filters') {
                var inputs = document.querySelectorAll('th > input[type="checkbox"]');
                for(i = 0; i < inputs.length; i++) {
                    inputs[i].checked = false;
                    inputs[i].parentNode.classList.remove('active');
                }
                model.resetPositionFilter();
            }

            //close help
            else if(el.classList.contains('close-content')) {
                document.querySelector(el.value).checked = false;
            }
         };

        document.onchange = function(ev) {

            var el = ev.target;

            if(el.tagName === 'INPUT' && el.name === 'group') {
                model.updateFilter(filterTypes.GROUP, el.value);
            }
            else if(el.tagName === 'INPUT' && el.name === 'period') {
                model.updateFilter(filterTypes.PERIOD, el.value);
            }
            else if(el.tagName === 'INPUT' && el.name === 'block') {
                model.updateFilter(filterTypes.BLOCK, el.value);
            }
            else if(el.tagName === 'INPUT' && el.name === 'category') {
                model.updateFilter(filterTypes.CATEGORY, el.value);
            }
            else if(el.id === 'year') {
                model.updateFilter(filterTypes.YEAR, el.value);
            }
            else if(el.tagName === 'INPUT' && el.name === 'state') {
                model.updateFilter(filterTypes.STATE, el.value);
            }

            if(el.tagName === 'INPUT' && el.parentNode.tagName === 'TH') {
                el.parentNode.classList.toggle('active', el.checked);
            }
        };

        //zoom events
        doubleTap(nodes.tables);
        nodes.tables.ondblclick = function(ev) {
            if(ev.path[0].tagName !== 'LABEL') {
                model.zoomWith(1, {
                    x: ev.clientX,
                    y: ev.clientY
                });
            }
        };

       /* var allowWheel = true;
        nodes.tables.onwheel = function(ev) {
            var nope = ev.path.some(function(el) {
                return el.tagName === 'DIV' && el.scrollHeight > el.clientHeight;
            });

            if(allowWheel && !nope) {
                model.zoomWith(ev.deltaY > 0 ? -1 : 1, {
                    x: ev.clientX,
                    y: ev.clientY
                });
                ev.preventDefault();
                allowWheel = false;
                setTimeout(function() {
                    allowWheel = true;
                }, 1000);
            }
        };*/

        //pinch to zoom
        var t1;
        var start;
        var midpoint;
        document.ontouchstart = function(ev) {
            if(ev.touches.length === 2) {
                t1 = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
                var t2 = {x: ev.touches[1].clientX, y: ev.touches[1].clientY };
                start = Math.pow(Math.abs(t2.x - t1.x),2) + Math.pow(Math.abs(t2.y - t1.y), 2);
                midpoint = { x: ((t1.x + t2.x) / 2), y: ((t2.y + t2.y) / 2) };
                ev.preventDefault();
            }
        };
        document.ontouchend = function(ev) {
            if(t1 && ev.touches.length) {
                var t2 = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
                var end = Math.pow(Math.abs(t2.x - t1.x), 2) + Math.pow(Math.abs(t2.y - t1.y), 2);
                model.zoomWith(end - start > 0 ? 1 : -1, {
                    x: midpoint.x,
                    y: midpoint.y
                });
                t1 = null;
                ev.preventDefault();
            }
        };

        //temperature and state updates
        nodes.tempUnit.onchange = view.tempUnitChanged;
        nodes.temp.onchange = view.tempChanged;
        nodes.temp.onkeypress = function(ev) {
            ev.stopPropagation();
        };

        //year
        nodes.year.onkeypress = function(ev) {
            ev.stopPropagation();
        };
        nodes.year.onkeyup = function(ev) {
            model.updateFilter(filterTypes.YEAR, nodes.year.value);
            ev.stopPropagation();
        };
        nodes.yearReset.onclick = function () {
            var now = new Date().getFullYear();
            nodes.year.value = now;
            model.updateFilter(filterTypes.YEAR, now);
        };

        //find
        nodes.find.onkeypress = function(ev) {
            ev.stopPropagation();
        };
        nodes.find.onkeyup = function(ev) {
            model.updateFilter(filterTypes.FIND, nodes.find.value);
            ev.stopPropagation();
        };
        nodes.findReset.onclick = function() {
            nodes.find.value = '';
            model.updateFilter(filterTypes.FIND, '');
        };

        //scrolling
        window.onscroll = function() {
            scrolled = true;
        };
        setInterval(function() {
            if(scrolled) {
                scrolled = false;
                if (model.zoom > 1) {
                    view.origin = null;
                    view.panTo();
                }
            }
        }, 100);
        //prevent space scrolling
        window.onkeydown = function(ev) {
            if(ev.keyCode === 32 && ev.target.tagName !== 'INPUT') {
                ev.preventDefault();
            }
        };
        window.onkeypress = function(ev) {

            if(ev.keyCode >= 48 && ev.keyCode <= 52) { //1, 2, 3, 4
                model.zoomTo(parseInt(String.fromCharCode(ev.keyCode)), getCenterPoint());
                ev.preventDefault();
            }
            else if(ev.keyCode === 45) { //-
                model.zoomWith(-1, getCenterPoint());
                ev.preventDefault();
            }
            else if(ev.keyCode === 61) { //=
                model.zoomWith(1, getCenterPoint());
                ev.preventDefault();
            }
            else if(ev.keyCode === 102) { //f
                if(nodes.toggleFilters.checked) {
                    nodes.toggleFilters.checked = false;
                } else {
                    nodes.toggleFilters.checked = true;
                    nodes.find.focus();
                }
                ev.preventDefault();
            }
            else if(ev.keyCode === 104) { //h
                nodes.toggleAbout.checked = !nodes.toggleAbout.checked;
                ev.preventDefault();
            }
            else if(ev.keyCode === 114) { //r
                view.center();
                model.zoomTo(1, getCenterPoint());
                ev.preventDefault();
            }
        };

        window.addEventListener('orientationchange', view.center);
    };

    function init() {
        model.init();
        view.init();
        controller.init();
    }

    if(document.readyState === 'interactive' || document.readyState === 'complete') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

    // misc ------------------------------------------------------------------------------------------------------------

    function fetch(path, cb) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                cb(JSON.parse(xhr.responseText));
            }
        };
        xhr.open('GET', path);
        xhr.send(null);
    }

    function inViewport (node) {
        var rect = node.getBoundingClientRect();
        return rect.bottom >= 0 && rect.right >= 0 && rect.top <= documentElement.clientHeight && rect.left <= documentElement.clientWidth;
    }

    /* jshint ignore:start */
    function getElIndex(el) {
        for (var i = 0; el = el.previousElementSibling; i++) {}
        return i;

    }
    /* jshint ignore:end */

    function toPx(value) {
        return parseFloat(value) + 'px';
    }

    function rect(node) {
        return node.getBoundingClientRect();
    }

    function uncheckAll(except) {
        (document.querySelector('#filters input:checked:not(#'+ except +')') || {}).checked = false;
    }

    function addTitle(element, key) {
        if(element[key] && titles[key]) {
            element[key].setAttribute('title', titles[key]);
        }
    }

    function getCenterPoint() {
        return {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };
    }

    /* jshint ignore:start */
    //src: https://gist.github.com/mckamey/2927073/92f041d72b0792fed544601916318bf221b09baf
    function doubleTap(d,h,e){if(d.ondblclick === undefined){var h=Math.abs(+h)||500,e=Math.abs(+e)||40,i,f,g,j=function(){i=0;g=f=NaN};j();d.addEventListener("touchstart",function(b){var a=b.changedTouches[0]||{},c=f,k=g;i++;f=+a.pageX||+a.clientX||+a.screenX;g=+a.pageY||+a.clientY||+a.screenY;Math.abs(c-f)<e&&Math.abs(k-g)<e&&(c=document.createEvent("MouseEvents"),c.initMouseEvent&&c.initMouseEvent("dblclick",!0,!0,b.view,i,a.screenX,a.screenY,a.clientX,a.clientY,b.ctrlKey,b.altKey,b.shiftKey,b.metaKey,b.button,
        a.target),d.dispatchEvent(c));setTimeout(j,h)},!1);d.addEventListener("touchmove",function(){j()},!1)}};
    /* jshint ignore:end */

})(window, document, window.localStorage);
