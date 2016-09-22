const
    Handlebars = require('handlebars');
    esc = Handlebars.Utils.escapeExpression;

module.exports = {
    
    range : function range(from, to, opts) {
        let i, out = ``;
        for (i = from; i < to; i += 1 ) {
            out += opts.fn({
                'index': i
            });
        }
        return out;
    },

    isZoom1: function (opts) {

    },

    isZoom2: function (opts) {

    },

    isZoom3: function (opts) {

    },

    isZoom4: function (opts) {

    },
    
    getElementAtPosition: function(period, group, opts) {
        const elements = opts.data.elements;
        return elements.find(el => el.period === period && el.group === group);
    },

    toInitialism: function(word) {
        return word.split(/\s+/).map(word => word.charAt(0)).join('');
    },

    equal: function(...values) {
        //remove options
        values.pop();
        var result = values.every(value => value === values[0]);
        return result;
    },
    
    isLanthanidesGroup: function(period, group) {
        return period === 6 && group === 3;
    },
    
    isActinidesGroup: function (period, group) {
        return period === 7 && group == 3;
    },

    lanthanides: function (opts) {
        const elements = opts.data.elements;
        return elements.filter(el => el.groupBlock === 'lanthanoid');
    },

    actinides: function (opts) {
        const elements = opts.data.elements;
        return elements.filter(el => el.groupBlock === 'actinoid');
    },

    formatElectronConfig: function (ec) {
        if(!ec) {
            return '';
        }

        const formatted = esc(ec).split(/[\s\.]/).map((part) => {
            if(part.startsWith('[')) {
                return `${part}&nbsp;`;
            }
            return part.replace(/(\d[pdsf])(\d*)/, (match, p1, p2) => {
                return p1 + (p2 ? `<sup>${p2}</sup>` : '');
            })
        }).join('');

        return new Handlebars.SafeString(formatted);
    },

    formatIsotopes: function (isotopesArr, symbol) {
        const formatted = isotopesArr.map(mass => `<sup>${esc(mass)}</sup>${esc(symbol)}`).join(', ');
        return new Handlebars.SafeString(formatted);
    }

};




