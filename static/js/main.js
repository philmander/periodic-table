(function(window, document, localStorage) {

    // model ------------------------------------------------------------------------------------------------------------

    var i, j, scrolled;

    var documentElement = document.documentElement;

    var filters = { PERIOD: 'p', GROUP: 'g', BLOCK: 'b', CATEGORY: 'c', STATE: 's', YEAR: 'y', FIND: 'f'};

    var titles = {
        am: 'Relative atmoic mass',
        an: 'Atomic number'
    };

    var css = {
        FILTERED: 'filtered',
        FILTERING: 'filtering'
    };

    var initScroll = {
        x: 14400,
        y: 7500
    };

    var nodes = {
        wrap: document.querySelector('#wrap'),
        filters: document.querySelector('#f'),
        zoom: document.querySelector('[z]'),
        tables: document.querySelector('#tables'),
        elements: document.querySelectorAll('td[s]'),
        temp: document.querySelector('#temp'),
        find: document.querySelector('#find'),
        year: document.querySelector('#year'),
        yearApply: document.querySelector('#yearApply')
    };
    nodes.tempUnit = nodes.temp.nextElementSibling;

    var model = {
        loadedArea: { y: documentElement.clientHeight, x: documentElement.clientWidth },
        zoom: parseInt(nodes.zoom.getAttribute('z')),
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
            var isActinideOrLanthanide = cat == 'l' || cat == 'a';
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
        if((mod < 0 && model.zoom > 1) || (mod > 0 && model.zoom < 4)) {
            model.zoom = model.zoom + mod;
            view.zoomTo(mod, point);
        }
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

        //set up viewport
        document.body.style.overflow = 'ontouchstart' in window || navigator.maxTouchPoints ? 'auto' : 'hidden';
        nodes.wrap.style.width = '30000px';
        nodes.wrap.style.height = '15000px';
        tables.style.left = '14400px';
        tables.style.top = '7500px';
        tables.style.transformOrigin = '50% 50%';

        //enable filters
        nodes.filters.style.display = 'block';

        //this centers the table if it is smaller than the viewport
        var dims = {
            width: rect(tables).width,
            height: rect(tables).height
        };
        var scroll = {
            x: window.innerWidth > dims.width ? initScroll.x - ((window.innerWidth - dims.width) / 2) : initScroll.x,
            y: window.innerHeight > dims.height ? initScroll.y - ((window.innerHeight - dims.height) / 2) : initScroll.y,
        };
        window.scrollTo(scroll.x, scroll.y);

        //initialize state and temperature
        nodes.tempUnit.value = model.tempUnit;
        view.tempUnitChanged();

        //initialize year
        nodes.year.value = model.year;
    };

    view.tempChanged = function () {
        var temp = parseInt(nodes.temp.value);
        if(isNaN(temp)) {
            temp = model.temp
        }
        model.temp = model.tempUnit == 'c' ? temp + 273.15 : (model.tempUnit == 'f' ? (temp + 459.67) * 5/9 : temp);

        if(model.filter && model.filter.split('_')[0] == filters.STATE) {
            view.applyFilter(filters.STATE, model.filter.split('_')[1], true);
        }
        localStorage.temp = model.temp;
    };

    view.tempUnitChanged = function() {
        model.tempUnit = nodes.tempUnit.value;
        var temp = model.tempUnit == 'c' ? model.temp - 273.15 : (model.tempUnit == 'f' ? model.temp * 9/5 - 459.67 : model.temp);
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
        if(model.zoom > 1) {
            var dx = (initScroll.x + view.origin.x * tables.offsetWidth) - (window.pageXOffset + point.x);
            var dy = (initScroll.y + view.origin.y * tables.offsetHeight) - (window.pageYOffset + point.y);
           window.scrollBy(dx, dy);
        }

        nodes.zoom.setAttribute('z', model.zoom);
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
        } else {
            symbolsToShow = Object.keys(model.elements);
        }

        if(symbolsToFetch.length) {
            fetch('/fields?z=' + zoom + '&s=' + encodeURIComponent(JSON.stringify(symbolsToFetch)), function (data) {
                data.forEach(model.addFieldsForElement);
                symbolsToShow.forEach(view.updateVisibility);
            });
        } else {
            symbolsToShow.forEach(view.updateVisibility);
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
                    inject.classList.add('out');
                    addTitle(inject.firstChild, fieldNames[i]);
                    node.firstElementChild.appendChild(inject);
                    model.elements[data.symbol][fieldNames[i]] = inject;
                }
            }
        }

        if(model.zoom == 2) {
            inject(data, ['n', 'am']);
        }
        if(model.zoom == 3) {
            inject(data, ['n', 'am', 'd']);
        }
        if(model.zoom == 4) {
            inject(data, ['n', 'am', 'd', 'md', 'r']);
        }
    };

    view.updateVisibility = function (symbol) {
        var fields = [
            { cn: 'n',  z: 2 },
            { cn: 'am', z: 2 },
            { cn: 'd',  z: 3 },
            { cn: 'md', z: 4 },
            { cn: 'r',  z: 4 }
        ];
        var fieldNode;
        for(i = 0; i < fields.length; i++) {
            fieldNode = model.elements[symbol][fields[i].cn];
            if(fieldNode) {
                if(fields[i].z <= model.zoom) {
                    fieldNode.classList.add('in');
                    fieldNode.classList.remove('out');
                } else {
                    fieldNode.classList.add('out');
                    fieldNode.classList.remove('in');
                }
            }
        }
    };

    view.applyFilter = function(type, value, amend) {

        if(!amend) {
            uncheckAll();
            if(!value || model.filter == type + '_' + value) {
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
                    type == filters.STATE &&
                    (value[j] == 'G' &&  el.bp && el.bp < model.temp ) ||
                    (value[j] == 'L' &&  el.mp && el.bp && el.mp < model.temp && el.bp > model.temp) ||
                    (value[j] == 'S' && el.mp && el.mp > model.temp)
                ) || (
                    type == filters.YEAR && (isNaN(el.y) || el.y <= value[j])
                ) || (
                    type == filters.FIND &&
                    (el.s.textContent.toLowerCase().indexOf(value[j]) === 0 ||
                     el.s.getAttribute('title').toLowerCase().indexOf(value[j]) === 0)
                ) || (
                    el[type] == value[j]
                );

                match ? (el.node.classList.add(css.FILTERED)) : el.node.classList.remove(css.FILTERED);
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
            if(el.tagName == 'A' && el.parentNode.id == 'z') {
                model.zoomWith(parseInt(el.getAttribute('value')), {
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2
                });
                ev.preventDefault();
            }

            //table headers, toggling group, period and block filtering
            else if(el.tagName == 'TH') {
                if(el.hasAttribute('g')) {
                    view.applyFilter(filters.GROUP, el.getAttribute('g') || el.textContent);
                } else if(el.hasAttribute('b')) {
                    view.applyFilter(filters.BLOCK, el.textContent);
                } else if(el.hasAttribute('p')) {
                    view.applyFilter(filters.PERIOD, el.textContent)
                }
            }

            //filter by category
            else if(el.tagName == 'LABEL' && el.parentNode.id == 'fc') {
                view.applyFilter(filters.CATEGORY, el.firstChild.value);
            }

            //filter by state
            else if(el.tagName == 'LABEL' && el.parentNode.id == 'fs') {
                view.applyFilter(filters.STATE, el.firstChild.value);
            }

            //resources tabs
            else if(el.tagName == 'A' && el.parentNode.parentNode.classList.contains('tabs-nav')) {
                var tabs =  el.parentNode.parentNode.children;
                for(i = 0; i < tabs.length; i++) {
                    tabs[i].style.display = tabs[i].firstElementChild == el ?
                        tabs[i].classList.add('active') : tabs[i].classList.remove('active');
                }
                var target = document.querySelector(el.getAttribute('href'));
                var panes = target.parentNode.children;
                for(i = 0; i < panes.length; i++) {
                    panes[i].style.display = panes[i] == target ? 'block' : 'none';
                    var div = target.querySelector('.iframe');
                    if(div) {
                        var iframe = document.createElement('iframe');
                        for(j = 0; j < div.attributes.length; j++) {
                            iframe.setAttribute(div.attributes[j].name, div.attributes[j].value);
                        }
                        div.parentNode.appendChild(iframe);
                        div.parentNode.removeChild(div);
                    }
                }

                ev.preventDefault();
            }
         };

        //zoom events
        nodes.tables.ondblclick = function(ev) {
            model.zoomWith(1, {
                x: ev.clientX,
                y: ev.clientY
            })
        };
        doubleTap(nodes.tables);

        var allowWheel = false//true;
        nodes.tables.onwheel = function(ev) {
            if(allowWheel) {
                model.zoomWith(ev.deltaY > 0 ? 1 : -1, {
                    x: ev.clientX,
                    y: ev.clientY
                });
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
            if(ev.touches.length == 2) {
                t1 = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
                var t2 = {x: ev.touches[1].clientX, y: ev.touches[1].clientY };
                start = Math.sqrt(Math.pow(Math.abs(t2.x - t1.x), 2) + Math.pow(Math.abs(t2.y - t1.y), 2));
                midpoint = { x: ((t1.x + t2.x) / 2), y: ((t2.y + t2.y) / 2) };
                ev.preventDefault();
            }
        };
        document.ontouchend = function(ev) {
            if(t1 && ev.touches.length) {
                var t2 = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
                var end = Math.sqrt(Math.pow(Math.abs(t2.x - t1.x), 2) + Math.pow(Math.abs(t2.y - t1.y), 2));
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
                view.findChanged()
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
    };

    function init() {
        model.init();
        view.init();
        controller.init();
    }
    document.readyState == 'interactive' || document.readyState == 'complete' ?
        init() : document.addEventListener('DOMContentLoaded', init);

    // misc ------------------------------------------------------------------------------------------------------------

    function fetch(path, cb) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
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

    function getElIndex(el) {
        for (var i = 0; el = el.previousElementSibling; i++) {}
        return i;
    }

    function rect(node) {
        return node.getBoundingClientRect();
    }

    function uncheckAll() {
        (document.querySelector('#f input:checked') || {}).checked = false;
    }

    function addTitle(node, key) {
        if(node[key]) {
            node[key].setAttribute('title', titles[key]);
        }
    }

    //src: https://gist.github.com/mckamey/2927073/92f041d72b0792fed544601916318bf221b09baf
    function doubleTap(d,h,e){if("ontouchstart"in d){var h=Math.abs(+h)||500,e=Math.abs(+e)||40,i,f,g,j=function(){i=0;g=f=NaN};j();d.addEventListener("touchstart",function(b){var a=b.changedTouches[0]||{},c=f,k=g;i++;f=+a.pageX||+a.clientX||+a.screenX;g=+a.pageY||+a.clientY||+a.screenY;Math.abs(c-f)<e&&Math.abs(k-g)<e&&(c=document.createEvent("MouseEvents"),c.initMouseEvent&&c.initMouseEvent("dblclick",!0,!0,b.view,i,a.screenX,a.screenY,a.clientX,a.clientY,b.ctrlKey,b.altKey,b.shiftKey,b.metaKey,b.button,
        a.target),d.dispatchEvent(c));setTimeout(j,h)},!1);d.addEventListener("touchmove",function(){j()},!1)}};

})(window, document, window.localStorage);
