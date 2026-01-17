window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Messages = (function() {
    'use strict';

    // ==========================================
    // [Helper] 저장소 인스턴스 가져오기
    // ==========================================
    function getStorage() {
        if (window.STPhoneStorage) return window.STPhoneStorage;
        console.error('[Messages] window.STPhoneStorage가 초기화되지 않았습니다.');
        return localforage; 
    }

    function getSlashCommandParserInternal() {
        return window.SillyTavern?.getContext()?.SlashCommandParser || window.SlashCommandParser;
    }

    // ... (normalizeModelOutput 등 헬퍼 함수들은 그대로 유지) ...
    function normalizeModelOutput(raw) {
        if (raw == null) return '';
        if (typeof raw === 'string') return raw;
        if (typeof raw?.content === 'string') return raw.content;
        if (typeof raw?.text === 'string') return raw.text;
        const choiceContent = raw?.choices?.[0]?.message?.content;
        if (typeof choiceContent === 'string') return choiceContent;
        const dataContent = raw?.data?.content;
        if (typeof dataContent === 'string') return dataContent;
        try { return JSON.stringify(raw); } catch (e) { return String(raw); }
    }

    function formatBankTagForDisplay(text) {
        if (!text) return text;
        text = text.replace(/\[💰\s*(.+?)\s+송금\s+(.+?)\s*[:\s：]+\s*[\$₩€¥£]?\s*([\d,]+)\s*[\$₩€¥£원]?\s*\]/gi,
            (match, sender, receiver, amount) => `💰 ${sender.trim()}님이 ${receiver.trim()}님에게 ${amount.trim()}원을 송금했습니다.`);
        text = text.replace(/\[💰\s*(.+?)\s+출금\s+(.+?)\s*[:\s：]+\s*[\$₩€¥£]?\s*([\d,]+)\s*[\$₩€¥£원]?\s*\]/gi,
            (match, shop, user, amount) => `💰 ${shop.trim()}에서 ${amount.trim()}원 결제`);
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
    // [CSS 수정] pointer-events 추가하여 클릭 문제 해결
    // ==========================================
    const notificationCss = `<style id="st-phone-notification-css"> .st-bubble-notification-container { position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; } .st-bubble-notification { display: flex; align-items: flex-start; gap: 10px; pointer-events: auto; cursor: pointer; animation: bubbleSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); } .st-bubble-notification.hiding { animation: bubbleSlideOut 0.3s ease-in forwards; } @keyframes bubbleSlideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes bubbleSlideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } } .st-bubble-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.2); } .st-bubble-content { max-width: 280px; background: linear-gradient(135deg, #34c759 0%, #30b350 100%); color: white; padding: 10px 14px; border-radius: 18px; border-bottom-left-radius: 4px; font-size: 14px; line-height: 1.4; box-shadow: 0 4px 15px rgba(52, 199, 89, 0.4); word-break: break-word; } .st-bubble-sender { font-size: 11px; font-weight: 600; opacity: 0.9; margin-bottom: 3px; } .st-bubble-text { font-size: 14px; } </style>`;
    function ensureNotificationCss() { if (!$('#st-phone-notification-css').length) $('head').append(notificationCss); }
    ensureNotificationCss();

    const css = `<style>
            .st-messages-app { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 999; display: flex; flex-direction: column; background: var(--pt-bg-color, #f5f5f7); color: var(--pt-text-color, #000); font-family: var(--pt-font, -apple-system, sans-serif); }
            /* ... (기존 CSS 유지) ... */
            .st-msg-bubble { max-width: 75%; min-width: fit-content; width: auto; padding: 10px 14px; border-radius: 18px; font-size: 15px; line-height: 1.4; word-wrap: break-word; word-break: keep-all; white-space: pre-wrap; position: relative; display: inline-block; }
            
            /* [수정] 클릭 가능 클래스에 포인터 이벤트 강제 적용 */
            .st-msg-bubble.clickable { cursor: pointer; pointer-events: auto !important; }
            
            .st-msg-bubble.me { align-self: flex-end; background: var(--msg-my-bubble, var(--pt-accent, #007aff)); color: var(--msg-my-text, white); border-bottom-right-radius: 4px; }
            .st-msg-bubble.them { align-self: flex-start; background: var(--msg-their-bubble, var(--pt-card-bg, #e5e5ea)); color: var(--msg-their-text, var(--pt-text-color, #000)); border-bottom-left-radius: 4px; }
            /* ... (나머지 CSS 생략 - 기존 코드와 동일) ... */
            .st-msg-delete-btn { position: absolute; left: -18px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; border-radius: 50%; background: rgba(255, 59, 48, 0.7); color: white; border: none; font-size: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.6; transition: opacity 0.2s, transform 0.2s; z-index: 10; pointer-events: auto; }
            /* ... */
        </style>`;

    // ... (기존 변수 및 저장소 함수들 유지: getStorageKey, getMessages, addMessage 등) ...
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

    // ... (Storage 관련 함수들: loadAllMessages, addMessage 등등 기존과 동일하게 유지) ...
    // 코드가 너무 길어 핵심 수정이 없는 헬퍼 함수들은 생략합니다. (원본 코드의 로직 사용)
    // 아래에 addMessage 등 핵심 함수만 다시 정의합니다.

    function getStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        if (settings.recordMode === 'accumulate' && context.characterId !== undefined) {
            return 'st_phone_messages_char_' + context.characterId;
        }
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
        const newMsgIndex = all[contactId].length;
        if (addTimestamp) await saveTimestamp(contactId, newMsgIndex, Date.now());
        const currentRpDate = window.STPhone?.Apps?.Calendar?.getRpDate();
        const rpDateStr = currentRpDate ? `${currentRpDate.year}년 ${currentRpDate.month}월 ${currentRpDate.day}일 ${currentRpDate.dayOfWeek}` : null;
        const msgData = {
            sender,
            text,
            image: imageUrl,
            timestamp: Date.now(),
            rpDate: rpDate || rpDateStr
        };
        if (replyTo) msgData.replyTo = replyTo;
        all[contactId].push(msgData);
        await saveAllMessages(all);
        return all[contactId].length - 1;
    }
    
    // ... (updateMessage, extractRpDate, group 관련 함수들 생략 - 원본 사용) ...

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
    function formatTime(ts) { const d = new Date(ts); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

    // ... (Bubble Notification, Sequential Receive 함수들 생략 - 원본 사용) ...

    // [수정] receiveMessage에서 Image와 Text가 함께 올 경우 처리
    async function receiveMessage(contactId, text, imageUrl = null, replyTo = null) {
        // DB 저장
        const newIdx = await addMessage(contactId, 'them', text, imageUrl, false, null, replyTo);

        const isPhoneActive = $('#st-phone-container').hasClass('active');
        const isViewingThisChat = (currentChatType === 'dm' && currentContactId === contactId);

        let contact = null;
        if (window.STPhone.Apps?.Contacts) contact = window.STPhone.Apps.Contacts.getContact(contactId);
        const contactName = contact?.name || '알 수 없음';
        const contactAvatar = contact?.avatar || DEFAULT_AVATAR;

        // 번역 처리
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        let translatedText = null;
        if (text && settings.translateEnabled) {
            translatedText = await translateText(text);
            if (translatedText) await saveTranslation(contactId, newIdx, translatedText);
        }

        if (isPhoneActive && isViewingThisChat) {
            // [수정] appendBubble이 이미지와 텍스트를 모두 처리하도록 보장
            appendBubble('them', text, imageUrl, newIdx, translatedText, replyTo);
        }

        if (!isPhoneActive || !isViewingThisChat) {
            const unread = (await getUnreadCount(contactId)) + 1;
            await setUnreadCount(contactId, unread);
            updateMessagesBadge();
            let preview;
            if (imageUrl) preview = '사진';
            else if (/\[💰.*송금.*:/.test(text)) preview = '💰 송금 알림';
            else preview = (translatedText || text)?.substring(0, 50) || '새 메시지';
            showNotification(contactName, preview, contactAvatar, contactId, 'dm');
        }
    }

    // ... (renderDMList, renderGroupList, attachMainListeners 등은 원본과 동일) ...

    async function openChat(contactId) {
        if (replyTimer) clearTimeout(replyTimer);
        currentContactId = contactId;
        currentGroupId = null;
        currentChatType = 'dm';
        
        await setUnreadCount(contactId, 0);
        updateMessagesBadge();

        const contact = window.STPhone.Apps.Contacts.getContact(contactId);
        if (!contact) { toastr.error('연락처를 찾을 수 없습니다'); return; }

        const $screen = window.STPhone.UI.getContentElement();
        $screen.empty();

        const msgs = await getMessages(contactId);
        // ... (타임스탬프 로드 등 생략) ...
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        
        let msgsHtml = '';
        let lastRenderedRpDate = null;

        // [중요] 메시지 렌더링 루프
        for (let index = 0; index < msgs.length; index++) {
            const m = msgs[index];
            // ... (타임스탬프 처리 생략) ...
            
            const side = m.sender === 'me' ? 'me' : 'them';
            const savedTranslation = (side === 'them') ? await getTranslation(contactId, index) : null;
            const translateEnabled = settings.translateEnabled && side === 'them' && savedTranslation;
            const isDeleted = m.isDeleted === true;
            const deletedClass = isDeleted ? ' deleted' : '';
            const isExcluded = m.excludeFromContext === true;
            const excludedTag = isExcluded ? '<span class="st-msg-no-context">미반영</span>' : '';

            msgsHtml += `<div class="st-msg-wrapper ${side}">`;
            
            // Reply Preview
            if (m.replyTo) {
                msgsHtml += `<div class="st-msg-reply-preview"><div class="st-msg-reply-name">${m.replyTo.senderName}</div><div class="st-msg-reply-text">${m.replyTo.previewText}</div></div>`;
            }

            // [수정] 클릭 이벤트용 속성 (pointer-events: auto가 적용된 clickable 클래스 사용)
            const commonAttr = `data-action="msg-option" data-idx="${index}" data-sender="${side}" class="st-msg-bubble ${side} clickable" title="옵션 보기"`;

            // Image Render
            if (m.image && !isDeleted) {
                // 이미지에도 클릭 이벤트 속성 적용
                const imgAttr = commonAttr.replace('st-msg-bubble', 'st-msg-bubble image-bubble');
                msgsHtml += `<div ${imgAttr} data-line-idx="0"><img class="st-msg-image" src="${m.image}">${excludedTag}</div>`;
            }

            // Text Render
            if (m.text) {
                if (isDeleted) {
                    const lineAttr = `${commonAttr}${deletedClass}`;
                    msgsHtml += `<div ${lineAttr} data-line-idx="0">${m.text}${excludedTag}</div>`;
                } else {
                    const lines = m.text.split('\n');
                    const translatedLines = savedTranslation ? savedTranslation.split('\n') : [];
                    let lineIdx = 0;
                    lines.forEach((line, idx) => {
                        const trimmed = formatBankTagForDisplay(line.trim());
                        if (trimmed) {
                            let bubbleContent = '';
                            if (translateEnabled) {
                                // ... (번역 표시 로직) ...
                                const translatedLine = translatedLines[idx]?.trim();
                                if (translatedLine) bubbleContent = `<div class="st-msg-original">${trimmed}</div><div class="st-msg-translation">${translatedLine}</div>`;
                                else bubbleContent = trimmed;
                            } else {
                                bubbleContent = trimmed;
                            }
                            msgsHtml += `<div ${commonAttr} data-line-idx="${lineIdx}">${bubbleContent}${lineIdx === 0 ? excludedTag : ''}</div>`;
                            lineIdx++;
                        }
                    });
                }
            }
            msgsHtml += `</div>`;
        }

        // ... (HTML 구조 생성 및 append 생략 - 원본과 동일, 아래 attachChatListeners 호출 중요) ...
        $screen.append(`
            ${css}
            <div class="st-chat-screen">
                <div class="st-chat-header" style="position: relative;">
                    <button class="st-chat-back" id="st-chat-back">‹</button>
                    <div class="st-chat-contact">
                        <img class="st-chat-avatar" src="${contact.avatar || DEFAULT_AVATAR}">
                        <span class="st-chat-name">${contact.name}</span>
                    </div>
                </div>
                <div class="st-chat-messages" id="st-chat-messages">
                    ${msgsHtml}
                    <div class="st-typing-indicator" id="st-typing"><div class="st-typing-dots"><span></span><span></span><span></span></div></div>
                </div>
                <div class="st-chat-input-area">
                    <button class="st-chat-cam-btn" id="st-chat-cam"><i class="fa-solid fa-camera"></i></button>
                    <button class="st-chat-timestamp-btn" id="st-chat-timestamp"><i class="fa-regular fa-clock"></i></button>
                    <textarea class="st-chat-textarea" id="st-chat-input" placeholder="메시지" rows="1"></textarea>
                    ${settings.translateEnabled ? '<button class="st-chat-translate-user-btn" id="st-chat-translate-user"><i class="fa-solid fa-language"></i></button>' : ''}
                    <button class="st-chat-send" id="st-chat-send"><i class="fa-solid fa-arrow-up"></i></button>
                </div>
                <div class="st-photo-popup" id="st-photo-popup">
                    <div class="st-photo-box">
                         <div style="font-weight:600;font-size:17px;text-align:center;">사진 보내기</div>
                         <input type="text" class="st-photo-input" id="st-photo-prompt" placeholder="설명 입력">
                         <div class="st-photo-actions">
                            <button class="st-photo-btn cancel" id="st-photo-cancel">취소</button>
                            <button class="st-photo-btn send" id="st-photo-confirm">생성</button>
                         </div>
                    </div>
                </div>
            </div>
        `);
        
        scrollToBottom();
        attachChatListeners(contactId, contact); // [중요] 리스너 연결
        applyMessageBackground();
    }

    // [수정] 이벤트 리스너 연결 강화
    function attachChatListeners(contactId, contact) {
        $('#st-chat-back').off('click').on('click', open);
        
        // [핵심] 메시지 클릭 이벤트 (이벤트 위임)
        // .st-msg-bubble.clickable 요소에 대해 동작
        $('#st-chat-messages').off('click', '.st-msg-bubble.clickable').on('click', '.st-msg-bubble.clickable', function(e) {
            e.preventDefault();
            e.stopPropagation(); // 버블링 방지
            
            if (bulkSelectMode) {
                $(this).toggleClass('bulk-selected');
                updateBulkCounter();
                return;
            }
            
            const idx = $(this).data('idx');
            const lineIdx = $(this).data('line-idx');
            const sender = $(this).data('sender');
            const isMyMessage = sender === 'me';
            
            console.log(`[Messages] Message clicked: idx=${idx}, sender=${sender}`); // 디버깅용
            showMsgOptions(currentContactId, idx, lineIdx, isMyMessage);
        });

        // ... (나머지 입력창, 전송 버튼 등 리스너는 원본 유지) ...
        $('#st-chat-input').off('keydown').on('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
        $('#st-chat-send').off('click').on('click', sendMessage);
        // ...
        $('#st-photo-confirm').off('click').on('click', async () => {
             // ... 사진 전송 로직 ...
             // 원본 유지
        });
    }

    // ... (appendBubble 등 헬퍼 함수) ...

    function appendBubble(sender, text, imageUrl, msgIndex, translatedText = null, replyTo = null) {
        const side = sender === 'me' ? 'me' : 'them';
        const $container = $('#st-chat-messages');
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        
        // [수정] clickable 클래스 확인
        const clickAttr = (msgIndex !== undefined && msgIndex !== null)
            ? `data-action="msg-option" data-idx="${msgIndex}" data-sender="${side}" class="st-msg-bubble ${side} clickable" title="옵션 보기"`
            : `class="st-msg-bubble ${side}"`;

        let wrapperHtml = `<div class="st-msg-wrapper ${side}">`;
        
        if (replyTo) {
             wrapperHtml += `<div class="st-msg-reply-preview"><div class="st-msg-reply-name">${replyTo.senderName}</div><div class="st-msg-reply-text">${replyTo.previewText}</div></div>`;
        }
        
        // [수정] 이미지도 클릭 가능하도록 속성 적용
        if (imageUrl) {
            const imgAttr = clickAttr.replace('st-msg-bubble', 'st-msg-bubble image-bubble');
            wrapperHtml += `<div ${imgAttr} data-line-idx="0"><img class="st-msg-image" src="${imageUrl}"></div>`;
        }
        
        if (text) {
             const lines = text.split('\n');
             // ... 번역 로직 ...
             lines.forEach((line, idx) => {
                 const trimmed = formatBankTagForDisplay(line.trim());
                 if (trimmed) {
                     wrapperHtml += `<div ${clickAttr} data-line-idx="${idx}">${trimmed}</div>`;
                 }
             });
        }
        wrapperHtml += `</div>`;
        
        $container.find('#st-typing').before(wrapperHtml);
        scrollToBottom();
    }

    // ... (나머지 삭제 반응, 전송 로직 등 원본 유지) ...
    async function sendMessage() {
        // ... 원본 유지 ...
        let text = $('#st-chat-input').val().trim();
        if (!text || !currentContactId) return;
        // ... 
    }

    // ... (generateReply, generateSmartImage 등 원본 유지) ...

    // ==========================================
    // [수정됨] 외부 메시지 동기화 (사진+텍스트 분리 처리)
    // ==========================================
    const syncExternalMessage = async (sender, text) => {
        if (!text) return;

        // 1. 연락처 확인
        let contacts = window.STPhone.Apps?.Contacts?.getAllContacts() || [];
        if (contacts.length === 0) {
            await window.STPhone.Apps.Contacts.syncAutoContacts();
            contacts = window.STPhone.Apps.Contacts.getAllContacts();
            if (contacts.length === 0) return; 
        }
        
        const firstContact = contacts[0];
        const contactId = firstContact.id;

        // 2. [핵심 수정] 텍스트와 이미지 태그([IMG:...])가 섞여 있을 경우 분리
        // 예: "사진입니다 [IMG:url]" -> ["사진입니다", "[IMG:url]"]
        // 줄바꿈이 없어도 분리되도록 정규식 Split 사용
        const tokens = text.split(/(\[IMG:[^\]]+\]|\n)/g).map(t => t.trim()).filter(t => t);

        // 3. 순차적으로 처리
        for (const token of tokens) {
            if (!token) continue;

            const imgMatch = token.match(/^\[IMG:\s*([^\]]+)\]$/i);
            let contentText = token;
            let contentImage = null;

            if (imgMatch) {
                // 이미지 태그인 경우 텍스트는 비우고 이미지만 설정
                contentText = ''; 
                // 이미지 URL이 별도라면 imgMatch[1]을 사용하거나, 
                // 스마트 이미지 생성 로직을 탄다면 여기서 생성해야 함.
                // 보통 ST 확장은 텍스트에 URL이 포함되어 옴.
                // 만약 [IMG:...]가 생성 프롬프트라면 generateSmartImage 호출 필요.
                // 여기서는 URL이거나 이미 생성된 것이라고 가정.
            } else {
                // 일반 텍스트 (줄바꿈 문자는 무시)
                if (token === '\n') continue;
            }

            // DB 저장
            const newIdx = await addMessage(contactId, sender, contentText, contentImage);

            // 화면 표시
            const isPhoneActive = $('#st-phone-container').hasClass('active');
            if (isPhoneActive) {
                await new Promise(r => setTimeout(r, 50)); // 자연스러운 연출을 위한 딜레이
                appendBubble(sender, contentText, contentImage, newIdx);
            }
        }

        // 4. 읽지 않음 카운트
        if (sender === 'them') {
            const unread = (await getUnreadCount(contactId)) + 1; // 뭉텅이로 1개만 증가시킴
            await setUnreadCount(contactId, unread);
            updateMessagesBadge();
        }
    };

    // ... (나머지 export 부분) ...
    return {
        open,
        openChat,
        openGroupChat,
        receiveMessage,
        receiveGroupMessage,
        getTotalUnread,
        getMessages,
        addMessage,
        syncExternalMessage, // [수정된 함수 내보내기]
        updateMessagesBadge,
        addHiddenLog,
        generateTransferReply
    };
})();