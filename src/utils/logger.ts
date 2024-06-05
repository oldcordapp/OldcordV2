let properties: {
    ignoreDebug: false
};

const logText = (text: string, type: string) => {
    if (type == 'debug' && properties.ignoreDebug) {
        return;
    }

    console.log(`[OLDCORDV2] <${type.toUpperCase()}>: ${text}`);
};

export {
    logText
}