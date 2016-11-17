'use strict';
const elements = require('../data/elements.json');
let entryStart = `<url><loc>`;
let entryEnd = `</loc></url>`;

let xml = [];
for(let el of elements) {
    let entry = entryStart + '/' + el.name.toLowerCase() + entryEnd;
    xml.push(entry);
}

xml.join('\n ');

require('fs').writeFileSync(__dirname + '/sitemap.xml', xml, 'utf8');
