(function(window, document) {

    // compatibility ---------------------------------------------------------------------------------------------------

    Element.prototype.matches =
        Element.prototype.matchesSelector ||
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector ||
        Element.prototype.oMatchesSelector ||
        Element.prototype.webkitMatchesSelector;

    // model ------------------------------------------------------------------------------------------------------------

    var i, rule, scrolled;

    var documentElement = document.documentElement;

    var filters = { PERIOD: 1, GROUP: 2, BLOCK: 3}

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
    window.scrollTo(2100, 1088);

    view.zoomTo = function (dir, point) {
        var $0 = nodes.tables;
        view.origin = dir < 0 && view.origin ? view.origin : {
            x: ((($0.getBoundingClientRect().left * -1) + point.x) / ($0.getBoundingClientRect().width)),
            y: ((($0.getBoundingClientRect().top * -1) + point.y) / ($0.getBoundingClientRect().height))
        };

        nodes.tables.style.transformOrigin = (view.origin.x * 100) + '% ' + (view.origin.y * 100) + '%';
        if(model.zoom > 1) {
            var dx = (2100 + view.origin.x * $0.offsetWidth) - (window.pageXOffset + point.x);
            var dy = (1088 + view.origin.y * $0.offsetHeight) - (window.pageYOffset + point.y);
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

    var blockRanges = {s: [ 2, 3 ], d: [ 4, 13 ], p: [ 14, 19 ]};
    view.applyFilter = function (type, value) {
        var sheet = document.styleSheets[0];
        view.filterRuleIndex = view.filterRuleIndex || sheet.rules.length;

        if(model.filter === type + '_' + value) {
            delete model.filter;
            nodes.tables.classList.remove('filtering');
            if(view.filterRuleIndex < sheet.rules.length) {
                sheet.deleteRule(view.filterRuleIndex);
            }
            return;
        }
        model.filter = type + '_' + value;

        nodes.tables.classList.add('filtering');
        if(view.filterRuleIndex < sheet.rules.length) {
            sheet.deleteRule(view.filterRuleIndex);
        }

        if(type === filters.GROUP) {
            if(isNaN(parseInt(value))) {
                rule = 'td[c="' + value + '"] { opacity: 1 !important }';
            } else {
                rule = '.elements:nth-child(1) tr > td:nth-child(' + (parseInt(value) + 1) + ') { opacity: 1 !important; }';
            }
        } else if(type === filters.PERIOD) {
            rule = '.elements:nth-child(1) tr:nth-child(' + (parseInt(value) + 1) + ') > td { opacity: 1 !important; }'
        } else {
            if(value === 'f') {
                rule = 'td[c="a"], td[c="l"] { opacity: 1 !important }';
            } else {
                rule = '.elements:nth-child(1) td:nth-child(n+' + blockRanges[value][0] + '):nth-child(-n+' + blockRanges[value][1] + '):not([c="a"]):not([c="l"]) { opacity: 1 !important }';
            }
        }

        sheet.insertRule(rule, view.filterRuleIndex);
    };

    // controller ------------------------------------------------------------------------------------------------------

    var controller = {};
    controller.listen = function() {
        document.onclick = function(ev) {
            var el = ev.target;
            if(el.matches('button[zoom]')) {
                model.zoomWith(parseInt(el.value), {
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2
                });
            }

            if(el.tagName === 'TH') {
                if(el.hasAttribute('g')) {
                    view.applyFilter(filters.GROUP, el.getAttribute('g') || el.textContent);
                } else if(el.hasAttribute('b')) {
                    view.applyFilter(filters.BLOCK, el.textContent);
                } else if(el.hasAttribute('p')) {
                    view.applyFilter(filters.PERIOD, el.textContent)
                }
            }
        };

        nodes.tables.ondblclick = function(ev) {
            model.zoomWith(1, {
                x: ev.screenX,
                y: ev.screenY
            })
        };
        doubleTap(nodes.tables);

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

    //src: https://gist.github.com/mckamey/2927073/92f041d72b0792fed544601916318bf221b09baf
    function doubleTap(d,h,e){if("ontouchstart"in d){var h=Math.abs(+h)||500,e=Math.abs(+e)||40,i,f,g,j=function(){i=0;g=f=NaN};j();d.addEventListener("touchstart",function(b){var a=b.changedTouches[0]||{},c=f,k=g;i++;f=+a.pageX||+a.clientX||+a.screenX;g=+a.pageY||+a.clientY||+a.screenY;Math.abs(c-f)<e&&Math.abs(k-g)<e&&(c=document.createEvent("MouseEvents"),c.initMouseEvent&&c.initMouseEvent("dblclick",!0,!0,b.view,i,a.screenX,a.screenY,a.clientX,a.clientY,b.ctrlKey,b.altKey,b.shiftKey,b.metaKey,b.button,
        a.target),d.dispatchEvent(c));setTimeout(j,h)},!1);d.addEventListener("touchmove",function(){j()},!1)}};

})(window, document);
