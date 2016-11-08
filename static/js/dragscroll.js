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
                    if (!el.hasAttribute('nochilddrag') || document.elementFromPoint(ev.pageX, ev.pageY) == container) {
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