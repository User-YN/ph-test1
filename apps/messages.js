window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Messages = (function() {
    'use strict';

    // ==========================================
    // [설정] 헬퍼 함수
    // ==========================================
    function getSlashCommandParserInternal() {
        return window.SillyTavern?.getContext()?.SlashCommandParser || window.SlashCommandParser;
    }

    function normalizeModelOutput(raw) {
        if (raw == null) return '';
        if (typeof raw === 'string') return raw;
        if (typeof raw?.content === 'string') return raw.content;
        if (typeof raw?.text === 'string') return raw.text;
        try { return JSON.stringify(raw); } catch (e) { return String(raw); }
    }

    function formatBankTagForDisplay(text) {
        if (!text) return text;
        text = text.replace(/\[💰\s*(.+?)\s+송금\s+(.+?)\s*[:\s：]+\s*[\$₩€¥£]?\s*([\d,]+)\s*[\$₩€¥£원]?\s*\]/gi, (match, sender, receiver, amount) => `💰 ${sender.trim()}님이 ${receiver.trim()}님에게 ${amount.trim()}원을 송금했습니다.`);
        text = text.replace(/\[💰\s*(.+?)\s+출금\s+(.+?)\s*[:\s：]+\s*[\$₩€¥£]?\s*([\d,]+)\s*[\$₩€¥£원]?\s*\]/gi, (match, shop, user, amount) => `💰 ${shop.trim()}에서 ${amount.trim()}원 결제`);
        text = text.replace(/\[💰\s*.+?\s+잔액\s*[:\s：]+\s*[\$₩€¥£]?\s*[\d,]+\s*[\$₩€¥£원]?\s*\]/gi, '');
        return text.trim();
    }

    async function generateWithProfile(promptOrMessages, maxTokens = 1024) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const profileId = settings.connectionProfileId;
        const messages = Array.isArray(promptOrMessages) ? promptOrMessages : [{ role: 'user', content: promptOrMessages }];

        try {
            const context = window.SillyTavern?.getContext?.();
            if (!context) throw new Error('SillyTavern context not available');

            if (profileId) {
                const connectionManager = context.ConnectionManagerRequestService;
                if (connectionManager && typeof connectionManager.sendRequest === 'function') {
                    const overrides = {};
                    if (maxTokens) overrides.max_tokens = maxTokens;
                    const result = await connectionManager.sendRequest(profileId, messages, maxTokens, {}, overrides);
                    return normalizeModelOutput(result).trim();
                }
            }
            const fallbackPrompt = Array.isArray(promptOrMessages)
                ? promptOrMessages.map(m => `${m.role}: ${m.content}`).join('\n\n')
                : promptOrMessages;
            const parser = getSlashCommandParserInternal();
            const genCmd = parser?.commands['genraw'] || parser?.commands['gen'];
            if (!genCmd) throw new Error('AI 명령어를 찾을 수 없습니다');
            const result = await genCmd.callback({ quiet: 'true' }, fallbackPrompt);
            return String(result || '').trim();
        } catch (e) {
            const errorStr = String(e?.message || e || '');
            if (errorStr.includes('PROHIBITED_CONTENT') || errorStr.includes('SAFETY') || errorStr.includes('blocked')) return '';
            console.error('[Messages] generateWithProfile 실패:', e);
            throw e;
        }
    }

    // ==========================================
    // [CSS 수정] pointer-events: auto !important 추가 (클릭 문제 해결)
    // ==========================================
    const notificationCss = `<style id="st-phone-notification-css"> .st-bubble-notification-container { position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; } .st-bubble-notification { display: flex; align-items: flex-start; gap: 10px; pointer-events: auto; cursor: pointer; animation: bubbleSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); } .st-bubble-notification.hiding { animation: bubbleSlideOut 0.3s ease-in forwards; } @keyframes bubbleSlideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes bubbleSlideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } } .st-bubble-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.2); } .st-bubble-content { max-width: 280px; background: linear-gradient(135deg, #34c759 0%, #30b350 100%); color: white; padding: 10px 14px; border-radius: 18px; border-bottom-left-radius: 4px; font-size: 14px; line-height: 1.4; box-shadow: 0 4px 15px rgba(52, 199, 89, 0.4); word-break: break-word; } .st-bubble-sender { font-size: 11px; font-weight: 600; opacity: 0.9; margin-bottom: 3px; } .st-bubble-text { font-size: 14px; } </style>`;
    function ensureNotificationCss() { if (!$('#st-phone-notification-css').length) $('head').append(notificationCss); }
    ensureNotificationCss();

    const css = `<style>
            .st-messages-app { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 999; display: flex; flex-direction: column; background: var(--pt-bg-color, #f5f5f7); color: var(--pt-text-color, #000); font-family: var(--pt-font, -apple-system, sans-serif); }
            /* 기존 CSS 유지 */
            .st-messages-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 15px; }
            .st-messages-title { font-size: 28px; font-weight: 700; }
            .st-messages-new-group { background: var(--pt-accent, #007aff); color: white; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
            .st-messages-tabs { display: flex; padding: 0 20px; border-bottom: 1px solid var(--pt-border, #e5e5e5); }
            .st-messages-tab { flex: 1; padding: 14px; text-align: center; font-size: 14px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; color: var(--pt-sub-text, #86868b); transition: all 0.2s; }
            .st-messages-tab.active { color: var(--pt-accent, #007aff); border-bottom-color: var(--pt-accent, #007aff); }
            .st-messages-list { flex: 1; overflow-y: auto; padding: 0 20px; }
            .st-thread-item { display: flex; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--pt-border, #e5e5e5); cursor: pointer; }
            .st-thread-avatar { width: 50px; height: 50px; border-radius: 50%; background: #ddd; object-fit: cover; margin-right: 12px; }
            .st-thread-avatar-group { width: 50px; height: 50px; border-radius: 50%; background: var(--pt-accent, #007aff); margin-right: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; color: white; }
            .st-thread-info { flex: 1; min-width: 0; }
            .st-thread-name { font-size: 16px; font-weight: 600; }
            .st-thread-members { font-size: 12px; color: var(--pt-sub-text, #86868b); }
            .st-thread-preview { font-size: 14px; color: var(--pt-sub-text, #86868b); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .st-thread-meta { text-align: right; }
            .st-thread-time { font-size: 12px; color: var(--pt-sub-text, #86868b); }
            .st-thread-badge { background: #ff3b30; color: white; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 8px; margin-top: 4px; display: inline-block; min-width: 16px; text-align: center; }
            .st-messages-empty { text-align: center; padding: 80px 24px; color: var(--pt-sub-text, #86868b); }
            
            /* 채팅 화면 */
            .st-chat-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--pt-bg-color, #f5f5f7); display: flex; flex-direction: column; z-index: 1001; }
            .st-chat-header { display: flex; align-items: center; padding: 12px 15px; border-bottom: 1px solid var(--pt-border, #e5e5e5); background: var(--pt-bg-color, #f5f5f7); flex-shrink: 0; }
            .st-chat-back { background: none; border: none; color: var(--pt-accent, #007aff); font-size: 24px; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; position: absolute; left: 10px; top: 50%; transform: translateY(-50%); }
            .st-chat-contact { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
            .st-chat-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
            .st-chat-name { font-weight: 600; font-size: 14px; color: var(--pt-text-color, #000); }
            .st-chat-messages { flex: 1; overflow-y: auto; padding: 15px; padding-bottom: 10px; display: flex; flex-direction: column; gap: 8px; }
            
            /* 메시지 버블 스타일 */
            .st-msg-wrapper { display: flex; flex-direction: column; max-width: 100%; width: fit-content; min-width: 0; }
            .st-msg-wrapper.me { align-self: flex-end; align-items: flex-end; }
            .st-msg-wrapper.them { align-self: flex-start; align-items: flex-start; }
            .st-msg-sender-info { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
            .st-msg-sender-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
            .st-msg-sender-name { font-size: 12px; font-weight: 600; color: var(--pt-sub-text, #86868b); }
            
            .st-msg-bubble { max-width: 75%; min-width: fit-content; width: auto; padding: 10px 14px; border-radius: 18px; font-size: 15px; line-height: 1.4; word-wrap: break-word; word-break: keep-all; white-space: pre-wrap; position: relative; display: inline-block; }
            
            /* [수정] 클릭 가능 버블 스타일 강제 */
            .st-msg-bubble.clickable { cursor: pointer; pointer-events: auto !important; }
            
            .st-msg-bubble.me { align-self: flex-end; background: var(--msg-my-bubble, var(--pt-accent, #007aff)); color: var(--msg-my-text, white); border-bottom-right-radius: 4px; }
            .st-msg-bubble.them { align-self: flex-start; background: var(--msg-their-bubble, var(--pt-card-bg, #e5e5ea)); color: var(--msg-their-text, var(--pt-text-color, #000)); border-bottom-left-radius: 4px; }
            .st-msg-bubble.deleted { opacity: 0.6; font-style: italic; }
            .st-msg-image { max-width: 200px; border-radius: 12px; cursor: pointer; }
            
            /* 삭제 버튼 */
            .st-msg-delete-btn { position: absolute; left: -18px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; border-radius: 50%; background: rgba(255, 59, 48, 0.7); color: white; border: none; font-size: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.6; transition: opacity 0.2s, transform 0.2s; z-index: 10; pointer-events: auto !important; }
            .st-msg-delete-btn:hover { opacity: 1; transform: translateY(-50%) scale(1.2); }
            
            /* 기타 스타일 */
            .st-chat-input-area { display: flex; align-items: flex-end; padding: 14px 16px; padding-bottom: 45px; gap: 10px; border-top: 1px solid var(--pt-border, #e5e5e5); background: var(--pt-bg-color, #f5f5f7); flex-shrink: 0; }
            .st-chat-textarea { flex: 1; border: 1px solid var(--pt-border, #e5e5e5); background: var(--pt-card-bg, #f5f5f7); border-radius: 12px; padding: 12px 16px; font-size: 15px; resize: none; max-height: 100px; outline: none; color: var(--pt-text-color, #000); line-height: 1.4; }
            .st-chat-send { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--pt-accent, #007aff); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; transition: transform 0.1s, background 0.2s; }
            .st-chat-send:active { transform: scale(0.95); }
            /* ... (나머지 팝업, 모달 스타일 등 기존 코드와 동일) ... */
            .st-group-modal { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.5); z-index: 2000; display: none; align-items: center; justify-content: center; }
            .st-group-box { width: 90%; max-height: 80%; background: var(--pt-card-bg, #fff); padding: 20px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); color: var(--pt-text-color, #000); display: flex; flex-direction: column; }
            .st-group-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; text-align: center; }
            .st-group-actions { display: flex; gap: 10px; }
            .st-group-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
            .st-group-btn.cancel { background: #e5e5ea; color: #000; }
            .st-group-btn.create { background: var(--pt-accent, #007aff); color: white; }
        </style>`;

    const DEFAULT_AVATAR = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
    let currentContactId = null;
    let currentGroupId = null;
    let currentChatType = 'dm';
    let replyTimer = null;
    let consecutiveMessageCount = 0;
    let interruptTimer = null;
    let pendingMessages = [];
    let isGenerating = false;
    let queuedMessages = [];
    let bulkSelectMode = false;
    let replyToMessage = null;

    // ========== 저장소 관리 (LocalStorage) ==========
    function getStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        if (settings.recordMode === 'accumulate' && context.characterId !== undefined) {
            return 'st_phone_messages_char_' + context.characterId;
        }
        return 'st_phone_messages_' + context.chatId;
    }

    function loadAllMessages() {
        const key = getStorageKey();
        if (!key) return {};
        try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; }
    }

    function saveAllMessages(data) {
        const key = getStorageKey();
        if (!key) return;
        localStorage.setItem(key, JSON.stringify(data));
    }

    function getMessages(contactId) {
        const all = loadAllMessages();
        return all[contactId] || [];
    }

    function addMessage(contactId, sender, text, imageUrl = null, addTimestamp = false, rpDate = null, replyTo = null) {
        const all = loadAllMessages();
        if (!all[contactId]) all[contactId] = [];

        const msgData = {
            sender,
            text,
            image: imageUrl,
            timestamp: Date.now(),
            rpDate: rpDate
        };
        if (replyTo) msgData.replyTo = replyTo;

        all[contactId].push(msgData);
        saveAllMessages(all);
        return all[contactId].length - 1;
    }

    function updateMessage(contactId, msgIndex, newText, isDeleted = false) {
        const all = loadAllMessages();
        if (!all[contactId] || !all[contactId][msgIndex]) return false;
        all[contactId][msgIndex].text = newText;
        all[contactId][msgIndex].isDeleted = isDeleted;
        if (isDeleted) all[contactId][msgIndex].image = null;
        saveAllMessages(all);
        return true;
    }

    // ... (기타 저장소 함수: Groups, UnreadCount 등은 기존 로직 유지) ...
    function getGroupStorageKey() { /* 생략 - 기존과 동일 */ 
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        return 'st_phone_groups_' + context.chatId; 
    }
    function loadGroups() { 
        const key = getGroupStorageKey();
        try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; } 
    }
    function saveGroups(groups) {
        const key = getGroupStorageKey();
        localStorage.setItem(key, JSON.stringify(groups));
    }
    function getGroup(groupId) { return loadGroups().find(g => g.id === groupId); }
    function getGroupMessages(groupId) { return getGroup(groupId)?.messages || []; }
    function addGroupMessage(groupId, senderId, senderName, text, imageUrl = null) {
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        if (!group.messages) group.messages = [];
        group.messages.push({ senderId, senderName, text, image: imageUrl, timestamp: Date.now() });
        saveGroups(groups);
    }
    function getUnreadCount(contactId) {
        const key = getStorageKey();
        try { const unread = JSON.parse(localStorage.getItem(key + '_unread') || '{}'); return unread[contactId] || 0; } catch (e) { return 0; }
    }
    function setUnreadCount(contactId, count) {
        const key = getStorageKey();
        const unread = JSON.parse(localStorage.getItem(key + '_unread') || '{}');
        unread[contactId] = count;
        localStorage.setItem(key + '_unread', JSON.stringify(unread));
    }
    function getTotalUnread() {
        const key = getStorageKey();
        try { const unread = JSON.parse(localStorage.getItem(key + '_unread') || '{}'); return Object.values(unread).reduce((a, b) => a + b, 0); } catch (e) { return 0; }
    }
    function updateMessagesBadge() {
        const total = getTotalUnread();
        const $msgIcon = $('.st-app-icon[data-app="messages"]');
        $msgIcon.find('.st-app-badge').remove();
        if (total > 0) $msgIcon.append(`<div class="st-app-badge">${total > 99 ? '99+' : total}</div>`);
    }
    function formatTime(ts) { const d = new Date(ts); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

    // ==========================================
    // [UI 생성 및 제어]
    // ==========================================
    async function open() {
        currentContactId = null;
        currentGroupId = null;
        currentChatType = 'dm';

        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen?.length) return;
        $screen.empty();

        $screen.append(`
            ${css}
            <div class="st-messages-app">
                <div class="st-messages-header">
                    <div class="st-messages-title">메시지</div>
                    <button class="st-messages-new-group" id="st-new-group-btn"><i class="fa-solid fa-user-group"></i></button>
                </div>
                <div class="st-messages-tabs">
                    <div class="st-messages-tab active" data-tab="dm">1:1 대화</div>
                    <div class="st-messages-tab" data-tab="group">그룹</div>
                </div>
                <div class="st-messages-list" id="st-messages-list"></div>
            </div>
            `);

        renderDMList();
        attachMainListeners();
        
        // [중요] 글로벌 클릭 리스너 등록 (DOM 변경에 강함)
        bindGlobalClickEvents();
    }

    function renderDMList() {
        const $list = $('#st-messages-list');
        $list.empty();
        const contacts = window.STPhone.Apps?.Contacts?.getAllContacts() || [];
        const allMsgs = loadAllMessages();

        if (contacts.length === 0) {
            $list.html(`<div class="st-messages-empty">대화가 없습니다</div>`);
            return;
        }

        contacts.forEach(c => {
            const msgs = allMsgs[c.id] || [];
            const last = msgs[msgs.length - 1];
            const unread = getUnreadCount(c.id);
            let previewText = '새 대화';
            if (last) {
                if (last.image) previewText = '사진';
                else if (last.text) previewText = formatBankTagForDisplay(last.text);
            }
            $list.append(`
                <div class="st-thread-item" data-id="${c.id}" data-type="dm">
                    <img class="st-thread-avatar" src="${c.avatar || DEFAULT_AVATAR}">
                    <div class="st-thread-info">
                        <div class="st-thread-name">${c.name}</div>
                        <div class="st-thread-preview">${previewText}</div>
                    </div>
                    <div class="st-thread-meta">
                        ${unread > 0 ? `<div class="st-thread-badge">${unread}</div>` : ''}
                    </div>
                </div>
            `);
        });
    }

    function attachMainListeners() {
        $('.st-messages-tab').on('click', function() {
            $('.st-messages-tab').removeClass('active');
            $(this).addClass('active');
            const tab = $(this).data('tab');
            if (tab === 'dm') renderDMList();
            else renderGroupList(); // renderGroupList는 기존 코드 참조
            attachThreadClickListeners();
        });
        attachThreadClickListeners();
        // ... (그룹 생성 버튼 리스너 등)
    }

    function attachThreadClickListeners() {
        $('.st-thread-item').off('click').on('click', function() {
            const id = $(this).data('id');
            const type = $(this).data('type');
            if (type === 'group') openGroupChat(id);
            else openChat(id);
        });
    }

    // [핵심] 글로벌 클릭 이벤트 (메시지 옵션 메뉴)
    function bindGlobalClickEvents() {
        $(document).off('click.stMessages').on('click.stMessages', '.st-msg-bubble.clickable', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (bulkSelectMode) {
                $(this).toggleClass('bulk-selected');
                updateBulkCounter();
                return;
            }

            const idx = $(this).data('idx');
            const lineIdx = $(this).data('line-idx');
            const sender = $(this).data('sender');
            const isMyMessage = sender === 'me';
            
            showMsgOptions(currentContactId, idx, lineIdx, isMyMessage);
        });
    }

    function openChat(contactId) {
        currentContactId = contactId;
        currentChatType = 'dm';
        setUnreadCount(contactId, 0);
        updateMessagesBadge();

        const contact = window.STPhone.Apps.Contacts.getContact(contactId);
        if (!contact) return;

        const $screen = window.STPhone.UI.getContentElement();
        $screen.empty();

        const msgs = getMessages(contactId);
        let msgsHtml = '';

        msgs.forEach((m, index) => {
            const side = m.sender === 'me' ? 'me' : 'them';
            msgsHtml += `<div class="st-msg-wrapper ${side}">`;
            
            // 클릭 속성 (clickable 클래스와 !important CSS로 작동 보장)
            const clickAttr = `data-action="msg-option" data-idx="${index}" data-sender="${side}" class="st-msg-bubble ${side} clickable" title="옵션"`;

            if (m.image) {
                const imgAttr = clickAttr.replace('st-msg-bubble', 'st-msg-bubble image-bubble');
                msgsHtml += `<div ${imgAttr}><img class="st-msg-image" src="${m.image}"></div>`;
            }
            if (m.text) {
                const lines = m.text.split('\n');
                lines.forEach((line, idx) => {
                    const trimmed = formatBankTagForDisplay(line.trim());
                    if (trimmed) msgsHtml += `<div ${clickAttr} data-line-idx="${idx}">${trimmed}</div>`;
                });
            }
            msgsHtml += `</div>`;
        });

        $screen.append(`
            ${css}
            <div class="st-chat-screen">
                <div class="st-chat-header">
                    <button class="st-chat-back" id="st-chat-back">‹</button>
                    <div class="st-chat-contact">
                        <img class="st-chat-avatar" src="${contact.avatar || DEFAULT_AVATAR}">
                        <span class="st-chat-name">${contact.name}</span>
                    </div>
                </div>
                <div class="st-chat-messages" id="st-chat-messages">
                    ${msgsHtml}
                    <div class="st-typing-indicator" id="st-typing"><div class="st-typing-dots">...</div></div>
                </div>
                <div class="st-chat-input-area">
                    <textarea class="st-chat-textarea" id="st-chat-input" placeholder="메시지" rows="1"></textarea>
                    <button class="st-chat-send" id="st-chat-send">⬆</button>
                </div>
            </div>
        `);

        $('#st-chat-back').on('click', open);
        $('#st-chat-send').on('click', sendMessage);
        
        const el = document.getElementById('st-chat-messages');
        if (el) el.scrollTop = el.scrollHeight;
    }

    // ==========================================
    // [메시지 수신 및 외부 연동]
    // ==========================================
    
    // [수정] 말풍선 추가 함수
    function appendBubble(sender, text, imageUrl, msgIndex) {
        const side = sender === 'me' ? 'me' : 'them';
        const $container = $('#st-chat-messages');
        const clickAttr = `data-action="msg-option" data-idx="${msgIndex}" data-sender="${side}" class="st-msg-bubble ${side} clickable" title="옵션"`;

        let html = `<div class="st-msg-wrapper ${side}">`;
        
        if (imageUrl) {
            const imgAttr = clickAttr.replace('st-msg-bubble', 'st-msg-bubble image-bubble');
            html += `<div ${imgAttr}><img class="st-msg-image" src="${imageUrl}"></div>`;
        }
        if (text) {
             const lines = text.split('\n');
             lines.forEach((line, idx) => {
                 const trimmed = formatBankTagForDisplay(line.trim());
                 if (trimmed) html += `<div ${clickAttr} data-line-idx="${idx}">${trimmed}</div>`;
             });
        }
        html += `</div>`;

        $container.find('#st-typing').before(html);
        const el = document.getElementById('st-chat-messages');
        if (el) el.scrollTop = el.scrollHeight;
    }

    async function sendMessage() {
        const text = $('#st-chat-input').val().trim();
        if (!text || !currentContactId) return;
        $('#st-chat-input').val('');
        const newIdx = addMessage(currentContactId, 'me', text);
        appendBubble('me', text, null, newIdx);
    }

    // [핵심 수정] 외부 메시지 동기화 (사진/텍스트 분리)
    const syncExternalMessage = async (sender, text) => {
        if (!text) return;

        let contacts = window.STPhone.Apps?.Contacts?.getAllContacts() || [];
        if (contacts.length === 0) {
            await window.STPhone.Apps.Contacts.syncAutoContacts();
            contacts = window.STPhone.Apps.Contacts.getAllContacts();
            if (contacts.length === 0) return;
        }
        const contactId = contacts[0].id;

        // [IMG:...] 태그를 기준으로 텍스트와 이미지를 분리
        // 예: "안녕 [IMG:url] 반가워" -> ["안녕", "[IMG:url]", "반가워"]
        const tokens = text.split(/(\[IMG:[^\]]+\])/gi).map(t => t.trim()).filter(t => t);

        for (const token of tokens) {
            const imgMatch = token.match(/^\[IMG:\s*([^\]]+)\]$/i);
            let contentText = null;
            let contentImage = null;

            if (imgMatch) {
                // 이미지 태그인 경우
                contentImage = imgMatch[1].trim(); 
                contentText = null;
            } else {
                // 일반 텍스트인 경우
                contentText = token;
                contentImage = null;
            }

            // 각각 별도의 메시지로 저장 및 표시
            if (contentText || contentImage) {
                const newIdx = addMessage(contactId, sender, contentText, contentImage);
                
                const isPhoneActive = $('#st-phone-container').hasClass('active');
                if (isPhoneActive) {
                    await new Promise(r => setTimeout(r, 50)); // 자연스러운 연출
                    appendBubble(sender, contentText, contentImage, newIdx);
                }
            }
        }

        if (sender === 'them') {
            const unread = getUnreadCount(contactId) + 1;
            setUnreadCount(contactId, unread);
            updateMessagesBadge();
        }
    };

    // 옵션 팝업 등 나머지 기능은 기존 구조 활용
    function showMsgOptions(contactId, msgIndex, lineIndex, isMyMessage) {
        $('#st-msg-option-popup').remove();
        const allData = loadAllMessages();
        const msg = allData[contactId]?.[msgIndex];
        if (!msg) return;

        const html = `
            <div class="st-group-modal" id="st-msg-option-popup" style="display:flex;">
                <div class="st-group-box">
                    <div class="st-group-title">옵션</div>
                    <textarea id="st-edit-text" style="width:100%;height:80px;">${msg.text || ''}</textarea>
                    <div class="st-group-actions" style="margin-top:10px;">
                        <button class="st-group-btn create" id="st-save-btn">수정</button>
                        <button class="st-group-btn cancel" id="st-del-btn" style="background:red;color:white;">삭제</button>
                        <button class="st-group-btn cancel" id="st-close-btn">닫기</button>
                    </div>
                </div>
            </div>
        `;
        $('.st-messages-app').append(html);

        $('#st-save-btn').on('click', () => {
            updateMessage(contactId, msgIndex, $('#st-edit-text').val());
            $('#st-msg-option-popup').remove();
            openChat(contactId);
        });
        $('#st-del-btn').on('click', () => {
            if(confirm('삭제하시겠습니까?')) {
                updateMessage(contactId, msgIndex, '', true);
                $('#st-msg-option-popup').remove();
                openChat(contactId);
            }
        });
        $('#st-close-btn').on('click', () => $('#st-msg-option-popup').remove());
    }

    return {
        open,
        openChat,
        // receiveMessage, // 필요 시 주석 해제
        syncExternalMessage, // 외부 연동 핵심
        getTotalUnread,
        updateMessagesBadge,
        addHiddenLog: (speaker, text) => console.log(speaker, text)
    };
})();