'use strict';

const
    marked = require('marked'),
    Handlebars = require('handlebars'),
    esc = Handlebars.Utils.escapeExpression;

marked.setOptions({
    gfm: true,
    tables: false
});

const zoomLevels = {
    MIN: 1,
    MAX: 4
};

module.exports = {

    isProduction: function(opts) {
        return opts.data.env === 'production';
    },

    incrementZoom: function(zoom) {
        return Math.min(zoom + 1, zoomLevels.MAX);
    },

    decrementZoom: function(zoom) {
        return Math.max(zoom - 1, zoomLevels.MIN);
    },
    
    range : function range(from, to, opts) {
        let i, out = ``;
        for (i = from; i < to; i += 1 ) {
            out += opts.fn({
                'index': i
            });
        }
        return out;
    },
    
    getElementAtPosition: function(period, group, opts) {
        const elements = opts.data.elements;
        return elements.find(el => el.period === period && el.group === group);
    },

    toInitialism: function(word) {
        return word.split(/\s+/).map(word => word.charAt(0)).join('');
    },

    equal: function() {
        const values = [].slice.call(arguments);
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

    formatAtomicMass: function(mass) {
        
        if(typeof mass === 'string') {
            mass = mass.replace(/(.+)\(.+\)/, (match, p1) => {
                return p1;
            });    
        }
        
        return parseFloat(parseFloat(mass).toFixed(3));
    },

    formatIsotopes: function (isotopesArr, symbol) {
        const formatted = isotopesArr.map(mass => `<sup>${esc(mass)}</sup>${esc(symbol)}`).join(', ');
        return new Handlebars.SafeString(formatted);
    },
    
    year: function () {
        return new Date().getFullYear();
    },

    resource: function(element, name) {
        return element.resources.find(resource => resource.name.toLowerCase() === name.toLowerCase()).url;
    },

    otherResources: function(element) {
        return element.resources.filter(resource => resource.name !== 'Youtube');
    },
    
    getLicense: function (licenseId, opts) {
        const licenses = opts.data.licenses;
        return licenses ? licenses.find(license => license.id === licenseId) : {};
    },

    marked: function(markdown) {
        return new Handlebars.SafeString(marked(markdown));
    }
};




