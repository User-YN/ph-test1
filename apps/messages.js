window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Messages = (function() {
    'use strict';

    // ==========================================
    // [설정] 헬퍼 및 저장소 (IndexedDB)
    // ==========================================
    
    // [중요] IndexedDB 인스턴스 가져오기
    function getStorage() {
        if (window.STPhoneStorage) return window.STPhoneStorage;
        console.warn('[Messages] window.STPhoneStorage 미발견, localforage 사용 시도');
        return localforage; 
    }

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

    // 태그 정리 (송금 등)
    function formatBankTagForDisplay(text) {
        if (!text) return text;
        text = text.replace(/\[💰\s*(.+?)\s+송금\s+(.+?)\s*[:\s：]+\s*[\$₩€¥£]?\s*([\d,]+)\s*[\$₩€¥£원]?\s*\]/gi, (match, sender, receiver, amount) => `💰 ${sender.trim()}님이 ${receiver.trim()}님에게 ${amount.trim()}원을 송금했습니다.`);
        text = text.replace(/\[💰\s*(.+?)\s+출금\s+(.+?)\s*[:\s：]+\s*[\$₩€¥£]?\s*([\d,]+)\s*[\$₩€¥£원]?\s*\]/gi, (match, shop, user, amount) => `💰 ${shop.trim()}에서 ${amount.trim()}원 결제`);
        return text.trim();
    }

    // AI 생성 (기존 유지)
    async function generateWithProfile(promptOrMessages, maxTokens = 1024) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const profileId = settings.connectionProfileId;
        const messages = Array.isArray(promptOrMessages) ? promptOrMessages : [{ role: 'user', content: promptOrMessages }];

        try {
            const context = window.SillyTavern?.getContext?.();
            if (profileId && context?.ConnectionManagerRequestService) {
                const overrides = maxTokens ? { max_tokens: maxTokens } : {};
                const result = await context.ConnectionManagerRequestService.sendRequest(profileId, messages, maxTokens, {}, overrides);
                return normalizeModelOutput(result).trim();
            }
            const fallbackPrompt = Array.isArray(promptOrMessages) ? promptOrMessages.map(m => `${m.role}: ${m.content}`).join('\n\n') : promptOrMessages;
            const parser = getSlashCommandParserInternal();
            const genCmd = parser?.commands['genraw'] || parser?.commands['gen'];
            const result = await genCmd.callback({ quiet: 'true' }, fallbackPrompt);
            return String(result || '').trim();
        } catch (e) {
            console.error('[Messages] AI 생성 실패:', e);
            return '';
        }
    }

    // ==========================================
    // [CSS 수정] 클릭 문제 해결 (pointer-events)
    // ==========================================
    const notificationCss = `<style id="st-phone-notification-css"> .st-bubble-notification-container { position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; } .st-bubble-notification { display: flex; align-items: flex-start; gap: 10px; pointer-events: auto; cursor: pointer; animation: bubbleSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); } .st-bubble-notification.hiding { animation: bubbleSlideOut 0.3s ease-in forwards; } @keyframes bubbleSlideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes bubbleSlideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } } .st-bubble-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.2); } .st-bubble-content { max-width: 280px; background: linear-gradient(135deg, #34c759 0%, #30b350 100%); color: white; padding: 10px 14px; border-radius: 18px; border-bottom-left-radius: 4px; font-size: 14px; line-height: 1.4; box-shadow: 0 4px 15px rgba(52, 199, 89, 0.4); word-break: break-word; } .st-bubble-sender { font-size: 11px; font-weight: 600; opacity: 0.9; margin-bottom: 3px; } .st-bubble-text { font-size: 14px; } </style>`;
    function ensureNotificationCss() { if (!$('#st-phone-notification-css').length) $('head').append(notificationCss); }
    ensureNotificationCss();

    const css = `<style>
            .st-messages-app { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 999; display: flex; flex-direction: column; background: var(--pt-bg-color, #f5f5f7); color: var(--pt-text-color, #000); font-family: var(--pt-font, -apple-system, sans-serif); }
            /* ... (기존 레이아웃 CSS) ... */
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
            .st-thread-preview { font-size: 14px; color: var(--pt-sub-text, #86868b); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .st-thread-meta { text-align: right; }
            .st-thread-time { font-size: 12px; color: var(--pt-sub-text, #86868b); }
            .st-thread-badge { background: #ff3b30; color: white; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 8px; margin-top: 4px; display: inline-block; min-width: 16px; text-align: center; }
            .st-messages-empty { text-align: center; padding: 80px 24px; color: var(--pt-sub-text, #86868b); }
            
            /* 채팅방 */
            .st-chat-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--pt-bg-color, #f5f5f7); display: flex; flex-direction: column; z-index: 1001; }
            .st-chat-header { display: flex; align-items: center; padding: 12px 15px; border-bottom: 1px solid var(--pt-border, #e5e5e5); background: var(--pt-bg-color, #f5f5f7); flex-shrink: 0; }
            .st-chat-back { background: none; border: none; color: var(--pt-accent, #007aff); font-size: 24px; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; position: absolute; left: 10px; top: 50%; transform: translateY(-50%); }
            .st-chat-contact { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
            .st-chat-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
            .st-chat-name { font-weight: 600; font-size: 14px; color: var(--pt-text-color, #000); }
            .st-chat-messages { flex: 1; overflow-y: auto; padding: 15px; padding-bottom: 10px; display: flex; flex-direction: column; gap: 8px; }
            
            /* 메시지 버블 */
            .st-msg-wrapper { display: flex; flex-direction: column; max-width: 100%; width: fit-content; min-width: 0; }
            .st-msg-wrapper.me { align-self: flex-end; align-items: flex-end; }
            .st-msg-wrapper.them { align-self: flex-start; align-items: flex-start; }
            
            .st-msg-bubble { max-width: 75%; min-width: fit-content; width: auto; padding: 10px 14px; border-radius: 18px; font-size: 15px; line-height: 1.4; word-wrap: break-word; word-break: keep-all; white-space: pre-wrap; position: relative; display: inline-block; }
            
            /* [수정] 클릭 강제 활성화 */
            .st-msg-bubble.clickable { cursor: pointer; pointer-events: auto !important; }
            
            .st-msg-bubble.me { align-self: flex-end; background: var(--msg-my-bubble, var(--pt-accent, #007aff)); color: var(--msg-my-text, white); border-bottom-right-radius: 4px; }
            .st-msg-bubble.them { align-self: flex-start; background: var(--msg-their-bubble, var(--pt-card-bg, #e5e5ea)); color: var(--msg-their-text, var(--pt-text-color, #000)); border-bottom-left-radius: 4px; }
            .st-msg-bubble.deleted { opacity: 0.6; font-style: italic; }
            .st-msg-image { max-width: 200px; border-radius: 12px; cursor: pointer; }
            
            /* 기타 컴포넌트 */
            .st-chat-input-area { display: flex; align-items: flex-end; padding: 14px 16px; padding-bottom: 45px; gap: 10px; border-top: 1px solid var(--pt-border, #e5e5e5); background: var(--pt-bg-color, #f5f5f7); flex-shrink: 0; }
            .st-chat-textarea { flex: 1; border: 1px solid var(--pt-border, #e5e5e5); background: var(--pt-card-bg, #f5f5f7); border-radius: 12px; padding: 12px 16px; font-size: 15px; resize: none; max-height: 100px; outline: none; color: var(--pt-text-color, #000); line-height: 1.4; }
            .st-chat-send { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--pt-accent, #007aff); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
            
            /* 모달 */
            .st-group-modal { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.5); z-index: 2000; display: none; align-items: center; justify-content: center; }
            .st-group-box { width: 85%; background: var(--pt-card-bg, #fff); padding: 20px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); color: var(--pt-text-color, #000); display: flex; flex-direction: column; }
            .st-group-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; text-align: center; }
            .st-group-actions { display: flex; gap: 10px; margin-top: 10px; }
            .st-group-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
            .st-group-btn.cancel { background: #e5e5ea; color: #000; }
            .st-group-btn.create { background: var(--pt-accent, #007aff); color: white; }
        </style>`;

    const DEFAULT_AVATAR = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
    let currentContactId = null;
    let currentGroupId = null;
    let currentChatType = 'dm';
    let bulkSelectMode = false;

    // ==========================================
    // [저장소 로직 - IndexedDB (Async)]
    // ==========================================
    function getStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        return 'st_phone_messages_' + context.chatId;
    }

    async function loadAllMessages() {
        const key = getStorageKey();
        if (!key) return {};
        try { return (await getStorage().getItem(key)) || {}; } catch (e) { return {}; }
    }

    async function saveAllMessages(data) {
        const key = getStorageKey();
        if (!key) return;
        await getStorage().setItem(key, data);
    }

    async function getMessages(contactId) {
        const all = await loadAllMessages();
        return all[contactId] || [];
    }

    async function addMessage(contactId, sender, text, imageUrl = null) {
        const all = await loadAllMessages();
        if (!all[contactId]) all[contactId] = [];

        const msgData = {
            sender,
            text,
            image: imageUrl,
            timestamp: Date.now()
        };
        all[contactId].push(msgData);
        await saveAllMessages(all);
        return all[contactId].length - 1;
    }

    async function updateMessage(contactId, msgIndex, newText, isDeleted = false) {
        const all = await loadAllMessages();
        if (!all[contactId] || !all[contactId][msgIndex]) return false;
        all[contactId][msgIndex].text = newText;
        all[contactId][msgIndex].isDeleted = isDeleted;
        if (isDeleted) all[contactId][msgIndex].image = null;
        await saveAllMessages(all);
        return true;
    }

    // 안 읽은 메시지 관리 (IndexedDB)
    async function getUnreadCount(contactId) {
        const key = getStorageKey();
        if (!key) return 0;
        try { const unread = (await getStorage().getItem(key + '_unread')) || {}; return unread[contactId] || 0; } catch { return 0; }
    }
    async function setUnreadCount(contactId, count) {
        const key = getStorageKey();
        if (!key) return;
        const unread = (await getStorage().getItem(key + '_unread')) || {};
        unread[contactId] = count;
        await getStorage().setItem(key + '_unread', unread);
    }
    async function getTotalUnread() {
        const key = getStorageKey();
        if (!key) return 0;
        try { const unread = (await getStorage().getItem(key + '_unread')) || {}; return Object.values(unread).reduce((a, b) => a + b, 0); } catch { return 0; }
    }
    async function updateMessagesBadge() {
        const total = await getTotalUnread();
        const $msgIcon = $('.st-app-icon[data-app="messages"]');
        $msgIcon.find('.st-app-badge').remove();
        if (total > 0) $msgIcon.append(`<div class="st-app-badge">${total > 99 ? '99+' : total}</div>`);
    }

    function formatTime(ts) { const d = new Date(ts); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

    // ==========================================
    // [UI 및 앱 로직]
    // ==========================================
    async function open() {
        currentContactId = null;
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

        await renderDMList();
        attachMainListeners();
        
        // [중요] 글로벌 클릭 리스너 연결 (이벤트 위임)
        bindGlobalClickEvents();
    }

    async function renderDMList() {
        const $list = $('#st-messages-list');
        $list.empty();
        
        const contacts = window.STPhone.Apps?.Contacts?.getAllContacts() || [];
        const allMsgs = await loadAllMessages(); // await 필수

        if (contacts.length === 0) {
            $list.html(`<div class="st-messages-empty">대화가 없습니다</div>`);
            return;
        }

        for (const c of contacts) {
            const msgs = allMsgs[c.id] || [];
            const last = msgs[msgs.length - 1];
            const unread = await getUnreadCount(c.id); // await 필수
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
        }
    }

    function attachMainListeners() {
        $('.st-thread-item').off('click').on('click', function() {
            const id = $(this).data('id');
            openChat(id);
        });
    }

    // [핵심] 글로벌 클릭 리스너 (문서 전체 위임)
    function bindGlobalClickEvents() {
        $(document).off('click.stMessages').on('click.stMessages', '.st-msg-bubble.clickable', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (bulkSelectMode) return;

            const idx = $(this).data('idx');
            const lineIdx = $(this).data('line-idx');
            const sender = $(this).data('sender');
            const isMyMessage = sender === 'me';
            
            showMsgOptions(currentContactId, idx, lineIdx, isMyMessage);
        });
    }

    async function openChat(contactId) {
        currentContactId = contactId;
        currentChatType = 'dm';
        await setUnreadCount(contactId, 0);
        updateMessagesBadge();

        const contact = window.STPhone.Apps.Contacts.getContact(contactId);
        if (!contact) return;

        const $screen = window.STPhone.UI.getContentElement();
        $screen.empty();

        const msgs = await getMessages(contactId); // await 필수
        let msgsHtml = '';

        msgs.forEach((m, index) => {
            const side = m.sender === 'me' ? 'me' : 'them';
            msgsHtml += `<div class="st-msg-wrapper ${side}">`;
            
            // pointer-events: auto 적용된 클래스
            const clickAttr = `data-action="msg-option" data-idx="${index}" data-sender="${side}" class="st-msg-bubble ${side} clickable" title="옵션"`;

            // 이미지
            if (m.image) {
                const imgAttr = clickAttr.replace('st-msg-bubble', 'st-msg-bubble image-bubble');
                msgsHtml += `<div ${imgAttr}><img class="st-msg-image" src="${m.image}"></div>`;
            }
            // 텍스트
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
        
        const newIdx = await addMessage(currentContactId, 'me', text);
        appendBubble('me', text, null, newIdx);
    }

    // ==========================================
    // [핵심] 외부 동기화 (사진/텍스트 분리 & IndexedDB 대응)
    // ==========================================
    const syncExternalMessage = async (sender, text) => {
        if (!text) return;

        let contacts = window.STPhone.Apps?.Contacts?.getAllContacts() || [];
        if (contacts.length === 0) {
            await window.STPhone.Apps.Contacts.syncAutoContacts();
            contacts = window.STPhone.Apps.Contacts.getAllContacts();
            if (contacts.length === 0) return;
        }
        const contactId = contacts[0].id;

        // [IMG:...] 태그 분리 파싱
        const tokens = text.split(/(\[IMG:[^\]]+\])/gi).map(t => t.trim()).filter(t => t);

        for (const token of tokens) {
            const imgMatch = token.match(/^\[IMG:\s*([^\]]+)\]$/i);
            let contentText = null;
            let contentImage = null;

            if (imgMatch) {
                contentImage = imgMatch[1].trim(); 
                contentText = null;
            } else {
                contentText = token;
                contentImage = null;
            }

            // DB 저장 (await 필수)
            const newIdx = await addMessage(contactId, sender, contentText, contentImage);
            
            const isPhoneActive = $('#st-phone-container').hasClass('active');
            if (isPhoneActive) {
                await new Promise(r => setTimeout(r, 50)); 
                appendBubble(sender, contentText, contentImage, newIdx);
            }
        }

        if (sender === 'them') {
            const unread = (await getUnreadCount(contactId)) + 1;
            await setUnreadCount(contactId, unread);
            updateMessagesBadge();
        }
    };

    // 옵션 팝업
    async function showMsgOptions(contactId, msgIndex, lineIndex, isMyMessage) {
        $('#st-msg-option-popup').remove();
        
        // 데이터 비동기 로드
        const allData = await loadAllMessages(); 
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

        $('#st-save-btn').on('click', async () => {
            await updateMessage(contactId, msgIndex, $('#st-edit-text').val());
            $('#st-msg-option-popup').remove();
            openChat(contactId);
        });
        $('#st-del-btn').on('click', async () => {
            if(confirm('삭제하시겠습니까?')) {
                await updateMessage(contactId, msgIndex, '', true);
                $('#st-msg-option-popup').remove();
                openChat(contactId);
            }
        });
        $('#st-close-btn').on('click', () => $('#st-msg-option-popup').remove());
    }

    return {
        open,
        openChat,
        syncExternalMessage, // 외부 노출 필수
        getTotalUnread,
        updateMessagesBadge,
        addHiddenLog: (speaker, text) => console.log(speaker, text)
    };
})();