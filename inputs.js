window.STPhone = window.STPhone || {};

window.STPhone.Inputs = (function() {
    'use strict';

    let utils;
    let ui;

    function init(dependencies) {
        utils = dependencies.utils;
        ui = dependencies.ui;

        if (!utils || !ui) return;

        registerHotkeys();
        utils.log('Inputs Module Initialized.');
    }

    function registerHotkeys() {
        $(document).on('keydown', function(e) {
            // 채팅창이나 입력 필드 사용 중일 때는 무시
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            // 'x' 키 입력 (대소문자 무관)
            if (e.key.toLowerCase() === 'x') {
                ui.togglePhone();
            }
        });
    }

    return {
        init
    };
})();
