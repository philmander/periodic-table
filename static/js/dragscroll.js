//https://github.com/asvd/dragscroll
(function (window, document) {
    var mousemove = 'mousemove';
    var mouseup = 'mouseup';
    var mousedown = 'mousedown';
    var addEventListener = 'addEventListener';
    var removeEventListener = 'removeEventListener';

    var dragged = [];
    var reset = function(i, el) {
        for (i = 0; i < dragged.length;) {
            el = dragged[i++];
            el = el.container || el;
            el[removeEventListener](mousedown, el.md, 0);
            window[removeEventListener](mouseup, el.mu, 0);
            window[removeEventListener](mousemove, el.mm, 0);
        }

        // cloning into array since HTMLCollection is updated dynamically
        dragged = [ document.documentElement, document.body ];
        for (i = 0; i < dragged.length;) {
            (function(el, lastClientX, lastClientY, pushed, scroller, cont){
                (cont = el.container || el)[addEventListener](
                    mousedown,
                    cont.md = function(e) {
                        if (!el.hasAttribute('nochilddrag') ||
                            document.elementFromPoint(
                                e.pageX, e.pageY
                            ) == cont
                        ) {
                            pushed = 1;
                            lastClientX = e.clientX;
                            lastClientY = e.clientY;

                            e.preventDefault();
                        }
                    }, 0
                );

                window[addEventListener](
                    mouseup, cont.mu = function() {pushed = 0;}, 0
                );

                window[addEventListener](
                    mousemove,
                    cont.mm = function(e) {
                        if (pushed) {
                            (scroller = el.scroller||el).scrollLeft -=
                                (- lastClientX + (lastClientX=e.clientX));
                            scroller.scrollTop -=
                                (- lastClientY + (lastClientY=e.clientY));
                        }
                    }, 0
                );
            })(dragged[i++]);
        }
    };

    if (document.readyState == 'complete') {
        reset();
    } else {
        window[addEventListener]('load', reset, 0);
    }
})(window, document);