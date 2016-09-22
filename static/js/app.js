(function(window, document) {

    // compatibility ---------------------------------------------------------------------------------------------------

    Element.prototype.matches =
        Element.prototype.matchesSelector ||
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector ||
        Element.prototype.oMatchesSelector ||
        Element.prototype.webkitMatchesSelector;

    // model ------------------------------------------------------------------------------------------------------------

    var i;

    var nodes = {
        zoom: document.querySelector('[z]'),
        elements: document.querySelectorAll('td[s]')
    };

    var model = {
        zoom: parseInt(nodes.zoom.getAttribute('z')),
    };
    model.elements = function initElements() {
        var elements = {};
        for(i = 0; i < nodes.elements.length; i++) {
            elements[nodes.elements[i].getAttribute('s')] = {
                zoomAvailable: model.zoom,
                node: nodes.elements[i]
            };
        }
        return elements;
    }();
    model.zoomWith = function(mod) {
        if((mod < 0 && model.zoom > 1) || (mod > 0 && model.zoom < 4)) {
            model.zoom = model.zoom + mod;
            view.zoomTo(model.zoom);
        }
    };
    model.addFieldsForElement = function(data) {
        var el = model.elements[data.symbol];
        el.zoomAvailable = Math.max(el.zoomAvailable, model.zoom);
        view.injectFieldsForElement(data);
        view.showFieldsForElement(data.symbol);
    };

    // view ------------------------------------------------------------------------------------------------------------

    var view = {};
    view.zoomTo = function (zoom) {
        nodes.zoom.setAttribute('z', zoom);

        var symbolsToShow = Object.keys(model.elements);
        var symbolsToFetch = symbolsToShow.reduce(function(toShow, symbol) {
             if(model.elements[symbol].zoomAvailable < zoom) {
                 toShow.push(symbol);
             }
             return toShow;
        }, []);

        if(symbolsToFetch.length) {
            fetch('/fields?z=' + zoom + '&s=' + encodeURIComponent(JSON.stringify(symbolsToFetch)), function (data) {
                data.forEach(model.addFieldsForElement);
            });
        } else {
            symbolsToShow.forEach(view.showFieldsForElement);
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

    view.showFieldsForElement = function (symbol) {

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
        }, 100);
    };

    // controller ------------------------------------------------------------------------------------------------------

    var controller = {};
    controller.listen = function() {
        document.addEventListener('click', function(event) {
            var el = event.target;
            if(el.matches('button[zoom]')) {
                model.zoomWith(parseInt(el.value));
            }
        });
    };

    controller.listen();

    //util
    function fetch(path, cb) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                cb(JSON.parse(xhr.responseText));
            }
        };
        xhr.open('GET', path);
        xhr.send(null);
    }


})(window, document);
