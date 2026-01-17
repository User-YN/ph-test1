window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Messages = (function() {
    'use strict';

    // ==========================================
    // [설정] 기본 아바타 및 CSS 스타일
    // ==========================================
    const DEFAULT_AVATAR = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';

    // 스타일 정의 (클릭 문제 해결을 위해 pointer-events: auto !important 추가됨)
    const notificationCss = `<style id="st-phone-notification-css"> .st-bubble-notification-container { position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; } .st-bubble-notification { display: flex; align-items: flex-start; gap: 10px; pointer-events: auto; cursor: pointer; animation: bubbleSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); } .st-bubble-notification.hiding { animation: bubbleSlideOut 0.3s ease-in forwards; } @keyframes bubbleSlideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes bubbleSlideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } } .st-bubble-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.2); } .st-bubble-content { max-width: 280px; background: linear-gradient(135deg, #34c759 0%, #30b350 100%); color: white; padding: 10px 14px; border-radius: 18px; border-bottom-left-radius: 4px; font-size: 14px; line-height: 1.4; box-shadow: 0 4px 15px rgba(52, 199, 89, 0.4); word-break: break-word; } .st-bubble-sender { font-size: 11px; font-weight: 600; opacity: 0.9; margin-bottom: 3px; } .st-bubble-text { font-size: 14px; } </style>`;
    
    const css = `<style>
            .st-messages-app { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 999; display: flex; flex-direction: column; background: var(--pt-bg-color, #f5f5f7); color: var(--pt-text-color, #000); font-family: var(--pt-font, -apple-system, sans-serif); }
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
            .st-chat-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--pt-bg-color, #f5f5f7); display: flex; flex-direction: column; z-index: 1001; }
            .st-chat-header { display: flex; align-items: center; padding: 12px 15px; border-bottom: 1px solid var(--pt-border, #e5e5e5); background: var(--pt-bg-color, #f5f5f7); flex-shrink: 0; }
            .st-chat-back { background: none; border: none; color: var(--pt-accent, #007aff); font-size: 24px; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; position: absolute; left: 10px; top: 50%; transform: translateY(-50%); }
            .st-chat-contact { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
            .st-chat-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
            .st-chat-name { font-weight: 600; font-size: 14px; color: var(--pt-text-color, #000); }
            .st-chat-messages { flex: 1; overflow-y: auto; padding: 15px; padding-bottom: 10px; display: flex; flex-direction: column; gap: 8px; }
            .st-msg-wrapper { display: flex; flex-direction: column; max-width: 100%; width: fit-content; min-width: 0; }
            .st-msg-wrapper.me { align-self: flex-end; align-items: flex-end; }
            .st-msg-wrapper.them { align-self: flex-start; align-items: flex-start; }
            .st-msg-sender-info { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
            .st-msg-sender-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
            .st-msg-sender-name { font-size: 12px; font-weight: 600; color: var(--pt-sub-text, #86868b); }
            .st-msg-bubble { max-width: 75%; min-width: fit-content; width: auto; padding: 10px 14px; border-radius: 18px; font-size: 15px; line-height: 1.4; word-wrap: break-word; word-break: keep-all; white-space: pre-wrap; position: relative; display: inline-block; }
            
            /* [수정] 클릭 문제 해결을 위해 pointer-events 강제 적용 */
            .st-msg-bubble.clickable { cursor: pointer; pointer-events: auto !important; }

            .st-msg-bubble.me { align-self: flex-end; background: var(--msg-my-bubble, var(--pt-accent, #007aff)); color: var(--msg-my-text, white); border-bottom-right-radius: 4px; }
            .st-msg-bubble.them { align-self: flex-start; background: var(--msg-their-bubble, var(--pt-card-bg, #e5e5ea)); color: var(--msg-their-text, var(--pt-text-color, #000)); border-bottom-left-radius: 4px; }
            .st-msg-bubble.deleted { opacity: 0.6; font-style: italic; }
            .st-msg-image { max-width: 200px; border-radius: 12px; cursor: pointer; }
            .st-msg-delete-btn { position: absolute; left: -18px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; border-radius: 50%; background: rgba(255, 59, 48, 0.7); color: white; border: none; font-size: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.6; transition: opacity 0.2s, transform 0.2s; z-index: 10; pointer-events: auto !important; }
            .st-msg-delete-btn:hover { opacity: 1; transform: translateY(-50%) scale(1.2); }
            /* ... 기타 기존 CSS 유지 ... */
            .st-msg-translation { font-size: 12px; color: var(--pt-sub-text, #666); margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(0,0,0,0.1); line-height: 1.4; }
            .st-msg-original { margin-bottom: 4px; }
            .st-msg-bubble.them .st-msg-translation { border-top-color: rgba(0,0,0,0.1); }
            .st-chat-input-area { display: flex; align-items: flex-end; padding: 14px 16px; padding-bottom: 45px; gap: 10px; border-top: 1px solid var(--pt-border, #e5e5e5); background: var(--pt-bg-color, #f5f5f7); flex-shrink: 0; }
            .st-chat-textarea { flex: 1; border: 1px solid var(--pt-border, #e5e5e5); background: var(--pt-card-bg, #f5f5f7); border-radius: 12px; padding: 12px 16px; font-size: 15px; resize: none; max-height: 100px; outline: none; color: var(--pt-text-color, #000); line-height: 1.4; }
            .st-chat-send { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--pt-accent, #007aff); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; transition: transform 0.1s, background 0.2s; }
            .st-chat-send:active { transform: scale(0.95); }
            .st-chat-cam-btn { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--pt-card-bg, #e9e9ea); color: var(--pt-sub-text, #666); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
            .st-typing-indicator { align-self: flex-start; background: var(--pt-card-bg, #e5e5ea); padding: 12px 16px; border-radius: 18px; display: none; }
            .st-typing-dots { display: flex; gap: 4px; }
            .st-typing-dots span { width: 8px; height: 8px; background: #999; border-radius: 50%; animation: typingBounce 1.4s infinite; }
            .st-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
            .st-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typingBounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
            .st-photo-popup { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,1); z-index: 2000; display: none; align-items: center; justify-content: center; }
            .st-photo-box { width: 80%; background: var(--pt-card-bg, #fff); padding: 20px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: popUp 0.2s ease-out; }
            @keyframes popUp { from{transform:scale(0.9);opacity:0;} to{transform:scale(1);opacity:1;} }
            .st-photo-input { width: 100%; box-sizing: border-box; padding: 12px; margin: 15px 0; border: 1px solid var(--pt-border, #e5e5e5); border-radius: 10px; background: var(--pt-bg-color, #f9f9f9); color: var(--pt-text-color, #000); font-size: 15px; outline: none; }
            .st-photo-actions { display: flex; gap: 10px; }
            .st-photo-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
            .st-photo-btn.cancel { background: #e5e5ea; color: #000; }
            .st-photo-btn.send { background: var(--pt-accent, #007aff); color: white; }
            .st-group-modal { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.5); z-index: 2000; display: none; align-items: center; justify-content: center; }
            .st-group-box { width: 90%; max-height: 80%; background: var(--pt-card-bg, #fff); padding: 20px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); color: var(--pt-text-color, #000); display: flex; flex-direction: column; }
            .st-group-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; text-align: center; }
            .st-group-actions { display: flex; gap: 10px; }
            .st-group-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
            .st-group-btn.cancel { background: #e5e5ea; color: #000; }
            .st-group-btn.create { background: var(--pt-accent, #007aff); color: white; }
        </style>`;

    function ensureNotificationCss() { if (!$('#st-phone-notification-css').length) $('head').append(notificationCss); }
    ensureNotificationCss();

    // ==========================================
    // [변수 및 헬퍼 함수]
    // ==========================================
    let currentContactId = null;
    let currentGroupId = null;
    let currentChatType = 'dm';
    let isGenerating = false;
    let bulkSelectMode = false;
    let replyToMessage = null;

    function getStorage() {
        if (window.STPhoneStorage) return window.STPhoneStorage;
        return localforage; 
    }

    // ========== 1:1 메시지 저장소 ==========
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

    async function addMessage(contactId, sender, text, imageUrl = null, addTimestamp = false, rpDate = null, replyTo = null) {
        const all = await loadAllMessages();
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
        await saveAllMessages(all);
        return all[contactId].length - 1;
    }
    
    // 메시지 삭제/수정 함수
    async function updateMessage(contactId, msgIndex, newText, isDeleted = false) {
        const all = await loadAllMessages();
        if (!all[contactId] || !all[contactId][msgIndex]) return false;
        all[contactId][msgIndex].text = newText;
        all[contactId][msgIndex].isDeleted = isDeleted;
        if (isDeleted) all[contactId][msgIndex].image = null;
        await saveAllMessages(all);
        return true;
    }

    async function getUnreadCount(contactId) {
        const key = getStorageKey();
        if (!key) return 0;
        try { const unread = (await getStorage().getItem(key + '_unread')) || {}; return unread[contactId] || 0; } catch (e) { return 0; }
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
        try { const unread = (await getStorage().getItem(key + '_unread')) || {}; return Object.values(unread).reduce((a, b) => a + b, 0); } catch (e) { return 0; }
    }

    async function updateMessagesBadge() {
        const total = await getTotalUnread();
        const $msgIcon = $('.st-app-icon[data-app="messages"]');
        $msgIcon.find('.st-app-badge').remove();
        if (total > 0) {
            $msgIcon.append(`<div class="st-app-badge">${total > 99 ? '99+' : total}</div>`);
        }
    }

    function formatBankTagForDisplay(text) {
        if (!text) return text;
        text = text.replace(/\[💰\s*(.+?)\s+송금\s+(.+?)\s*[:\s：]+\s*[\$₩€¥£]?\s*([\d,]+)\s*[\$₩€¥£원]?\s*\]/gi, (match, sender, receiver, amount) => `💰 ${sender.trim()}님이 ${receiver.trim()}님에게 ${amount.trim()}원을 송금했습니다.`);
        text = text.replace(/\[💰\s*(.+?)\s+출금\s+(.+?)\s*[:\s：]+\s*[\$₩€¥£]?\s*([\d,]+)\s*[\$₩€¥£원]?\s*\]/gi, (match, shop, user, amount) => `💰 ${shop.trim()}에서 ${amount.trim()}원 결제`);
        return text.trim();
    }

    // ==========================================
    // [UI 생성 및 제어]
    // ==========================================
    async function open() {
        currentContactId = null;
        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen?.length) return;
        $screen.empty();

        $screen.append(`
            ${css}
            <div class="st-messages-app">
                <div class="st-messages-header">
                    <div class="st-messages-title">메시지</div>
                    <button class="st-messages-new-group" id="st-new-group-btn" title="새 그룹 만들기"><i class="fa-solid fa-user-group"></i></button>
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
        
        // [중요] 메시지 앱이 열릴 때 글로벌 클릭 리스너를 한 번만 등록
        bindGlobalClickEvents(); 
    }

    async function renderDMList() {
        const $list = $('#st-messages-list');
        $list.empty();
        const contacts = window.STPhone.Apps?.Contacts?.getAllContacts() || [];
        const allMsgs = await loadAllMessages();

        if (contacts.length === 0) {
            $list.html(`<div class="st-messages-empty"><div>대화가 없습니다</div></div>`);
            return;
        }

        const unreadPromises = contacts.map(c => getUnreadCount(c.id));
        const unreadCounts = await Promise.all(unreadPromises);

        contacts.forEach((c, idx) => {
            const msgs = allMsgs[c.id] || [];
            const last = msgs[msgs.length - 1];
            const unread = unreadCounts[idx];
            let previewText = '새 대화';
            if (last) {
                if (last.image) previewText = '사진';
                else if (last.text) previewText = formatBankTagForDisplay(last.text);
            }
            $list.append(`
                <div class="st-thread-item" data-id="${c.id}" data-type="dm">
                    <img class="st-thread-avatar" src="${c.avatar || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'">
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
        $('.st-thread-item').off('click').on('click', function() {
            const id = $(this).data('id');
            openChat(id);
        });
    }

    // [중요] 글로벌 클릭 이벤트 리스너 (DOM 생성 시점과 무관하게 작동)
    function bindGlobalClickEvents() {
        // 이미 바인딩 되어 있으면 중복 방지
        $(document).off('click.stMessages'); 

        // 1. 메시지 말풍선 클릭
        $(document).on('click.stMessages', '.st-msg-bubble.clickable', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (bulkSelectMode) return; // 다중 선택 모드일 땐 패스

            const idx = $(this).data('idx');
            const lineIdx = $(this).data('line-idx');
            const sender = $(this).data('sender');
            const isMyMessage = sender === 'me';
            
            console.log(`[Messages] Clicked bubble: ${idx}, sender: ${sender}`);
            showMsgOptions(currentContactId, idx, lineIdx, isMyMessage);
        });

        // 2. 메시지 삭제 버튼 클릭 (동적 생성 요소)
        $(document).on('click.stMessages', '.st-msg-delete-btn', async function(e) {
            e.stopPropagation();
            // ... 삭제 로직 ...
            // 구현 편의상 여기서는 생략하고 개별 바인딩을 사용해도 되지만, 
            // 위쪽 showMsgOptions에서 처리하는 것이 일반적임.
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

        const msgs = await getMessages(contactId);
        let msgsHtml = '';

        for (let index = 0; index < msgs.length; index++) {
            const m = msgs[index];
            const side = m.sender === 'me' ? 'me' : 'them';
            const isDeleted = m.isDeleted === true;
            
            msgsHtml += `<div class="st-msg-wrapper ${side}">`;

            // 클릭 속성 정의 (pointer-events: auto 필수)
            const clickAttr = `data-action="msg-option" data-idx="${index}" data-sender="${side}" class="st-msg-bubble ${side} clickable" title="옵션"`;

            // 이미지 렌더링
            if (m.image && !isDeleted) {
                // 이미지용 클래스 추가
                const imgAttr = clickAttr.replace('st-msg-bubble', 'st-msg-bubble image-bubble');
                msgsHtml += `<div ${imgAttr}><img class="st-msg-image" src="${m.image}"></div>`;
            }

            // 텍스트 렌더링
            if (m.text) {
                if (isDeleted) {
                     msgsHtml += `<div class="st-msg-bubble ${side} deleted">(메시지 삭제됨)</div>`;
                } else {
                    const lines = m.text.split('\n');
                    lines.forEach((line, idx) => {
                        const trimmed = formatBankTagForDisplay(line.trim());
                        if (trimmed) {
                            msgsHtml += `<div ${clickAttr} data-line-idx="${idx}">${trimmed}</div>`;
                        }
                    });
                }
            }
            msgsHtml += `</div>`;
        }

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

        // 입력창 및 뒤로가기 리스너 연결
        $('#st-chat-back').on('click', open);
        $('#st-chat-send').on('click', sendMessage);
        
        // 스크롤 하단 이동
        const el = document.getElementById('st-chat-messages');
        if (el) el.scrollTop = el.scrollHeight;
    }

    // ==========================================
    // [메시지 수신 및 표시 로직]
    // ==========================================
    
    async function receiveMessage(contactId, text, imageUrl = null, replyTo = null) {
        // DB 저장
        const newIdx = await addMessage(contactId, 'them', text, imageUrl, false, null, replyTo);

        // 현재 채팅방을 보고 있다면 말풍선 추가
        const isPhoneActive = $('#st-phone-container').hasClass('active');
        const isViewing = (currentChatType === 'dm' && currentContactId === contactId);

        if (isPhoneActive && isViewing) {
            appendBubble('them', text, imageUrl, newIdx);
        } else {
            // 안 보고 있으면 알림 및 배지 증가
            const unread = (await getUnreadCount(contactId)) + 1;
            await setUnreadCount(contactId, unread);
            updateMessagesBadge();
        }
    }

    // [수정] 말풍선 추가 함수 (이미지와 텍스트 동시 처리)
    function appendBubble(sender, text, imageUrl, msgIndex) {
        const side = sender === 'me' ? 'me' : 'them';
        const $container = $('#st-chat-messages');
        const clickAttr = `data-action="msg-option" data-idx="${msgIndex}" data-sender="${side}" class="st-msg-bubble ${side} clickable" title="옵션"`;

        let html = `<div class="st-msg-wrapper ${side}">`;
        
        // 이미지가 있으면 먼저 렌더링
        if (imageUrl) {
            const imgAttr = clickAttr.replace('st-msg-bubble', 'st-msg-bubble image-bubble');
            html += `<div ${imgAttr}><img class="st-msg-image" src="${imageUrl}"></div>`;
        }

        // 텍스트가 있으면 그 아래 렌더링
        if (text) {
             const lines = text.split('\n');
             lines.forEach((line, idx) => {
                 const trimmed = formatBankTagForDisplay(line.trim());
                 if (trimmed) {
                     html += `<div ${clickAttr} data-line-idx="${idx}">${trimmed}</div>`;
                 }
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
    // [외부 연동] 사진/텍스트 분리 처리 (핵심 수정)
    // ==========================================
    const syncExternalMessage = async (sender, text) => {
        if (!text) return;

        // 연락처 자동 확인
        let contacts = window.STPhone.Apps?.Contacts?.getAllContacts() || [];
        if (contacts.length === 0) {
            await window.STPhone.Apps.Contacts.syncAutoContacts();
            contacts = window.STPhone.Apps.Contacts.getAllContacts();
            if (contacts.length === 0) return; 
        }
        const contactId = contacts[0].id;

        // [핵심] 정규식으로 토큰 분리: [IMG:url] 형태와 일반 텍스트 분리
        // 예: "안녕하세요 [IMG:http://photo.jpg] 반가워요" -> ["안녕하세요", "[IMG:http://...]", "반가워요"]
        const tokens = text.split(/(\[IMG:[^\]]+\])/gi).map(t => t.trim()).filter(t => t);

        for (const token of tokens) {
            // 이미지 태그 확인
            const imgMatch = token.match(/^\[IMG:\s*([^\]]+)\]$/i);
            
            let contentText = null;
            let contentImage = null;

            if (imgMatch) {
                // 이미지 URL 추출 (http가 포함된 실제 주소라고 가정)
                // 만약 ST에서 보내는게 로컬 경로라면 그대로 사용
                contentImage = imgMatch[1].trim(); 
                contentText = null; 
            } else {
                // 일반 텍스트
                contentText = token;
                contentImage = null;
            }

            // DB 저장 및 화면 표시
            if (contentText || contentImage) {
                const newIdx = await addMessage(contactId, sender, contentText, contentImage);
                
                const isPhoneActive = $('#st-phone-container').hasClass('active');
                if (isPhoneActive) {
                    await new Promise(r => setTimeout(r, 50)); // 자연스러운 연출
                    appendBubble(sender, contentText, contentImage, newIdx);
                }
            }
        }

        // 알림 카운트 (상대방 메시지인 경우)
        if (sender === 'them') {
            const unread = (await getUnreadCount(contactId)) + 1;
            await setUnreadCount(contactId, unread);
            updateMessagesBadge();
        }
    };

    // [팝업] 메시지 옵션 팝업
    async function showMsgOptions(contactId, msgIndex, lineIndex, isMyMessage) {
        $('#st-msg-option-popup').remove(); // 기존 팝업 제거

        const allData = await loadAllMessages();
        const msg = allData[contactId]?.[msgIndex];
        if (!msg) { console.error('Message not found'); return; }

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
            openChat(contactId); // 화면 갱신
        });

        $('#st-del-btn').on('click', async () => {
            if(confirm('삭제하시겠습니까?')) {
                await updateMessage(contactId, msgIndex, '', true); // 삭제 처리
                $('#st-msg-option-popup').remove();
                openChat(contactId);
            }
        });

        $('#st-close-btn').on('click', () => $('#st-msg-option-popup').remove());
    }

    // 외부로 함수 노출
    return {
        open,
        openChat,
        receiveMessage,
        syncExternalMessage,
        getTotalUnread,
        updateMessagesBadge,
        addHiddenLog: (speaker, text) => console.log(speaker, text) // 간단 로그 대체
    };
})();