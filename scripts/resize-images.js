'use strict';

const path = require('path');
const sharp = require('sharp');

const elements = require('../data/elements.json');

const height = 190;

for(let el of elements) {
    let img = path.join(__dirname,`../data/images/${el.symbol.toLowerCase()}.jpg`);
    console.log(`Resizing [${img}`);
    
    sharp(img)
        .resize(null, 190)
        .toFile(path.join(__dirname, `../data/images/${height}/${el.symbol.toLowerCase()}-${height}.jpg`), (err, info) => {
            if(err) {
                console.error(err);
                return;
            }
            
            console.log(info);
        });
}