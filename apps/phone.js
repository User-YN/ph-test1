window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Phone = (function() {
    'use strict';

    // ==========================================
    // [NEW] IndexedDB Helper (Messages 앱과 동일한 DB 사용)
    // ==========================================
    const IDB_NAME = 'STPhone_Data_DB';
    const IDB_VERSION = 1;
    const STORE_NAME = 'keyvalue_store';

    const DB = {
        db: null,
        init: function() {
            return new Promise((resolve, reject) => {
                if (this.db) return resolve(this.db);
                const request = indexedDB.open(IDB_NAME, IDB_VERSION);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };
                request.onsuccess = (e) => {
                    this.db = e.target.result;
                    resolve(this.db);
                };
                request.onerror = (e) => {
                    console.error('[Phone] DB Init Error', e);
                    reject(e);
                };
            });
        },
        get: async function(key) {
            await this.init();
            return new Promise((resolve) => {
                const tx = this.db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });
        },
        set: async function(key, value) {
            await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction(STORE_NAME, 'readwrite');
                const req = tx.objectStore(STORE_NAME).put(value, key);
                req.onsuccess = () => resolve();
                req.onerror = (e) => reject(e);
            });
        }
    };

    // ========== Helper: 유저 설정 비동기 로드 ==========
    async function getUserConfig(chatId) {
        if (!chatId) return {};
        try {
            // 기존 localStorage 키 패턴을 DB 키로 가정
            const config = (await DB.get('st_phone_config_' + chatId)) || {};
            // 만약 DB에 없고 localStorage에만 있다면 마이그레이션(선택사항)
            if (Object.keys(config).length === 0) {
                const local = localStorage.getItem('st_phone_config_' + chatId);
                if (local) return JSON.parse(local);
            }
            return config;
        } catch (e) {
            return {};
        }
    }

    // ========== Connection Profile을 사용한 AI 생성 함수 ==========
    function getSlashCommandParser() {
        return window.SillyTavern?.getContext()?.SlashCommandParser || window.SlashCommandParser;
    }

    function normalizeModelOutput(raw) {
        if (raw == null) return '';
        if (typeof raw === 'string') return raw;
        if (typeof raw?.content === 'string') return raw.content;
        if (typeof raw?.text === 'string') return raw.text;
        const choiceContent = raw?.choices?.[0]?.message?.content;
        if (typeof choiceContent === 'string') return choiceContent;
        const dataContent = raw?.data?.content;
        if (typeof dataContent === 'string') return dataContent;
        try {
            return JSON.stringify(raw);
        } catch (e) {
            return String(raw);
        }
    }

    async function generateWithProfile(prompt, maxTokens = 1024) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const profileId = settings.connectionProfileId;
        const debugId = Date.now();
        const startedAt = performance?.now?.() || 0;

        try {
            const context = window.SillyTavern?.getContext?.();
            if (!context) throw new Error('SillyTavern context not available');

            if (profileId) {
                const connectionManager = context.ConnectionManagerRequestService;
                if (connectionManager && typeof connectionManager.sendRequest === 'function') {
                    const overrides = {};
                    if (maxTokens) overrides.max_tokens = maxTokens;
                    const result = await connectionManager.sendRequest(
                        profileId,
                        [{ content: prompt, role: 'user' }],
                        maxTokens,
                        {},
                        overrides
                    );
                    return normalizeModelOutput(result).trim();
                }
            }

            const parser = getSlashCommandParser();
            const genCmd = parser?.commands['genraw'] || parser?.commands['gen'];
            if (!genCmd) throw new Error('AI 명령어를 찾을 수 없습니다');
            const result = await genCmd.callback({ quiet: 'true' }, prompt);
            return String(result || '').trim();

        } catch (e) {
            console.error('[Phone] generateWithProfile 실패:', e);
            throw e;
        }
    }

    const css = `<style> .st-phone-app { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 999; display: flex; flex-direction: column; background: var(--pt-bg-color, #f5f5f7); color: var(--pt-text-color, #000); font-family: var(--pt-font, -apple-system, sans-serif); } .st-phone-header { padding: 20px 20px 15px; font-size: 28px; font-weight: 700; } .st-phone-tabs { display: flex; border-bottom: 1px solid var(--pt-border, #e5e5e5); padding: 0 20px; } .st-phone-tab { flex: 1; padding: 14px; text-align: center; font-size: 14px; cursor: pointer; border-bottom: 2px solid transparent; color: var(--pt-sub-text, #86868b); transition: color 0.2s; } .st-phone-tab.active { color: var(--pt-accent, #007aff); border-bottom-color: var(--pt-accent, #007aff); } .st-phone-content { flex: 1; overflow-y: auto; padding: 10px 20px; } .st-call-item { display: flex; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--pt-border, #e5e5e5); } .st-call-avatar { width: 45px; height: 45px; border-radius: 50%; object-fit: cover; margin-right: 12px; } .st-call-info { flex: 1; } .st-call-name { font-size: 16px; font-weight: 500; } .st-call-type { font-size: 13px; display: flex; align-items: center; gap: 5px; } .st-call-time { font-size: 13px; color: var(--pt-sub-text, #86868b); margin-right: 10px; } .st-call-btn { width: 38px; height: 38px; border-radius: 50%; border: none; background: #34c759; color: white; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: transform 0.1s, background 0.2s; } .st-call-btn:active { transform: scale(0.95); } .st-phone-empty { text-align: center; padding: 80px 24px; color: var(--pt-sub-text, #86868b); } .st-contact-call-item { display: flex; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--pt-border, #e5e5e5); cursor: pointer; } .st-calling-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #1c1c1e; display: flex; flex-direction: column; align-items: center; padding: 50px 20px 40px; z-index: 1002; color: white; box-sizing: border-box; } .st-calling-info { text-align: center; flex-shrink: 0; } .st-calling-avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 3px solid rgba(255,255,255,0.2); } .st-calling-name { font-size: 24px; font-weight: 600; margin-bottom: 5px; } .st-calling-status { font-size: 15px; color: rgba(255,255,255,0.7); } .st-calling-message { width: 100%; height: auto; min-height: 0; margin: 20px 0; padding: 20px; box-sizing: border-box; background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; color: white; font-size: 17px; line-height: 1.5; text-align: center; word-break: keep-all; white-space: pre-wrap; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: height 0.2s ease; } .st-calling-message:empty { display: none; } .st-calling-input-area { width: 100%; flex-shrink: 0; margin-bottom: 15px; } .st-calling-input { width: 100%; padding: 14px 18px; border-radius: 25px; border: none; background: rgba(255,255,255,0.15); color: white; font-size: 15px; outline: none; box-sizing: border-box; } .st-calling-input::placeholder { color: rgba(255,255,255,0.5); } .st-calling-actions { display: flex; gap: 25px; flex-shrink: 0; } .st-call-action-btn { width: 60px; height: 60px; border-radius: 50%; border: none; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.1s; } .st-call-action-btn:active { transform: scale(0.95); } .st-call-action-btn.end { background: #ff3b30; color: white; } .st-call-action-btn.accept { background: #34c759; color: white; } .st-call-action-btn.mute { background: rgba(255,255,255,0.2); color: white; } .st-incoming-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #1c1c1e; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; z-index: 1003; color: white; box-sizing: border-box; } .st-incoming-status { font-size: 18px; color: rgba(255,255,255,0.7); margin-bottom: 20px; } .st-incoming-actions { display: flex; gap: 60px; margin-top: 50px; } .st-incoming-btn-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; } .st-incoming-label { font-size: 13px; color: rgba(255,255,255,0.7); } </style>`;

    const DEFAULT_AVATAR = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
    
    let callHistory = [];
    let currentCall = null;
    let callTimer = null;
    let callDuration = 0;
    let currentLog = [];
    let typeWriterInterval = null;
    let sentenceTimeout = null;
    let isAISpeaking = false;
    let lastAIUtterance = '';
    let currentDisplayedSentence = '';

    function getStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        if (settings.recordMode === 'accumulate' && context.characterId !== undefined) {
            return 'st_phone_calls_char_' + context.characterId;
        }
        return 'st_phone_calls_' + context.chatId;
    }

    // [Async]
    async function loadHistory() {
        const key = getStorageKey();
        if (!key) { callHistory = []; return; }
        try {
            callHistory = (await DB.get(key)) || [];
        } catch (e) { callHistory = []; }
    }

    // [Async]
    async function saveHistory() {
        const key = getStorageKey();
        if (!key) return;
        await DB.set(key, callHistory);
    }

    // [Async]
    async function deleteHistoryEntry(index) {
        await loadHistory();
        if (!Number.isInteger(index)) return;
        if (index < 0 || index >= callHistory.length) return;
        callHistory.splice(index, 1);
        await saveHistory();
    }

    // [Async]
    async function addToHistory(contactId, type) {
        await loadHistory();
        const contact = window.STPhone.Apps?.Contacts?.getContact(contactId);
        callHistory.unshift({
            contactId,
            contactName: contact?.name || 'Unknown',
            contactAvatar: contact?.avatar || '',
            type,
            timestamp: Date.now()
        });
        if (callHistory.length > 50) callHistory = callHistory.slice(0, 50);
        await saveHistory();
    }

    function formatTime(ts) {
        const d = new Date(ts);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    function formatDuration(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // [Async]
    async function open() {
        await loadHistory();
        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen?.length) return;
        $screen.empty();

        const contacts = window.STPhone.Apps?.Contacts?.getAllContacts() || [];

        let historyHtml = '';
        if (callHistory.length === 0) {
            historyHtml = `<div class="st-phone-empty"><div style="font-size:36px;opacity:0.5;margin-bottom:15px;"><i class="fa-solid fa-phone"></i></div><div>통화 기록이 없습니다</div></div>`;
        } else {
            callHistory.forEach((h, index) => {
                let typeIcon, typeLabel, typeColor;
                if (h.type === 'missed') {
                    typeIcon = '<i class="fa-solid fa-phone-slash"></i>'; typeLabel = '부재중 전화'; typeColor = '#ff3b30';
                } else if (h.type === 'rejected') {
                    typeIcon = '<i class="fa-solid fa-xmark"></i>'; typeLabel = '통화 거절됨'; typeColor = '#ff3b30';
                } else if (h.type === 'outgoing') {
                    typeIcon = '<i class="fa-solid fa-arrow-up-right"></i>'; typeLabel = '발신 (통화 성공)'; typeColor = 'var(--pt-sub-text, #86868b)';
                } else {
                    typeIcon = '<i class="fa-solid fa-arrow-down-left"></i>'; typeLabel = '수신 (통화 성공)'; typeColor = 'var(--pt-accent, #007aff)';
                }

                let durationStr = '';
                if (h.type !== 'missed' && h.type !== 'rejected' && h.duration > 0) {
                    const min = Math.floor(h.duration / 60);
                    const sec = h.duration % 60;
                    const timeTxt = min > 0 ? `${min}분 ${sec}초` : `${sec}초`;
                    durationStr = ` <span style="font-size:10px; font-weight:500; color:var(--pt-sub-text, #86868b); background:var(--pt-border, #e5e5e5); padding:2px 6px; border-radius:8px; margin-left:6px;">${timeTxt}</span>`;
                }
                const excludedTag = h.excludeFromContext === true ? '<span class="st-msg-no-context">미반영</span>' : '';
                const hasLog = h.log && h.log.length > 0;

                historyHtml += `
                    <div class="st-call-item">
                        <img class="st-call-avatar" src="${h.contactAvatar || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'">
                        <div class="st-call-info">
                            <div class="st-call-name">${h.contactName}${durationStr}${excludedTag}</div>
                            <div class="st-call-type" style="color: ${typeColor}; margin-top:3px;">${typeIcon} ${typeLabel}</div>
                        </div>
                        <div class="st-call-time">${formatTime(h.timestamp)}</div>
                        <div style="display:flex; gap:5px;">
                            <button class="st-call-btn" style="background:#ff3b30;" data-action="delete-history" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
                            ${hasLog ? `<button class="st-call-btn" style="background:#555;" data-action="view-log" data-index="${index}"><i class="fa-solid fa-file-lines"></i></button>` : ''}
                            <button class="st-call-btn" data-id="${h.contactId}" data-action="call"><i class="fa-solid fa-phone"></i></button>
                        </div>
                    </div>`;
            });
        }

        let contactsHtml = '';
        if (contacts.length === 0) {
            contactsHtml = `<div class="st-phone-empty"><div>연락처가 없습니다</div></div>`;
        } else {
            contacts.forEach(c => {
                contactsHtml += `
                    <div class="st-contact-call-item" data-id="${c.id}">
                        <img class="st-call-avatar" src="${c.avatar || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'">
                        <div class="st-call-info"><div class="st-call-name">${c.name}</div></div>
                        <button class="st-call-btn" data-id="${c.id}" data-action="call"><i class="fa-solid fa-phone"></i></button>
                    </div>`;
            });
        }

        $screen.append(`
            ${css}
            <div class="st-phone-app">
                <div class="st-phone-header">전화</div>
                <div class="st-phone-tabs">
                    <div class="st-phone-tab active" data-tab="recents">최근 기록</div>
                    <div class="st-phone-tab" data-tab="contacts">연락처</div>
                </div>
                <div class="st-phone-content" id="st-phone-content">
                    <div id="st-tab-recents">${historyHtml}</div>
                    <div id="st-tab-contacts" style="display:none;">${contactsHtml}</div>
                </div>
            </div>
        `);

        $('.st-phone-tab').on('click', function() {
            const tab = $(this).data('tab');
            $('.st-phone-tab').removeClass('active');
            $(this).addClass('active');
            $('#st-tab-recents, #st-tab-contacts').hide();
            $(`#st-tab-${tab}`).show();
        });

        $('[data-action="call"]').on('click', function(e) {
            e.stopPropagation();
            const id = $(this).data('id');
            if (id) makeCall(id);
        });

        $('[data-action="view-log"]').on('click', function(e) {
            e.stopPropagation();
            const index = $(this).data('index');
            openLogViewer(index);
        });

        $('[data-action="delete-history"]').on('click', async function(e) {
            e.stopPropagation();
            const index = Number($(this).data('index'));
            await deleteHistoryEntry(index);
            open();
        });

        $('.st-call-item').on('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const index = $(this).find('[data-action="delete-history"]').data('index');
            if (index !== undefined) {
                showCallContextMenu(e.pageX, e.pageY, Number(index), $(this));
            }
        });
    }

    async function showCallContextMenu(x, y, index, $item) {
        $('#st-call-context-menu').remove();
        await loadHistory();
        if (index < 0 || index >= callHistory.length) return;

        const h = callHistory[index];
        const isExcluded = h.excludeFromContext === true;
        const $phoneContainer = $('#st-phone-container');
        const phoneOffset = $phoneContainer.offset();
        const relativeX = x - phoneOffset.left;
        const relativeY = y - phoneOffset.top;

        const menuHtml = `
            <div id="st-call-context-menu" style="position: absolute; left: ${relativeX}px; top: ${relativeY}px; background: var(--pt-card-bg, #fff); border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); z-index: 3000; min-width: 160px; overflow: hidden;">
                <div class="st-context-item" data-action="toggle-context" data-index="${index}" style="padding: 14px 16px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--pt-text-color, #333); border-bottom: 1px solid var(--pt-border, #eee);">
                    <i class="fa-solid ${isExcluded ? 'fa-eye' : 'fa-eye-slash'}" style="width:16px; color:${isExcluded ? '#34c759' : '#ff9500'};"></i>
                    ${isExcluded ? '컨텍스트 반영' : '컨텍스트 미반영'}
                </div>
                <div class="st-context-item" data-action="close" style="padding: 14px 16px; cursor: pointer; font-size: 14px; color: var(--pt-sub-text, #86868b); text-align: center;">취소</div>
            </div>
        `;
        $phoneContainer.append(menuHtml);

        $('#st-call-context-menu [data-action="toggle-context"]').on('click', function() {
            const idx = $(this).data('index');
            toggleCallContextQuick(idx);
            $('#st-call-context-menu').remove();
        });
        $('#st-call-context-menu [data-action="close"]').on('click', () => $('#st-call-context-menu').remove());
        setTimeout(() => { $(document).one('click', () => $('#st-call-context-menu').remove()); }, 100);
    }

    async function toggleCallContextQuick(index) {
        await loadHistory();
        if (index < 0 || index >= callHistory.length) return;
        const h = callHistory[index];
        const wasExcluded = h.excludeFromContext === true;
        h.excludeFromContext = !wasExcluded;
        await saveHistory();
        if (h.excludeFromContext) toastr.info('🚫 이 통화 기록은 AI 컨텍스트에 반영되지 않습니다');
        else toastr.success('✅ 이 통화 기록이 AI 컨텍스트에 반영됩니다');
        open();
    }

    async function makeCall(contactId) {
        const contact = window.STPhone.Apps?.Contacts?.getContact(contactId);
        if (!contact) { toastr.error('연락처를 찾을 수 없습니다'); return; }

        let userName = 'User';
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const ctx = window.SillyTavern.getContext();
            userName = ctx.name2 || 'User';
            if (ctx.chatId) {
                const cfg = await getUserConfig(ctx.chatId);
                if (cfg.userName) userName = cfg.userName;
            }
        }

        currentLog = [];
        currentCall = { contactId, contact, startTime: null, isOutgoing: true };
        addHiddenLog('System', `[📞 Call Start] ${userName} -> ${contact.name}`);
        showCallingScreen(contact, true);
    }

    function receiveCall(contactInput) {
        let contact = null;
        if (typeof contactInput === 'object') contact = contactInput;
        else contact = window.STPhone.Apps?.Contacts?.getContact(contactInput);

        if (!contact) return;

        const $phoneContainer = $('#st-phone-container');
        if (!$phoneContainer.hasClass('active')) window.STPhone.UI.togglePhone();

        const $screen = window.STPhone.UI.getContentElement();
        $screen.append(`
            ${css}
            <div class="st-incoming-screen" id="st-incoming-screen">
                <div class="st-incoming-status"><i class="fa-solid fa-phone-volume"></i> 전화가 왔습니다</div>
                <img class="st-calling-avatar" src="${contact.avatar || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'">
                <div class="st-calling-name">${contact.name}</div>
                <div class="st-incoming-actions">
                    <div class="st-incoming-btn-wrap">
                        <button class="st-call-action-btn end" id="st-incoming-decline"><i class="fa-solid fa-phone-slash"></i></button>
                        <span class="st-incoming-label">거절</span>
                    </div>
                    <div class="st-incoming-btn-wrap">
                        <button class="st-call-action-btn accept" id="st-incoming-accept"><i class="fa-solid fa-phone"></i></button>
                        <span class="st-incoming-label">받기</span>
                    </div>
                </div>
            </div>
        `);

        $('#st-incoming-decline').on('click', async () => {
            let userName = 'User';
            if (window.SillyTavern && window.SillyTavern.getContext) {
                const ctx = window.SillyTavern.getContext();
                userName = ctx.name2 || 'User';
                if (ctx.chatId) {
                    const cfg = await getUserConfig(ctx.chatId);
                    if (cfg.userName) userName = cfg.userName;
                }
            }
            if (!contact.isTemp) await addToHistory(contact.id, 'missed');
            $('#st-incoming-screen').remove();
            addHiddenLog('System', `[📵 Call Declined by ${userName}] (${userName} explicitly rejected ${contact.name}'s call)`);
            triggerAINotification(contact, 'declined', userName);
        });

        $('#st-incoming-accept').on('click', () => {
            $('#st-incoming-screen').remove();
            addHiddenLog('System', `[📞 Incoming Call Accepted from ${contact.name}]`);
            currentLog = [];
            currentCall = { contactId: contact.id, contact: contact, startTime: null, isOutgoing: false };
            showCallingScreen(contact, false);
        });

        setTimeout(async () => {
            if ($('#st-incoming-screen').length) {
                let userName = 'User';
                if (window.SillyTavern && window.SillyTavern.getContext) {
                    const ctx = window.SillyTavern.getContext();
                    userName = ctx.name2 || 'User';
                    if (ctx.chatId) {
                        const cfg = await getUserConfig(ctx.chatId);
                        if (cfg.userName) userName = cfg.userName;
                    }
                }
                if (!contact.isTemp) await addToHistory(contact.id, 'missed');
                $('#st-incoming-screen').remove();
                toastr.warning(`📵 ${contact.name}의 부재중 전화`);
                addHiddenLog('System', `[📵 Call Missed] (${userName} did not answer ${contact.name}'s call - No response after 30 seconds)`);
                triggerAINotification(contact, 'missed', userName);
            }
        }, 30000);
    }

    async function triggerAINotification(contact, reason, userName) {
        try {
            let mainChatHistory = "";
            const ctx = window.SillyTavern?.getContext() || {};
            if (ctx.chat?.length) mainChatHistory = ctx.chat.slice(-10).map(m => `${m.name}: ${m.mes}`).join('\n');

            let charRealData = `Name: ${contact.name}`;
            if (ctx.characters && ctx.characterId !== undefined) {
                const liveChar = ctx.characters[ctx.characterId];
                if (liveChar && liveChar.name === contact.name) {
                    charRealData = `Name: ${liveChar.name}\nPersonality: ${liveChar.personality || ''}\nDescription: ${liveChar.description || ''}`;
                }
            }

            const reasonText = reason === 'declined' ? `${userName} has REJECTED your phone call.` : `${userName} did NOT ANSWER your phone call (missed call after 30 seconds).`;
            const prompt = `[System Note: Phone Call Event]\n${reasonText}\n### Character\n${charRealData}\n### Recent Context\n${mainChatHistory}\n### Task\nAs ${contact.name}, send a SHORT text message (SMS) reaction to ${userName} about the missed/declined call.\nKeep it in character. Express your feelings naturally (disappointed, worried, annoyed, etc. based on personality).\nResponse should be 1-2 sentences max.\n### Response Format (JSON Only)\n{"text": "YOUR_SMS_MESSAGE"}`;

            const response = await generateWithProfile(prompt);
            let rawResult = String(response).trim();
            let smsText = rawResult;
            try {
                const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
                if (jsonMatch) smsText = JSON.parse(jsonMatch[0]).text || smsText;
            } catch(e) {}
            smsText = smsText.replace(/"/g, '').trim();
            if (!smsText || smsText.length < 2) return;

            if (window.STPhone.Apps && window.STPhone.Apps.Messages) {
                let targetContactId = contact.id;
                if (contact.isTemp) {
                    const contacts = window.STPhone.Apps.Contacts?.getAllContacts() || [];
                    const found = contacts.find(c => c.name === contact.name);
                    if (found) targetContactId = found.id;
                }
                if (targetContactId && !contact.isTemp) {
                    // [Async] Messages.receiveMessage 호출
                    await window.STPhone.Apps.Messages.receiveMessage(targetContactId, smsText);
                    addHiddenLog(contact.name, `[📩 ${contact.name} -> ${userName}]: ${smsText}`);
                }
            }
        } catch (e) { console.error('[Phone] AI notification failed:', e); }
    }

    function showCallingScreen(contact, isOutgoing) {
        const $screen = window.STPhone.UI.getContentElement();
        $screen.append(`
            ${css}
            <div class="st-calling-screen" id="st-calling-screen">
                <div class="st-calling-info">
                    <img class="st-calling-avatar" src="${contact.avatar || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'">
                    <div class="st-calling-name">${contact.name}</div>
                    <div class="st-calling-status" id="st-call-status">연결 중...</div>
                </div>
                <div class="st-calling-message" id="st-call-message"></div>
                <div class="st-calling-input-area" id="st-call-input-area" style="display:none;">
                    <input class="st-calling-input" id="st-call-input" placeholder="말하기...">
                </div>
                <div class="st-calling-actions">
                    <button class="st-call-action-btn mute" id="st-call-mute"><i class="fa-solid fa-microphone-slash"></i></button>
                    <button class="st-call-action-btn end" id="st-call-end"><i class="fa-solid fa-phone-slash"></i></button>
                </div>
            </div>
        `);

        if (!isOutgoing) {
            currentCall.startTime = Date.now();
            $('#st-call-status').text('통화 중 0:00').css('color', '#4ade80');
            $('.st-calling-avatar').css('animation', 'none');
            callTimer = setInterval(() => {
                callDuration++;
                $('#st-call-status').text(`통화 중 ${formatDuration(callDuration)}`);
            }, 1000);
            setTimeout(() => {
                $('#st-call-input-area').fadeIn(200);
                $('#st-call-input').focus();
            }, 500);
            attachCallListeners();
            return;
        }

        setTimeout(async () => {
            if (!currentCall) return;
            $('#st-call-status').text('신호 가는 중...');
            $('.st-calling-avatar').css('animation', 'pulse 1.5s infinite');

            try {
                let mainChatHistory = "";
                let userName = "User";
                if (window.SillyTavern && window.SillyTavern.getContext) {
                    const ctx = window.SillyTavern.getContext();
                    userName = ctx.name2 || "User";
                    if (ctx.chatId) {
                        const cfg = await getUserConfig(ctx.chatId);
                        if (cfg.userName) userName = cfg.userName;
                    }
                    if (ctx.chat && ctx.chat.length > 0) {
                        mainChatHistory = ctx.chat.slice(-15).map(m => `${m.name}: ${m.mes}`).join('\n');
                    }
                }

                const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
                let pickupPromptTemplate = settings.phonePickupPrompt || `[System Instruction: Incoming Voice Call Simulation]\nYou are "{{char}}". User "{{user}}" is calling you on the phone.\n### Task\nAnalyze the relationship and current situation, then output a JSON object defined below.\n1. **pickup**: boolean (true = Accept Call, false = Reject Call)\n2. **content**: string (The message)\n - If pickup=true: Your **FIRST SPOKEN LINE** when answering.\n - If pickup=false: The **Internal Reason** for rejection.\n### Format (Strict JSON)\n{"pickup": true, "content": "Hello, what's up?"}`;
                const oneShotPrompt = pickupPromptTemplate.replace(/\{\{char\}\}/g, contact.name).replace(/\{\{user\}\}/g, userName) + `\n\n### Context (Recent Chat)\n${mainChatHistory}`;

                const result = await generateWithProfile(oneShotPrompt);
                let decision = { pickup: true, content: "Hello?" };
                try {
                    const match = String(result).match(/\{[\s\S]*\}/);
                    if (match) decision = JSON.parse(match[0]);
                } catch (e) { }
                decision.content = decision.content.replace(/"/g, '').trim();

                if (decision.pickup === false) {
                    $('#st-call-status').text('통화 거절됨').css('color', '#ff3b30');
                    $('.st-calling-avatar').css('animation', 'none');
                    $('#st-call-message').html(`<div style="text-align:center; color:#ff453a; padding:20px; font-weight:600; opacity:0; animation:fadeIn 0.5s forwards;">[부재중]<br><span style="font-size:15px; font-weight:400; color:white; margin-top:10px; display:block;">"${decision.content}"</span></div>`).show();
                    addHiddenLog("System", `[📞 Call Declined by ${contact.name}]: ${decision.content}`);
                    setTimeout(() => endCall('rejected'), 3000);
                    return;
                }

                currentCall.startTime = Date.now();
                $('#st-call-status').text('통화 중 0:00').css('color', '#4ade80');
                $('.st-calling-avatar').css('animation', 'none');
                currentLog.push({ sender: contact.name, text: decision.content });
                addHiddenLog(contact.name, `[📞 ${contact.name} on Phone]: ${decision.content}`);
                appendCallMessage('them', decision.content, () => {
                    $('#st-call-input-area').fadeIn(200);
                    $('#st-call-input').val('').focus();
                });
                if (isOutgoing) $('#st-call-input-area').hide();
                callTimer = setInterval(() => {
                    callDuration++;
                    $('#st-call-status').text(`통화 중 ${formatDuration(callDuration)}`);
                }, 1000);
            } catch (err) {
                currentCall.startTime = Date.now();
                $('#st-call-status').text('통화 중 0:00').css('color', '#4ade80');
                appendCallMessage('them', "Hello?");
                callTimer = setInterval(() => {
                    callDuration++;
                    $('#st-call-status').text(`통화 중 ${formatDuration(callDuration)}`);
                }, 1000);
            }
        }, 1500);
        attachCallListeners();
    }

    function attachCallListeners() {
        $('#st-call-end').off('click').on('click', function() {
            endCall(null, 'user');
        });
        $('#st-call-input').off('keydown').on('keydown', async function(e) {
            if (e.key === 'Enter') {
                const text = $(this).val().trim();
                if (text) {
                    $(this).val('');
                    await handleCallInput(text);
                }
            }
        });
    }

    async function handleCallInput(text) {
        if (!currentCall) return;
        const contact = currentCall.contact;
        $('#st-call-input-area').fadeOut(200);
        appendCallMessage('me', text);
        currentLog.push({ sender: '나', text: text });

        let finalUserName = 'User';
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const ctx = window.SillyTavern.getContext();
            finalUserName = ctx.name2 || 'User';
            if (ctx.chatId) {
                const cfg = await getUserConfig(ctx.chatId);
                if (cfg.userName && cfg.userName.trim() !== '') {
                    finalUserName = cfg.userName;
                }
            }
        }
        addHiddenLog(finalUserName, `[📞 ${finalUserName} on Phone]: ${text}`);
        await generateAIResponse(contact, text);
    }

    async function generateAIResponse(contact, userText) {
        window.STPhone.isPhoneGenerating = true;
        try {
            let ctx = window.SillyTavern?.getContext() || {};
            let userSettings = { name: ctx.name2 || 'User', persona: '' };
            let mainChatHistory = "";
            if (ctx.chat?.length) mainChatHistory = ctx.chat.slice(-15).map(m => `${m.name}: ${m.mes}`).join('\n');
            if (ctx.chatId) {
                const cfg = await getUserConfig(ctx.chatId);
                if (cfg.userName) userSettings.name = cfg.userName;
                if (cfg.userPersonality) userSettings.persona = cfg.userPersonality;
            }
            let calendarEventsPrompt = '';
            try {
                const Store = window.STPhone?.Apps?.Store;
                if (Store && typeof Store.isInstalled === 'function' && Store.isInstalled('calendar')) {
                    const Calendar = window.STPhone?.Apps?.Calendar;
                    if (Calendar && Calendar.isCalendarEnabled() && typeof Calendar.getEventsOnlyPrompt === 'function') {
                        calendarEventsPrompt = Calendar.getEventsOnlyPrompt() || '';
                    }
                }
            } catch (calErr) {}

            let charRealData = `Name: ${contact.name}\nPersonality: ${contact.persona || 'Unknown'}`;
            if (ctx.characters && ctx.characterId !== undefined) {
                const liveChar = ctx.characters[ctx.characterId];
                if (liveChar && liveChar.name === contact.name) {
                    charRealData = `### Full Character Definition\nName: ${liveChar.name}\nDescription: ${liveChar.description || ''}\nPersonality: ${liveChar.personality || ''}\nScenario: ${liveChar.scenario || ''}`;
                }
            }

            let situationInstruction = "";
            let currentTurnLine = "";
            if (userText === null) {
                situationInstruction = `Situation: ${userSettings.name} just called ${contact.name}. ${contact.name} picks up the phone.`;
                currentTurnLine = `(Waiting for ${contact.name}'s first greeting...)`;
            } else {
                situationInstruction = `Situation: Ongoing Phone Call between ${contact.name} and ${userSettings.name}.`;
                currentTurnLine = `${userSettings.name}: "${userText}"`;
            }

            const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
            const phoneCallRules = settings.phoneCallPrompt || `### 📞 Strict Phone Call Rules (MUST FOLLOW)\n1. **Language:** Respond ONLY in **Korean**.\n2. **Format:** DO NOT use quotation marks ("") around speech. Just write the raw text.\n3. **No Prose:** DO NOT write novel-style descriptions, actions, or inner thoughts.\n4. **Audio Only:** Output ONLY what can be heard through the phone (Speech) and audible sounds.\n5. **Sound Effects:** Put distinct sounds in parentheses like (한숨), (웃음).\n6. **Termination:** To hang up the phone, append [HANGUP] at the very end of your response.\n### Response Format (JSON Only)\n{"text": "대사_입력"}`;
            const prompt = `[System Note: ${situationInstruction}]\nRoleplay as "${contact.name}".\n${charRealData}\n### Interlocutor (User) Profile\nName: ${userSettings.name}\nDetails: ${userSettings.persona}\n${phoneCallRules}\n### Context (Chat History)\n${mainChatHistory}\n${calendarEventsPrompt}\n### Current Turn\n${currentTurnLine}`;

            const response = await generateWithProfile(prompt);
            let rawResult = String(response).trim();
            let aiText = rawResult;
            try {
                const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
                if (jsonMatch) aiText = JSON.parse(jsonMatch[0]).text || aiText;
            } catch(e) {}
            aiText = aiText.replace(/"/g, '').trim();

            let shouldHangUp = false;
            if (aiText.includes('[HANGUP]')) {
                shouldHangUp = true;
                aiText = aiText.replace(/\[HANGUP\]/gi, '').trim();
            }
            if (!aiText) aiText = "...";

            currentLog.push({ sender: contact.name, text: aiText });
            const status = shouldHangUp ? '(Hung up)' : '';
            addHiddenLog(contact.name, `[📞 ${contact.name} on Phone]: ${aiText} ${status}`);

            appendCallMessage('them', aiText, () => {
                if (shouldHangUp) {
                    $('#st-call-status').text('Call Ended').css('color', '#ff3b30');
                    setTimeout(() => endCall(null, 'ai'), 1000);
                } else {
                    $('#st-call-input-area').fadeIn(200);
                    $('#st-call-input').val('').focus();
                }
            });
        } catch (e) {
            console.error(e);
            appendCallMessage('them', '...');
            $('#st-call-input-area').fadeIn();
        } finally {
            window.STPhone.isPhoneGenerating = false;
        }
    }

    function appendCallMessage(sender, text, onComplete = null) {
        const $msgArea = $('#st-call-message');
        if (typeWriterInterval) clearInterval(typeWriterInterval);
        if (sentenceTimeout) clearTimeout(sentenceTimeout);
        typeWriterInterval = null;
        sentenceTimeout = null;

        if (sender === 'them') {
            isAISpeaking = true;
            lastAIUtterance = text;
        }

        $msgArea.empty();
        const nameLabel = sender === 'me' ? '나' : (currentCall ? currentCall.contact.name : '상대방');
        const color = sender === 'me' ? '#007aff' : '#34c759';
        $msgArea.html(`<div style="width:100%;"><div style="font-size:13px; color:${color}; margin-bottom:12px; font-weight:bold; letter-spacing:0.5px;">${nameLabel}</div><div id="st-typewriter-text" style="min-height:24px;"></div></div>`);
        const $textBox = $('#st-typewriter-text');

        if (sender === 'me') {
            $textBox.text(text);
            if (onComplete) onComplete();
            return;
        }

        const sentences = text.match(/[^.!?\n]+[.!?\n]+["']?|[^.!?\n]+$/g) || [text];
        let currentSentenceIndex = 0;

        function playNextSentence() {
            if (currentSentenceIndex >= sentences.length) {
                isAISpeaking = false;
                currentDisplayedSentence = '';
                if (onComplete) onComplete();
                return;
            }
            const sentence = sentences[currentSentenceIndex].trim();
            currentSentenceIndex++;
            if (!sentence) { playNextSentence(); return; }
            currentDisplayedSentence = sentence;
            $textBox.text('');
            let charIndex = 0;
            typeWriterInterval = setInterval(() => {
                $textBox.text($textBox.text() + sentence.charAt(charIndex));
                charIndex++;
                if (charIndex >= sentence.length) {
                    clearInterval(typeWriterInterval);
                    let readTime = 1000 + (sentence.length * 40);
                    if (currentSentenceIndex < sentences.length) {
                        sentenceTimeout = setTimeout(() => { playNextSentence(); }, readTime);
                    } else {
                        setTimeout(() => {
                            isAISpeaking = false;
                            currentDisplayedSentence = '';
                            if (onComplete) onComplete();
                        }, 1500);
                    }
                }
            }, 40);
        }
        playNextSentence();
    }

    async function endCall(status = null, endedBy = null) {
        const wasAISpeakingWhenHungUp = isAISpeaking && endedBy === 'user';
        const savedContact = currentCall?.contact;
        const savedUtterance = lastAIUtterance;
        const savedCurrentSentence = currentDisplayedSentence;

        if (callTimer) { clearInterval(callTimer); callTimer = null; }
        if (typeWriterInterval) clearInterval(typeWriterInterval);
        if (sentenceTimeout) clearTimeout(sentenceTimeout);
        isAISpeaking = false;
        lastAIUtterance = '';
        currentDisplayedSentence = '';

        if (currentCall) {
            const { contactId, contact, isOutgoing } = currentCall;
            let userName = 'User';
            if (window.SillyTavern && window.SillyTavern.getContext) {
                const ctx = window.SillyTavern.getContext();
                userName = ctx.name2 || 'User';
                if (ctx.chatId) {
                    const cfg = await getUserConfig(ctx.chatId);
                    if (cfg.userName) userName = cfg.userName;
                }
            }

            let type;
            if (status === 'rejected') type = 'rejected';
            else type = isOutgoing ? 'outgoing' : 'incoming';

            // [Async]
            await loadHistory();
            callHistory.unshift({
                contactId,
                contactName: contact?.name || 'Unknown',
                contactAvatar: contact?.avatar || '',
                type: type,
                timestamp: Date.now(),
                duration: callDuration,
                log: [...currentLog]
            });
            if (callHistory.length > 50) callHistory = callHistory.slice(0, 50);
            await saveHistory();

            if (status !== 'rejected') {
                if (endedBy === 'user') addHiddenLog('System', `[❌ Call Ended by ${userName}]`);
                else if (endedBy === 'ai') addHiddenLog('System', `[❌ Call Ended by ${contact?.name || 'Character'}]`);
                else addHiddenLog('System', `[❌ Call Ended]`);
            }
        }

        callDuration = 0;
        currentCall = null;
        $('#st-calling-screen').remove();
        
        // [Async]
        await open();
        if (status === 'rejected') toastr.error('통화가 거절되었습니다');
        else toastr.info('통화가 종료되었습니다');

        if (wasAISpeakingWhenHungUp && savedContact) {
            setTimeout(() => {
                generateHangUpTextReaction(savedContact, savedUtterance, savedCurrentSentence);
            }, 2000);
        }
    }

    async function generateHangUpTextReaction(contact, lastUtterance, currentSentence = '') {
        if (!contact) return;
        try {
            const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
            const prefill = settings.prefill || '';
            const maxContextTokens = settings.maxContextTokens || 4096;
            let userName = 'User';
            const ctx = window.SillyTavern?.getContext?.();
            if (ctx) {
                userName = ctx.name2 || 'User';
                if (ctx.chatId) {
                    const cfg = await getUserConfig(ctx.chatId);
                    if (cfg.userName) userName = cfg.userName;
                }
            }
            let hangUpDescription = '';
            if (currentSentence) hangUpDescription = `[${userName} hung up the phone while ${contact.name} was saying: "${currentSentence}"]`;
            else if (lastUtterance) hangUpDescription = `[${userName} hung up the phone while ${contact.name} was in the middle of speaking: "${lastUtterance}"]`;
            else hangUpDescription = `[${userName} hung up the phone while ${contact.name} was speaking]`;

            const messages = [];
            const systemContent = `### Character Info\nName: ${contact.name}\nPersonality: ${contact.persona || '(not specified)'}\n### User Info\nName: ${userName}\nPersonality: ${settings.userPersonality || '(not specified)'}\n### Instructions\nYou are ${contact.name}. You just had a phone call with ${userName}, but ${userName} suddenly hung up on you mid-sentence.\nWrite a SHORT text message (SMS) reacting to being hung up on.\nReact naturally based on what you were saying when cut off. This could be confused, annoyed, worried, sad, hurt, or any other appropriate reaction based on the character's personality.\nKeep it natural and in-character. 1-3 sentences max.\nDo NOT include any brackets, tags, or meta-text. Just write the message content directly.\n${prefill ? `Start your response with: ${prefill}` : ''}`;
            messages.push({ role: 'system', content: systemContent });

            if (ctx && ctx.chat && ctx.chat.length > 0) {
                const reverseChat = ctx.chat.slice().reverse();
                const collectedMessages = [];
                let currentTokens = 0;
                for (const m of reverseChat) {
                    const msgContent = m.mes || '';
                    const estimatedTokens = Math.ceil(msgContent.length / 2.5);
                    if (currentTokens + estimatedTokens > maxContextTokens) break;
                    collectedMessages.unshift({ role: m.is_user ? 'user' : 'assistant', content: msgContent });
                    currentTokens += estimatedTokens;
                }
                messages.push(...collectedMessages);
            }
            messages.push({ role: 'user', content: hangUpDescription });

            const response = await generateWithProfile(messages, 256);
            let replyText = String(response).trim();
            if (prefill && replyText.startsWith(prefill.trim())) replyText = replyText.substring(prefill.trim().length).trim();
            replyText = replyText.replace(/^\[.*?\]\s*/g, '').replace(/^"(.*)"$/, '$1').trim();
            if (!replyText || replyText.length < 2) replyText = "...?";

            if (window.STPhone.Apps?.Messages) {
                // [Async] Messages.receiveMessage 호출
                await window.STPhone.Apps.Messages.receiveMessage(contact.id, replyText);
                addHiddenLog(contact.name, `[📩 ${contact.name} -> ${userName}]: ${replyText}`);
            } else {
                const messagesKey = `st_phone_msgs_${ctx.chatId}_${contact.id}`;
                try {
                    const msgs = (await DB.get(messagesKey)) || [];
                    msgs.push({ sender: 'them', text: replyText, timestamp: Date.now(), image: null });
                    await DB.set(messagesKey, msgs);
                    addHiddenLog(contact.name, `[📩 ${contact.name} -> ${userName}]: ${replyText}`);
                    if (typeof toastr !== 'undefined') toastr.info(`${contact.name}: ${replyText}`, '새 문자');
                } catch (e) { console.error('[Phone] 문자 저장 실패:', e); }
            }
        } catch (e) { console.error('[Phone] generateHangUpTextReaction 실패:', e); }
    }

    function addHiddenLog(speaker, text) {
        if (!window.SillyTavern) return;
        const context = window.SillyTavern.getContext();
        if (!context || !context.chat) return;
        const newMessage = { name: speaker, is_user: false, is_system: false, send_date: Date.now(), mes: text, extra: { is_phone_log: true } };
        context.chat.push(newMessage);
        if (window.SlashCommandParser && window.SlashCommandParser.commands['savechat']) {
            window.SlashCommandParser.commands['savechat'].callback({});
        } else if (typeof saveChatConditional === 'function') {
            saveChatConditional();
        }
    }

    // [Async]
    async function openLogViewer(index) {
        await loadHistory();
        const h = callHistory[index];
        if (!h || !h.log || h.log.length === 0) { toastr.info("이 통화의 대화 내용이 없습니다."); return; }
        const isExcluded = h.excludeFromContext === true;
        const date = new Date(h.timestamp);
        const dateStr = `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        let logHtml = '';
        h.log.forEach(line => {
            const color = line.sender === '나' ? '#007aff' : 'var(--pt-text-color)';
            const align = line.sender === '나' ? 'right' : 'left';
            const bg = line.sender === '나' ? 'rgba(0,122,255,0.1)' : 'var(--pt-border, #eee)';
            logHtml += `<div style="margin-bottom:12px; text-align:${align};"><div style="font-size:12px; color:#888; margin-bottom:4px;">${line.sender}</div><div style="display:inline-block; padding:8px 12px; border-radius:12px; background:${bg}; color:${color}; font-size:14px; text-align:left;">${line.text}</div></div>`;
        });
        const viewerHtml = `
            <div id="st-log-viewer" style="position:absolute; top:0; left:0; width:100%; height:100%; background:var(--pt-bg-color, #1c1c1e); z-index:2000; display:flex; flex-direction:column;">
                <div style="padding:15px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; align-items:center;">
                    <button id="st-log-close" style="background:none; border:none; color:var(--pt-accent, #007aff); font-size:16px; cursor:pointer;">‹ 닫기</button>
                    <div style="flex:1; text-align:center; font-weight:bold; margin-right:40px;">통화 내용</div>
                </div>
                <div style="padding:12px 15px; border-bottom:1px solid var(--pt-border, #333); display:flex; align-items:center; justify-content:space-between; background:var(--pt-card-bg, #2c2c2e);">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-brain" style="color:var(--pt-sub-text, #86868b);"></i>
                        <span style="font-size:14px; color:var(--pt-text-color);">AI 컨텍스트 반영</span>
                        ${isExcluded ? '<span class="st-msg-no-context">미반영</span>' : ''}
                    </div>
                    <button id="st-log-toggle-context" style="padding:8px 16px; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; background:${isExcluded ? '#ff9500' : 'var(--pt-accent, #007aff)'}; color:white;">${isExcluded ? '반영하기' : '미반영으로'}</button>
                </div>
                <div style="flex:1; overflow-y:auto; padding:15px; color:var(--pt-text-color);">
                    <div style="text-align:center; color:#666; font-size:12px; margin-bottom:20px;">${dateStr} <br> ${h.contactName}님과의 통화</div>
                    ${logHtml}
                </div>
            </div>`;
        $('.st-phone-app').append(viewerHtml);
        $('#st-log-close').on('click', () => $('#st-log-viewer').remove());
        $('#st-log-toggle-context').on('click', () => toggleCallContext(index));
    }

    // [Async]
    async function toggleCallContext(index) {
        await loadHistory();
        if (index < 0 || index >= callHistory.length) return;
        const h = callHistory[index];
        const wasExcluded = h.excludeFromContext === true;
        h.excludeFromContext = !wasExcluded;
        await saveHistory();
        if (h.excludeFromContext) toastr.info('🚫 이 통화 기록은 AI 컨텍스트에 반영되지 않습니다');
        else toastr.success('✅ 이 통화 기록이 AI 컨텍스트에 반영됩니다');
        $('#st-log-viewer').remove();
        openLogViewer(index);
    }

    async function injectAiCallLogic() {
        const parser = getSlashCommandParser();
        if (!parser?.commands) return;
        const ctx = window.SillyTavern?.getContext?.();
        const charName = ctx?.characters?.[ctx?.characterId]?.name;
        if (charName) {
            const contacts = window.STPhone.Apps?.Contacts?.getAllContacts?.() || [];
            const contact = contacts.find(c => c.name === charName);
            if (contact?.disableProactiveCall) {
                if (parser.commands['eject']) {
                    try { await parser.commands['eject'].callback({}, 'st_phone_auto_call_logic'); } catch (e) {}
                }
                return;
            }
        }
        if (!parser.commands['inject']) return;
        const promptText = `\n[Phone Logic]\nIf you want to initiate a voice call with User, append [call to user] at the very end of your response.\nNEVER decide the User's reaction or whether they pick up. Just generate the tag and stop.\nWait for the system to process the call.`;
        try {
            await parser.commands['inject'].callback({ id: 'st_phone_auto_call_logic', position: 'chat', depth: 2, role: 'system' }, promptText);
        } catch (e) {}
    }

    function startIncomingCallObserver() {
        const chatRoot = document.getElementById('chat');
        if (!chatRoot) { setTimeout(startIncomingCallObserver, 2000); return; }
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('mes')) checkMessageForCallTag(node);
                });
                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    const target = mutation.target.parentElement?.closest('.mes');
                    if (target) checkMessageForCallTag(target);
                }
            });
        });
        observer.observe(chatRoot, { childList: true, subtree: true });
        setInterval(injectAiCallLogic, 5000);
    }

    function checkMessageForCallTag(msgNode) {
        if (msgNode.dataset.callChecked) return;
        if (msgNode.getAttribute('is_user') === 'true') return;
        if (!msgNode.classList.contains('last_mes')) return;
        const textDiv = msgNode.querySelector('.mes_text');
        if (!textDiv) return;
        const html = textDiv.innerHTML;
        if (html.toLowerCase().includes('[call to user]')) {
            msgNode.dataset.callChecked = "true";
            textDiv.innerHTML = html.replace(/\[call to user\]/gi, '').trim();
            const charName = msgNode.getAttribute('ch_name') || "Unknown";
            triggerIncomingCallByName(charName);
        }
    }

    function triggerIncomingCallByName(name) {
        const contacts = window.STPhone.Apps.Contacts.getAllContacts();
        let contact = contacts.find(c => c.name === name);
        if (!contact) {
            let avatar = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
            const ctx = window.SillyTavern?.getContext?.();
            if (ctx?.characters && ctx.characterId !== undefined) {
                const charData = ctx.characters[ctx.characterId];
                if (charData?.name === name && charData.avatar) {
                    avatar = charData.avatar;
                    if (!avatar.startsWith('http') && !avatar.startsWith('data')) avatar = '/characters/' + avatar;
                }
            }
            contact = { id: 'temp_' + Date.now(), name: name, avatar: avatar, persona: "", tags: "", isTemp: true };
        }
        if (contact.disableProactiveCall) return;
        receiveCall(contact);
    }

    $(document).ready(function() {
        setTimeout(startIncomingCallObserver, 3000);
    });

    return { open, makeCall, receiveCall, endCall };
})();