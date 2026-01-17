window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Camera = (function() {
    'use strict';

    const css = `
        <style>
            .st-camera-app {
                position: absolute; top: 0; left: 0;
                width: 100%; height: 100%; z-index: 999;
                display: flex; flex-direction: column; background: #000;
            }
            .st-cam-viewfinder {
                flex: 1; margin: 10px; background: #1a1a1a; border-radius: 20px;
                background-size: contain; background-position: center;
                background-repeat: no-repeat;
                display: flex; align-items: center; justify-content: center;
                color: #666; font-size: 14px; position: relative; overflow: hidden;
            }
            .st-cam-placeholder {
                text-align: center;
                color: #555;
            }
            .st-cam-placeholder-icon {
                font-size: 36px;
                margin-bottom: 10px;
                opacity: 0.5;
            }
            .st-cam-controls {
                min-height: 140px; background: #000;
                display: flex; flex-direction: column;
                align-items: center; justify-content: flex-start; 
                padding: 15px 10px;
                gap: 15px;
            }
            .st-cam-input {
                width: 90%; padding: 12px 18px;
                border-radius: 25px; border: 1px solid #333;
                background: rgba(255,255,255,0.08); color: white;
                font-size: 14px; text-align: center; outline: none;
            }
            .st-cam-input:focus {
                border-color: #007aff;
                background: rgba(255,255,255,0.12);
            }
            .st-cam-input::placeholder { color: #666; }
            
            .st-shutter-btn {
                width: 70px; height: 70px; background: white; border-radius: 50%;
                border: 5px solid rgba(255,255,255,0.3); cursor: pointer;
                transition: transform 0.1s, opacity 0.2s;
            }
            .st-shutter-btn:hover { transform: scale(1.05); }
            .st-shutter-btn:active { transform: scale(0.95); }
            .st-shutter-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
            
            .st-cam-loader {
                width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3);
                border-top-color: #fff; border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }
            .st-cam-loading-text {
                color: #aaa; font-size: 13px; margin-top: 15px;
                text-align: center;
            }
            @keyframes spin { 
                0% { transform: rotate(0deg); } 
                100% { transform: rotate(360deg); } 
            }
            
            .st-cam-overlay-btns {
                position: absolute; bottom: 15px; right: 15px;
                display: flex; flex-direction: column; gap: 8px;
            }
            .st-cam-overlay-btn {
                background: rgba(0,0,0,0.7); color: white;
                padding: 8px 14px; border-radius: 20px; font-size: 12px; 
                cursor: pointer; border: 1px solid rgba(255,255,255,0.2);
                transition: background 0.2s;
                white-space: nowrap;
            }
            .st-cam-overlay-btn:hover { background: rgba(0,0,0,0.9); }
            
            .st-cam-status {
                position: absolute; top: 15px; left: 15px;
                background: rgba(0,0,0,0.6); color: #0f0;
                padding: 5px 12px; border-radius: 15px; font-size: 11px;
                display: none;
            }
            .st-cam-status.error { color: #f44; }
            .st-cam-status.processing { color: #ff0; }
        </style>
    `;

    let lastImageUrl = null;

    function getSlashCommandParser() {
        if (window.SlashCommandParser && window.SlashCommandParser.commands) {
            return window.SlashCommandParser;
        }
        
        if (window.SillyTavern) {
            const ctx = typeof window.SillyTavern.getContext === 'function' 
                ? window.SillyTavern.getContext() 
                : window.SillyTavern;
            
            if (ctx && ctx.SlashCommandParser && ctx.SlashCommandParser.commands) {
                return ctx.SlashCommandParser;
            }
        }

        if (typeof SlashCommandParser !== 'undefined' && SlashCommandParser.commands) {
            return SlashCommandParser;
        }

        return null;
    }

    function getExecuteSlashCommand() {
        if (window.SillyTavern) {
            const ctx = typeof window.SillyTavern.getContext === 'function' 
                ? window.SillyTavern.getContext() 
                : window.SillyTavern;
            
            if (ctx && typeof ctx.executeSlashCommands === 'function') {
                return ctx.executeSlashCommands;
            }
            if (ctx && typeof ctx.executeSlashCommand === 'function') {
                return ctx.executeSlashCommand;
            }
        }

        if (typeof executeSlashCommands === 'function') {
            return executeSlashCommands;
        }
        if (typeof executeSlashCommand === 'function') {
            return executeSlashCommand;
        }

        return null;
    }

    async function generateImage(prompt) {
        const parser = getSlashCommandParser();
        if (parser && parser.commands) {
            const sdCmd = parser.commands['sd'] || parser.commands['draw'] || parser.commands['imagine'];
            if (sdCmd && typeof sdCmd.callback === 'function') {
                try {
                    const result = await sdCmd.callback({ quiet: 'true' }, prompt);
                    if (result && typeof result === 'string') {
                        return result;
                    }
                } catch (e) {
                    console.warn("[Camera] sd.callback 실패:", e);
                }
            }
        }

        const executeCmd = getExecuteSlashCommand();
        if (executeCmd) {
            try {
                const result = await executeCmd(`/sd quiet=true ${prompt}`);
                if (result && result.pipe) {
                    return result.pipe;
                }
                if (typeof result === 'string') {
                    return result;
                }
            } catch (e) {
                console.warn("[Camera] executeSlashCommands 실패:", e);
            }
        }

        throw new Error("이미지 생성 명령어를 실행할 수 없습니다.\nSD 확장이 설치되어 있는지 확인해주세요.");
    }

    async function generateDetailedPrompt(userInput) {
        const parser = getSlashCommandParser();
        if (!parser || !parser.commands) {
            return userInput;
        }

        const genCmd = parser.commands['genraw'] || parser.commands['gen'];
        if (!genCmd || typeof genCmd.callback !== 'function') {
            return userInput;
        }

        try {
            // Settings와 Contacts는 이미 수정된 버전에서 동기식 getter를 제공하므로 안전함
            const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
            const userName = settings.userName || 'User';
            const userTags = settings.userTags || '';
            const cameraPromptTemplate = settings.cameraPrompt || '';

            const allContacts = window.STPhone.Apps?.Contacts?.getAllContacts?.() || [];
            let visualLibrary = `### Visual Tag Library\n`;
            visualLibrary += `1. [${userName} (User)]: ${userTags}\n`;

            let lineNumber = 2;
            for (const contact of allContacts) {
                const name = contact?.name;
                const tags = contact?.tags;
                if (!name || !tags) continue;
                visualLibrary += `${lineNumber}. [${name}]: ${tags}\n`;
                lineNumber++;
            }

            const aiInstruction = `${cameraPromptTemplate}

${visualLibrary}

### Task
User's request: "${userInput}"
Based on the Library, identify characters and use their tags.

Example output format:
<pic prompt="tags, comma, separated">`;

            const aiResponse = await genCmd.callback({ quiet: 'true' }, aiInstruction);
            
            const regex = /<pic[^>]*\sprompt="([^"]*)"[^>]*?>/i;
            const match = String(aiResponse).match(regex);
            
            if (match && match[1] && match[1].trim().length > 0) {
                return match[1];
            }
        } catch (e) {
            console.warn("[Camera] AI 프롬프트 생성 실패:", e);
        }

        return userInput;
    }

    function open() {
        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen || !$screen.length) return;
        $screen.empty();

        const html = `
            ${css}
            <div class="st-camera-app">
                <div class="st-cam-viewfinder" id="st-cam-preview">
                    <div class="st-cam-placeholder" id="st-cam-placeholder">
                        <div class="st-cam-placeholder-icon"><i class="fa-solid fa-camera"></i></div>
                        <div>촬영할 장면을 입력하세요</div>
                    </div>
                    <div class="st-cam-loader" id="st-cam-spinner" style="display:none;"></div>
                    <div class="st-cam-loading-text" id="st-cam-loading-text" style="display:none;"></div>
                    
                    <div class="st-cam-status" id="st-cam-status">● REC</div>
                    
                    <div class="st-cam-overlay-btns" id="st-cam-overlay-btns" style="display:none;">
                        <div class="st-cam-overlay-btn" id="st-save-album"><i class="fa-solid fa-download"></i> 앨범에 저장</div>
                        <div class="st-cam-overlay-btn" id="st-save-phone-bg"><i class="fa-solid fa-mobile-screen"></i> 폰 배경으로</div>
                    </div>
                </div>
                
                <div class="st-cam-controls">
                    <input type="text" class="st-cam-input" id="st-cam-prompt" 
                           placeholder="예: 소파 위에서 낮잠자는 고양이">
                    <div class="st-shutter-btn" id="st-cam-shutter"></div>
                </div>
            </div>
        `;
        $screen.append(html);
        attachListeners();
    }

    function attachListeners() {
        const $prompt = $('#st-cam-prompt');
        const $shutter = $('#st-cam-shutter');
        const $preview = $('#st-cam-preview');
        const $spinner = $('#st-cam-spinner');
        const $loadingText = $('#st-cam-loading-text');
        const $placeholder = $('#st-cam-placeholder');
        const $overlayBtns = $('#st-cam-overlay-btns');
        const $status = $('#st-cam-status');

        $shutter.off('click').on('click', async function() {
            const text = $prompt.val().trim();
            if (!text) { 
                toastr.warning("무엇을 촬영할지 입력해주세요!"); 
                $prompt.focus();
                return; 
            }

            $shutter.prop('disabled', true);
            $placeholder.hide();
            $spinner.show();
            $overlayBtns.hide();
            $preview.css('background-image', 'none');
            $status.removeClass('error').addClass('processing').text('● 처리중...').show();

            try {
                updateLoadingStatus("🧠 AI가 구도를 구상하는 중...");
                let finalPrompt = await generateDetailedPrompt(text);

                updateLoadingStatus("이미지 생성 중...");
                const imageUrl = await generateImage(finalPrompt);

                if (imageUrl && typeof imageUrl === 'string' && 
                    (imageUrl.includes('/') || imageUrl.startsWith('data:'))) {
                    
                    lastImageUrl = imageUrl;
                    
                    $preview.css({
                        'background-image': `url("${imageUrl}")`,
                        'background-size': 'contain',
                        'background-repeat': 'no-repeat',
                        'background-position': 'center'
                    });
                    $overlayBtns.show();
                    $status.removeClass('processing error').text('● 촬영완료').show();
                    
                    toastr.success("촬영 완료!");
                    
                } else {
                    throw new Error("이미지 생성에 실패했습니다.\n다른 프롬프트로 시도해보세요.");
                }

            } catch (err) {
                console.error("[Camera App Error]", err);
                toastr.error(err.message || "촬영 중 오류가 발생했습니다.");
                $status.removeClass('processing').addClass('error').text('● 오류').show();
                $placeholder.html(`
                    <div class="st-cam-placeholder-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
                    <div>촬영 실패</div>
                    <div style="font-size:11px;color:#666;margin-top:5px;">${err.message || '다시 시도해주세요'}</div>
                `).show();
            } finally {
                $shutter.prop('disabled', false);
                $spinner.hide();
                $loadingText.hide();
            }
        });

        function updateLoadingStatus(msg) {
            $('#st-cam-loading-text').text(msg).show();
        }

        $prompt.off('keypress').on('keypress', function(e) {
            if (e.which === 13) {
                e.preventDefault();
                $shutter.click();
            }
        });

        $('#st-save-album').off('click').on('click', function() {
            // Album.addPhoto는 이제 동기식으로 호출 가능 (백그라운드 저장)
            if (lastImageUrl && window.STPhone.Apps && window.STPhone.Apps.Album) {
                window.STPhone.Apps.Album.addPhoto({
                    url: lastImageUrl,
                    prompt: $prompt.val().trim(),
                    timestamp: Date.now()
                });
                toastr.success("앨범에 저장되었습니다!");
            } else if (!window.STPhone.Apps.Album) {
                toastr.error("앨범 앱을 찾을 수 없습니다.");
            }
        });

        $('#st-save-phone-bg').off('click').on('click', function() {
            if (lastImageUrl) {
                $('.st-phone-screen').css({
                    'background': `url("${lastImageUrl}")`,
                    'background-size': 'cover',
                    'background-position': 'center'
                });
                // 설정 저장(선택사항)
                if (window.STPhone.Apps?.Settings?.updateSetting) {
                    window.STPhone.Apps.Settings.updateSetting('wallpaper', `url("${lastImageUrl}")`);
                }
                toastr.success("📱 폰 배경화면으로 설정되었습니다!");
            }
        });
    }

    return { 
        open
    };
})();