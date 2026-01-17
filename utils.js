window.STPhone = window.STPhone || {};

window.STPhone.Utils = (function() {
    'use strict';

    const PREFIX = '📱 [ST Phone]';

    function log(message, ...args) {
        console.log(`${PREFIX} ${message}`, ...args);
    }

    function error(message, ...args) {
        console.error(`${PREFIX} ERROR: ${message}`, ...args);
    }

    return {
        log,
        error
    };
})();
