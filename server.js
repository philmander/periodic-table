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
const licenses = require('./data/licenses.json');

const PARTIAL_DIR = path.join(__dirname, 'views/partials');

for(let helper in helpers) {
    hbs.registerHelper(helper, helpers[helper]);
}

function getTemplate(name) {
    const source = fs.readFileSync(path.join(PARTIAL_DIR, `fields/${name}.hbs`), 'utf-8');
    return handlebars.compile(source);
}

const fieldTemplates = {
    number: getTemplate('number'),
    symbol: getTemplate('symbol'),
    name: getTemplate('name'),
    mass: getTemplate('mass'),
    ec: getTemplate('ec'),
    details: getTemplate('details'),
    moreDetails: getTemplate('more-details'),
    resources: getTemplate('resources'),
};

//populate a cache of compiled partial templates for dynamic responses
const elementHtmlFields = {};
for(let element of elementList) {
    const fields = {};
    for(let fieldName of Object.keys(fieldTemplates)) {
        fields[fieldName] = fieldTemplates[fieldName]({
            element: element
        }, {
            data: {
                licenses: licenses
            }
        });
    }
    elementHtmlFields[element.symbol] = fields
}

//init express
const app = express();
app.locals.elements = elementList;
app.locals.licenses = licenses;
app.locals.env = app.get('env');
app.locals.version = require('./package.json').version;
app.locals.css = fs.readFileSync(path.join(__dirname, 'static/build/main.css'), 'utf8');
hbs.localsAsTemplateData(app);
hbs.registerPartials(PARTIAL_DIR);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.set('json spaces', 0);
app.set('x-powered-by', false);

app.use(minifyHTML({
    override:      true,
    htmlMinifier: {
        removeComments:            true,
        collapseWhitespace:        true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes:     true,
        removeEmptyAttributes:     true,
        ignoreCustomComments: [ /^\sPeriodic\sTable\sMap/]
    }
}));
app.use(compression());
app.use(favicon(__dirname + '/favicon.ico'));

const cacheOpts = inProduction ? { maxAge: 1000 * 60 * 60 * 24} : {};
app.use('/static', express.static(__dirname + '/static', cacheOpts));
app.use('/images', express.static(__dirname + '/data/images', cacheOpts));
app.use('/sitemap.xml', express.static(__dirname + '/sitemap.xml'));

function getZoom(req) {
    const zoom = parseInt(req.query.z);
    return isNaN(zoom) || zoom < 0 || zoom > 4 ? 1 : zoom
}

function index(req, res, next) {

    const zoom = getZoom(req);

    if(zoom === 1 && req.query.z) {
        res.set('Link', '<http://periodictablemap.com/>; rel="canonical"')
    }

    res.render('index', {
        zoom: getZoom(req)
    });
}
app.get('/_', index); //for ga exlusion
app.get('/', index);

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
                datum.ec = fields.ec;
            case 1: 
                datum.an = fields.number;
        }
        return datum;
    });

    res.json(responseData);
});

app.use(function (req, res, next) {
    
    const urlPath = req.path.substr(1);
    let element = elementList.find(
        el => el.name.toLowerCase() === urlPath.toLowerCase() || el.symbol.toLowerCase() === urlPath.toLowerCase());
    if(element) {
        //if its a symbol or it contains a name with an uppercase letter
        if(urlPath.length < 3 || !/^[a-z]+$/.test(urlPath)) {
            //redirect to lowercase name
            res.status(301);
            return res.redirect('/' + element.name.toLowerCase());            
        } else {
            res.render('element', {
                element: element    
            });  
        }
    } else {
        const err = new Error('Not found');
        err.status = 404;
        next();
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
