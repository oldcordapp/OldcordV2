"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logText = void 0;
let properties;
const logText = (text, type) => {
    if (type == 'debug' && properties.ignoreDebug) {
        return;
    }
    console.log(`[OLDCORDV2] (2015) <${type.toUpperCase()}>: ${text}`);
};
exports.logText = logText;
