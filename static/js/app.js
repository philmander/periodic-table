(function(window, document) {

    // compatibility ---------------------------------------------------------------------------------------------------

    Element.prototype.matches =
        Element.prototype.matchesSelector ||
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector ||
        Element.prototype.oMatchesSelector ||
        Element.prototype.webkitMatchesSelector;

    // model ------------------------------------------------------------------------------------------------------------

    var i, scrolled;

    var documentElement = document.documentElement;

    var ZOOM_WIDTHS = [ -1, 1200, 2200, 5700, 14000 ];

    var nodes = {
        zoom: document.querySelector('[z]'),
        tables: document.querySelector('.tables'),
        elements: document.querySelectorAll('td[s]')
    };

    var model = {
        loadedArea: { y: documentElement.clientHeight, x: documentElement.clientWidth },
        zoom: parseInt(nodes.zoom.getAttribute('z')),
    };
    model.elements = function initElements() {
        var node, elements = {};
        for(i = 0; i < nodes.elements.length; i++) {
            node = nodes.elements[i];
            var select = node.querySelector.bind(node);
            elements[nodes.elements[i].getAttribute('s')] = {
                zoomAvailable: model.zoom,
                node: node,
                n: select('.n'),
                am: select('.am'),
                d: select('.d'),
                md: select('.md'),
                r: select('.r')
            };
        }
        return elements;
    }();
    model.zoomWith = function(mod) {
        if((mod < 0 && model.zoom > 1) || (mod > 0 && model.zoom < 4)) {
            model.zoom = model.zoom + mod;
            view.zoomTo(model.zoom, mod);
        }
    };
    model.addFieldsForElement = function(data) {
        var el = model.elements[data.symbol];
        el.zoomAvailable = Math.max(el.zoomAvailable, model.zoom);
        view.injectFieldsForElement(data);
    };

    // view ------------------------------------------------------------------------------------------------------------

    var view = {};
    view.zoomTo = function (zoom, dir) {

        // var vc = {
        //     x: document.documentElement.offsetWidth / 2,
        //     y: document.documentElement.offsetHeight / 2
        // };
        //
        // var tb = { x: nodes.tables.offsetLeft, y: nodes.tables.offsetTop };
        //
        // var tw1 = ZOOM_WIDTHS[zoom + ( dir * -1)];
        // var tw2 = ZOOM_WIDTHS[zoom];
        // var ratio = (vc.x - tb.x) / tw1;
        // var left = (((tw2 * ratio)) - (tw1 * ratio)) ;
        // setTimeout(function() {
        //     window.scrollTo(left, 0);
        // }, 1000);

        var v1 = {
            w: document.documentElement.offsetWidth
        };
        var t1 = {
            w: ZOOM_WIDTHS[zoom + ( dir * -1)]
        };
        var t2 = {
            w: ZOOM_WIDTHS[zoom]
        };
        var p1 = {
            x: 127
        };
        var r = {
            x: t2.w / t1.w
        };
        var v2 = {
            w: v1.w * r.x
        };
        var pp1 = {
            x: p1.x / v1.w
        };
        var p2 = {
            x: v2.w * pp1.x
        };
        var offset = {
            x: p2.x - p1.x
        };
        nodes.tables.style.transform = 'translate(' + (offset.x * -1) + 'px, 0)';

        setTimeout(function() {
            nodes.tables.classList.add('nt');
            nodes.tables.style.transform = 'translate(0, 0)';
            window.scrollTo(offset.x, 0);
            nodes.tables.classList.remove('nt');
        }, 1000);

        nodes.zoom.setAttribute('z', zoom);
        view.panTo(zoom, dir);
        history.replaceState(null, '', '?z=' + zoom);
    };

    view.panTo = function (zoom, dir) {
        var symbolsToFetch = [],symbolsToShow = [];
        if(!dir || dir > 0) {
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

        if(model.zoom === 2) {
            inject(data, ['n', 'am']);
        }
        if(model.zoom === 3) {
            inject(data, ['d']);
        }
        if(model.zoom === 4) {
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

        setTimeout(function() {
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
        }, 0);
    };

    // controller ------------------------------------------------------------------------------------------------------

    var controller = {};
    controller.listen = function() {
        document.onclick = function(ev) {
            var el = ev.target;
            if(el.matches('button[zoom]')) {
                model.zoomWith(parseInt(el.value));
            }
        };

        window.onscroll = function() {
            scrolled = true;
        };

        setInterval(function() {
            if(scrolled) {
                //model.loadedArea.x = window.scrollX;
                //model.loadedArea.y = window.scrollY;
                scrolled = false;
                if (model.zoom > 1) {
                    view.panTo(model.zoom);
                }
            }
        }, 100);
    };

    controller.listen();

    //util
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

    var step = 10;
    function scrollTo(to, duration) {
        var element = document.body;
        if (duration <= 0) return;
        var difference = to - element.scrollLeft;
        var perTick = difference / duration * step;

        setTimeout(function() {
            element.scrollLeft = element.scrollLeft + perTick;
            if (element.scrollLeft === to) {
                return;
            }
            scrollTo(to, duration - step);
        }, step);
    }

})(window, document);
