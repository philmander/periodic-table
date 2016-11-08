(function(window, document, localStorage) {

    var i, j, scrolled;

    var responsiveBreakpoints = {
        COMPACT: 690
    };


    var documentElement = document.documentElement;

    var filters = { PERIOD: 'p', GROUP: 'g', BLOCK: 'b', CATEGORY: 'c', STATE: 's', YEAR: 'y', FIND: 'f'};

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
        FILTERING: 'filtering'
    };

    var nodes = {
        header: document.querySelector('header'),
        wrap: document.querySelector('#wrap'),
        toggleFilters: document.querySelector('#toggle-filters'),
        filters: document.querySelector('#filters'),
        zoom: document.querySelector('[zoom]'),
        tables: document.querySelector('#tables'),
        elements: document.querySelectorAll('td[s]'),
        temp: document.querySelector('#temp'),
        find: document.querySelector('#find'),
        year: document.querySelector('#year'),
        yearApply: document.querySelector('#year-apply')
    };
    nodes.tempUnit = nodes.temp.nextElementSibling;

    var model = {
        loadedArea: { y: documentElement.clientHeight, x: documentElement.clientWidth },
        zoom: parseInt(nodes.zoom.getAttribute('zoom')),
        temp: localStorage.temp ? parseInt(localStorage.temp) : 298.15,
        tempUnit: localStorage.tempUnit || 'k',
        year: localStorage.year || new Date().getFullYear()
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


    // view ------------------------------------------------------------------------------------------------------------

    var view = {};
    view.origin = null;
    //init
    view.init = function() {

        var tables = nodes.tables;
        var windowWidth = window.innerWidth;
        var windowHeight = window.innerHeight;

        //set up viewport
        document.body.style.overflow = 'ontouchstart' in window || navigator.maxTouchPoints ? 'auto' : 'hidden';

        var tableSize = {
            width: rect(tables).width,
            height: rect(tables).height,
            offsetWidth: tables.offsetWidth,
            offsetHeight: tables.offsetHeight
        };
        var wrapSize = {
            width: 30000,
            height: 15000
        };
        var initPosition = {
            left: (wrapSize.width - tableSize.width) / 2,
            top: (wrapSize.height - tableSize.height) / 2
        };
        var initScroll = (view.initScroll = {
            left: (wrapSize.width - tableSize.width) / 2,
            top: (wrapSize.height - tableSize.height) / 2
        });

        nodes.wrap.style.width = wrapSize.width + 'px';
        nodes.wrap.style.height = wrapSize.height + 'px';

        tables.style.left = initPosition.left + 'px';
        tables.style.top = initPosition.top + 'px';
        tables.style.transformOrigin = '50% 50%';

        //enable filters
        nodes.filters.style.display = 'block';

        //this centers the table if it is smaller than the viewport

        var scroll = {
            left: windowWidth > tableSize.width ?
                initScroll.left - ((windowWidth - tableSize.width) / 2) :
                initPosition.left,

            top: windowHeight > tableSize.height ?
                initScroll.top - ((windowHeight - tableSize.height) / 2) : initPosition.top
        };
        window.scrollTo(scroll.left, scroll.top);
        //window.scrollTo(initScroll.x, initScroll.y);

        view.fitToScreen();
        window.addEventListener('resize', view.fitToScreen);

        //add header titles
        var highlightText = ' (click to toggle highlight)';
        function addCellHeaderTitle(title) {
            var cellHeaders = document.querySelectorAll('th[' + title.charAt(0).toLowerCase() + ']');
            for(i = 0; i < cellHeaders.length; i++) {
                cellHeaders[i].setAttribute('title', title + ' ' + cellHeaders[i].textContent.replace(/\*+\s/, '') + highlightText);
            }
        }
        addCellHeaderTitle('Group');
        addCellHeaderTitle('Period');
        addCellHeaderTitle('Block');

        //initialize state and temperature
        nodes.tempUnit.value = model.tempUnit;
        view.tempUnitChanged();

        //initialize year
        nodes.year.value = model.year;
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

        if(model.filter && model.filter.split('_')[0] === filters.STATE) {
            view.applyFilter(filters.STATE, model.filter.split('_')[1], true);
        }
        localStorage.temp = model.temp;
    };

    view.tempUnitChanged = function() {
        model.tempUnit = nodes.tempUnit.value;
        var temp = model.tempUnit === units.C ? model.temp - 273.15 : (model.tempUnit === units.F ? model.temp * 9/5 - 459.67 : model.temp);
        nodes.temp.value = Math.round(temp);
        localStorage.tempUnit = model.tempUnit;
    };

    view.yearChanged = function() {
        var year = parseInt(nodes.year.value);
        view.applyFilter(filters.YEAR, isNaN(year) ? new Date().getFullYear() : year);
        localStorage.year = isNaN(year) ? null : year;
    };

    view.findChanged = function() {
        var value = nodes.find.value;
        value = (value && value.toLowerCase().trim()) || '';
        view.applyFilter(filters.FIND, value);
    };

    view.zoomTo = function (dir, point) {
        var tables = nodes.tables;
        view.origin = dir < 0 && view.origin ? view.origin : {
            x: (((rect(tables).left * -1) + point.x) / (rect(tables).width)),
            y: (((rect(tables).top * -1) + point.y) / (rect(tables).height))
        };

        nodes.tables.style.transformOrigin = (view.origin.x * 100) + '% ' + (view.origin.y * 100) + '%';

        //correct scroll position for transform origin
        var dx = (view.initScroll.left + view.origin.x * tables.offsetWidth) - (window.pageXOffset + point.x);
        var dy = (view.initScroll.top + view.origin.y * tables.offsetHeight) - (window.pageYOffset + point.y);
        window.scrollBy(dx, dy);

        nodes.zoom.setAttribute('zoom', model.zoom);
        view.panTo(dir);
        history.replaceState(null, '', '?z=' + model.zoom);
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

    view.applyFilter = function(type, value, amend) {

        if(!amend) {
            if(!value || model.filter === type + '_' + value) {
                delete model.filter;
                nodes.tables.classList.remove(css.FILTERING);
                setTimeout(uncheckAll, 0);
                return;
            }
        }

        model.filter = type + '_' + value;
        nodes.tables.classList.add(css.FILTERING);

        var match;
        var elements = model.elements;
        var symbols = Object.keys(elements);
        value = (value.split && value.split(',')) || [ value ];
        for(i = 0; i < symbols.length; i++) {
            var el = elements[symbols[i]];
            match = false;
            for(j = 0; j < value.length && !match; j++) {
                match = (
                    type === filters.STATE &&
                    (value[j] === 'gas' &&  el.bp && el.bp < model.temp ) ||
                    (value[j] === 'liquid' &&  el.mp && el.bp && el.mp < model.temp && el.bp > model.temp) ||
                    (value[j] === 'solid' && el.mp && el.mp > model.temp)
                ) || (
                    type === filters.YEAR && (isNaN(el.y) || el.y <= value[j])
                ) || (
                    type === filters.FIND &&
                    (el.s.textContent.toLowerCase().indexOf(value[j]) === 0 ||
                     el.s.getAttribute('title').toLowerCase().indexOf(value[j]) === 0)
                ) || (
                    el[type] == value[j]
                );

                if(match) {
                    el.node.classList.add(css.FILTERED);
                } else {
                    el.node.classList.remove(css.FILTERED);
                }
            }
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

            //zoom buttons
            if(el.tagName === 'A' && el.parentNode.id === 'zoom') {
                model.zoomWith(parseInt(el.getAttribute('value')), {
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2
                });
                ev.preventDefault();
            }

            //table headers, toggling group, period and block filtering
            else if(el.tagName === 'TH') {
                if(el.hasAttribute('group')) {
                    view.applyFilter(filters.GROUP, el.getAttribute('group') || el.textContent);
                } else if(el.hasAttribute('block')) {
                    view.applyFilter(filters.BLOCK, el.textContent);
                } else if(el.hasAttribute('period')) {
                    view.applyFilter(filters.PERIOD, el.textContent);
                }
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
                    var div = target.querySelector('.iframe');
                    if(div) {
                        var iframe = document.createElement('iframe');
                        div.parentNode.appendChild(iframe);
                        for(j = 0; j < div.attributes.length; j++) {
                            iframe.setAttribute(div.attributes[j].name, div.attributes[j].value);
                        }
                        div.parentNode.removeChild(div);
                    }
                }

                ev.preventDefault();
            }
         };

        document.onchange = function(ev) {

            var el = ev.target;

            //filter by category
            if(el.tagName === 'INPUT' && el.parentNode.id === 'filter-category') {
                uncheckAll(el.id);
                view.applyFilter(filters.CATEGORY, el.value);
            }

            //filter by state
            else if(el.tagName === 'INPUT' && el.parentNode.id === 'filter-state') {
                uncheckAll(el.id);
                view.applyFilter(filters.STATE, el.value);
            }
        };

        //zoom events
        doubleTap(nodes.tables);
        nodes.tables.ondblclick = function(ev) {
            model.zoomWith(1, {
                x: ev.clientX,
                y: ev.clientY
            });
        };

        var allowWheel = true;
        nodes.tables.onwheel = function(ev) {
            if(allowWheel) {
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
        };

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

        //year
        nodes.yearApply.onclick = view.yearChanged;

        //find
        nodes.find.onkeyup = function(ev) {
            if(ev.keyCode != 16) {
                view.findChanged();
            }
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
            if(ev.keyCode === 32) {
                ev.preventDefault();
            }
        };
        window.onkeypress = function(ev) {

            var el = ev.target;
            function getCenterPoint() {
                return {
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2
                };
            }

            if(ev.keyCode >= 48 && ev.keyCode <= 52) { //1, 2, 3, 4
                model.zoomTo(parseInt(String.fromCharCode(ev.keyCode)), getCenterPoint());
                ev.preventDefault();
            }
            if(ev.keyCode === 45) { //-
                model.zoomWith(-1, getCenterPoint());
                ev.preventDefault();
            }
            if(ev.keyCode === 61) { //=
                model.zoomWith(1, getCenterPoint());
                ev.preventDefault();
            }
            if(ev.keyCode === 102) { //f
                if(nodes.toggleFilters.checked) {
                    nodes.toggleFilters.checked = false;
                } else {
                    nodes.toggleFilters.checked = true;
                    nodes.temp.focus();
                }
                ev.preventDefault();
            }
            if(ev.keyCode === 114) { //r
                view.init();
                model.zoomTo(1, getCenterPoint());
                ev.preventDefault();
            }
            if(ev.keyCode === 13 && el.tagName === 'TH') {
                var clickEvent = document.createEvent('Events');
                clickEvent.initEvent('click', true, false);
                el.dispatchEvent(clickEvent);
            }
        };

        window.onorientationchange = function() {
            view.init();
        };
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

    /* jshint ignore:start */
    //src: https://gist.github.com/mckamey/2927073/92f041d72b0792fed544601916318bf221b09baf
    function doubleTap(d,h,e){if(d.ondblclick === undefined){var h=Math.abs(+h)||500,e=Math.abs(+e)||40,i,f,g,j=function(){i=0;g=f=NaN};j();d.addEventListener("touchstart",function(b){var a=b.changedTouches[0]||{},c=f,k=g;i++;f=+a.pageX||+a.clientX||+a.screenX;g=+a.pageY||+a.clientY||+a.screenY;Math.abs(c-f)<e&&Math.abs(k-g)<e&&(c=document.createEvent("MouseEvents"),c.initMouseEvent&&c.initMouseEvent("dblclick",!0,!0,b.view,i,a.screenX,a.screenY,a.clientX,a.clientY,b.ctrlKey,b.altKey,b.shiftKey,b.metaKey,b.button,
        a.target),d.dispatchEvent(c));setTimeout(j,h)},!1);d.addEventListener("touchmove",function(){j()},!1)}};
    /* jshint ignore:end */

})(window, document, window.localStorage);
