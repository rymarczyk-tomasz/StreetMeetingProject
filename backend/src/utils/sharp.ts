// sharp is a native module: load it on first use, so a broken install (wrong
// platform/Node version on the server) only breaks image processing, not the whole API.
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
