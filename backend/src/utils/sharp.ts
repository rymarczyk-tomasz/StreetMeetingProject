// native module - lazy load so a broken install only breaks images, not the api
let sharpModule;

function getSharp() {
    if (!sharpModule) {
        sharpModule = require("sharp");
        // Small VPS: decode one photo at a time and don't keep decoded images in cache.
        sharpModule.concurrency(1);
        sharpModule.cache(false);
    }
    return sharpModule;
}

module.exports = { getSharp };
