(function(window, document) {

    // model ------------------------------------------------------------------------------------------------------------

    var i, j, scrolled;

    var documentElement = document.documentElement;

    var filters = { PERIOD: 'p', GROUP: 'g', BLOCK: 'b', CATEGORY: 'c', STATE: 's'}

    var css = {
        FILTERED: 'filtered',
        FILTERING: 'filtering'
    };

    var nodes = {
        filters: document.querySelector('#f'),
        zoom: document.querySelector('[z]'),
        tables: document.querySelector('.tables'),
        elements: document.querySelectorAll('td[s]'),
        temp: document.querySelector('#t')
    };
    nodes.tempUnit = nodes.temp.nextElementSibling;

    var model = {
        loadedArea: { y: documentElement.clientHeight, x: documentElement.clientWidth },
        zoom: parseInt(nodes.zoom.getAttribute('z')),
        temp: 298.15
    };
    model.init = function() {

        //build up a list of elements in memory from the initial information in the dom
        var node, elements = {};
        for(i = 0; i < nodes.elements.length; i++) {
            node = nodes.elements[i];
            var select = node.querySelector.bind(node);
            var cat = node.getAttribute('c');
            var isActinideOrLanthanide = cat == 'l' || cat == 'a';
            var nodeIndex = getElIndex(node);
            var temps = node.getAttribute('t').split(',')
            elements[node.getAttribute('s')] = {
                zoomAvailable: model.zoom,
                node: node,
                c: cat,
                n: select('.n'),
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
    window.scrollTo(14400, 7500 - 10);
    //init
    view.init = function() {
        view.updateTempUnit();
    };

    view.updateTemp = function () {
        var unit = nodes.tempUnit.value;
        var temp = parseInt(nodes.temp.value);
        model.temp = unit == 'c' ? temp + 273.15 : (unit == 'f' ? (temp + 459.67) * 5/9 : temp);

        if(model.filter && model.filter.split('_')[0] == filters.STATE) {
            view.applyFilter(filters.STATE, model.filter.split('_')[1]);
        }
    };

    view.updateTempUnit = function() {
        var unit = nodes.tempUnit.value;
        var temp = unit == 'c' ? model.temp - 273.15 : (unit == 'f' ? model.temp * 9/5 - 459.67 : model.temp);
        nodes.temp.value = Math.round(temp);
    };

    view.zoomTo = function (dir, point) {
        var $0 = nodes.tables;
        view.origin = dir < 0 && view.origin ? view.origin : {
            x: ((($0.getBoundingClientRect().left * -1) + point.x) / ($0.getBoundingClientRect().width)),
            y: ((($0.getBoundingClientRect().top * -1) + point.y) / ($0.getBoundingClientRect().height))
        };

        nodes.tables.style.transformOrigin = (view.origin.x * 100) + '% ' + (view.origin.y * 100) + '%';

        //correct scroll position for transform origin
        if(model.zoom > 1) {
            var dx = (14400 + view.origin.x * $0.offsetWidth) - (window.pageXOffset + point.x);
            var dy = (7500 + view.origin.y * $0.offsetHeight) - (window.pageYOffset + point.y);
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
                var wrapper = document.createElement('div');
                wrapper.innerHTML = data[fieldNames[i]];
                var inject = wrapper.firstChild;
                inject.classList.add('out');
                node.firstElementChild.appendChild(inject);
                model.elements[data.symbol][fieldNames[i]] = inject;
            }
        }

        if(model.zoom == 2) {
            inject(data, ['n', 'am']);
        }
        if(model.zoom == 3) {
            inject(data, ['d']);
        }
        if(model.zoom == 4) {
            inject(data, ['md', 'r']);
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

    view.applyFilter = function(type, value) {

        (document.querySelector('input:checked') || {}).checked = false;

        if(model.filter === type + '_' + value) {
            delete model.filter;
            nodes.tables.classList.remove('filtering');
            return;
        }

        model.filter = type + '_' + value;
        nodes.tables.classList.add(css.FILTERING);

        var match;
        var elements = model.elements;
        var symbols = Object.keys(elements);
        value = value.split(',');
        for(i = 0; i < symbols.length; i++) {
            var el = elements[symbols[i]];
            match = false;
            for(j = 0; j < value.length && !match; j++) {
                match = type != filters.STATE ?
                    //simple filter match
                    el[type] == value[j] :
                    //figure out state at current temperature
                    (value[j] == 'g' &&  el.bp && el.bp < model.temp ) ||
                    (value[j] == 'l' &&  el.mp && el.bp && el.mp < model.temp && el.bp > model.temp) ||
                    (value[j] == 's' && el.mp && el.mp > model.temp);

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
            if(el.hasAttribute('zoom')) {
                model.zoomWith(parseInt(el.value), {
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2
                });
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

            //open and close the filter panel
            else if((el.tagName == 'SPAN' && el.parentNode == nodes.filters) || el == nodes.filters) {
                nodes.filters.classList.toggle('open');
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
                }
            }
            ev.preventDefault();
         };

        //zoom events
        nodes.tables.ondblclick = function(ev) {
            model.zoomWith(1, {
                x: ev.screenX,
                y: ev.screenY
            })
        };
        //doubleTap(nodes.tables);
        var allowWheel = true;
        nodes.tables.onwheel = function(ev) {
            if(allowWheel) {
                model.zoomWith(ev.deltaY > 0 ? 1 : -1, {
                    x: ev.screenX,
                    y: ev.screenY
                });
                allowWheel = false;
                setTimeout(function() {
                    allowWheel = true;
                }, 1000);
            }

        };

        //temperature and state updates
        nodes.tempUnit.onchange = function() {
            view.updateTempUnit();
        };
        nodes.temp.onchange = function() {
            view.updateTemp();
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

    //src: https://gist.github.com/mckamey/2927073/92f041d72b0792fed544601916318bf221b09baf

})(window, document);
