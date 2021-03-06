'use strict';

const
    express = require('express'),
    minifyHTML = require('express-minify-html'),
    compression = require('compression'),
    favicon = require('serve-favicon'),
    path = require('path'),
    fs = require('fs'),
    hbs = require('hbs'),
    handlebars = require('handlebars'),        
    helpers = require('./src/hbs-helpers');

hbs.handlebars = handlebars;

const inProduction = process.env.NODE_ENV === 'production';

const elementList = require('./data/elements.json');

const PARTIAL_DIR = 'views/partials';

for(let helper in helpers) {
    handlebars.registerHelper(helper, helpers[helper]);
}

function getTemplate(name) {
    const source = fs.readFileSync(path.join(__dirname, PARTIAL_DIR, `fields/${name}.hbs`), 'utf-8');
    return handlebars.compile(source);
}

const fieldTemplates = {
    name: getTemplate('name'),
    mass: getTemplate('mass'),
    details: getTemplate('details'),
    moreDetails: getTemplate('more-details'),
    resources: getTemplate('resources')
};

//populate a cache of compile partial templates for dynamic responses
const elementHtmlFields = {};
for(let element of elementList) {
    const fields = {};
    for(let fieldName of Object.keys(fieldTemplates)) {
        fields[fieldName] = fieldTemplates[fieldName]({ element: element });
    }
    elementHtmlFields[element.symbol] = fields
}

//init express
const app = express();
app.locals.elements = elementList;
app.locals.env = app.get('env');
app.locals.version = require('./package.json').version;
app.locals.css = fs.readFileSync(path.join(__dirname, 'static/build/main.css'), 'utf8');
hbs.localsAsTemplateData(app);
hbs.registerPartials(path.join(__dirname, PARTIAL_DIR));
app.set('view engine', 'hbs');
app.set('json spaces', 0);
app.set('x-powered-by', false)

app.use(minifyHTML({
    override:      true,
    htmlMinifier: {
        removeComments:            true,
        collapseWhitespace:        true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes:     true,
        removeEmptyAttributes:     true
    }
}));
app.use(compression());
app.use(favicon('./favicon.ico'));

const cacheOpts = inProduction ? { maxAge: 1000 * 60 * 60 * 24} : {};
app.use('/static', express.static('static', cacheOpts));

function getZoom(req) {
    const zoom = parseInt(req.query.z);
    return isNaN(zoom) || zoom < 0 || zoom > 4 ? 1 : zoom
}

app.get('/', (req, res, next) => {
    if(req.path !== '/') {
        return next();
    }

    res.render('index', {
        zoom: getZoom(req)
    });
});

app.get('/fields', (req, res, next) => {

    const zoom = getZoom(req);
    const symbols = req.query.s ? JSON.parse(req.query.s) : null;

    if(!Array.isArray(symbols)) {
        const err = new Error('I need some symbols');
        err.status = 400;
        next(err);
    }

    const responseData = symbols.map(symbol => {
        const datum = {
            symbol: symbol
        };
        const fields = elementHtmlFields[symbol];
        switch(zoom) {
            case 4:
                datum.r = fields.resources;
                datum.md = fields.moreDetails;
            case 3:
                datum.d = fields.details;
            case 2:
                datum.n = fields.name;
                datum.am = fields.mass;
        }
        return datum;
    });

    res.json(responseData);
});

// error handlers
app.use(function(err, req, res) {
    if(err instanceof Error) {
        console.error(err);
    }
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`Periodic table server is listening on port ${port} in ${inProduction ? 'production' : 'development' } mode.`)
}).on('error', function(err) {
    if(err.code === 'EADDRINUSE') {
        console.error('Cannot start server. Something is already running on port %s.', port);
    } else {
        console.error(err, 'Couldn\'t start server :(');
    }
});
