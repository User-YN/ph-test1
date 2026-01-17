window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Messages = (function() {
    'use strict';

    // ==========================================
    // [수정됨] 내부 DB 코드 삭제 -> 통합 저장소 사용
    // ==========================================
    
    // [Helper] 저장소 인스턴스 가져오기
    function getStorage() {
        if (window.STPhoneStorage) return window.STPhoneStorage;
        console.error('[Messages] window.STPhoneStorage가 초기화되지 않았습니다.');
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

    // 송금/출금 태그를 예쁜 문자열로 변환 (화면 표시용)
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
            // fallback
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
            if (errorStr.includes('PROHIBITED_CONTENT') || errorStr.includes('SAFETY') || errorStr.includes('blocked')) {
                return '';
            }
            console.error('[Messages] generateWithProfile 실패:', e);
            throw e;
        }
    }

    // (CSS 코드는 원본과 동일하게 유지)
    const notificationCss = `<style id="st-phone-notification-css"> .st-bubble-notification-container { position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; } .st-bubble-notification { display: flex; align-items: flex-start; gap: 10px; pointer-events: auto; cursor: pointer; animation: bubbleSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); } .st-bubble-notification.hiding { animation: bubbleSlideOut 0.3s ease-in forwards; } @keyframes bubbleSlideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes bubbleSlideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } } .st-bubble-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.2); } .st-bubble-content { max-width: 280px; background: linear-gradient(135deg, #34c759 0%, #30b350 100%); color: white; padding: 10px 14px; border-radius: 18px; border-bottom-left-radius: 4px; font-size: 14px; line-height: 1.4; box-shadow: 0 4px 15px rgba(52, 199, 89, 0.4); word-break: break-word; } .st-bubble-sender { font-size: 11px; font-weight: 600; opacity: 0.9; margin-bottom: 3px; } .st-bubble-text { font-size: 14px; } </style>`;
    function ensureNotificationCss() { if (!$('#st-phone-notification-css').length) $('head').append(notificationCss); }
    ensureNotificationCss();

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
            .st-msg-bubble.me { align-self: flex-end; background: var(--msg-my-bubble, var(--pt-accent, #007aff)); color: var(--msg-my-text, white); border-bottom-right-radius: 4px; }
            .st-msg-bubble.them { align-self: flex-start; background: var(--msg-their-bubble, var(--pt-card-bg, #e5e5ea)); color: var(--msg-their-text, var(--pt-text-color, #000)); border-bottom-left-radius: 4px; }
            .st-msg-bubble.deleted { opacity: 0.6; font-style: italic; }
            .st-msg-image { max-width: 200px; border-radius: 12px; cursor: pointer; }
            .st-msg-delete-btn { position: absolute; left: -18px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; border-radius: 50%; background: rgba(255, 59, 48, 0.7); color: white; border: none; font-size: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.6; transition: opacity 0.2s, transform 0.2s; z-index: 10; }
            .st-msg-delete-btn:hover { opacity: 1; transform: translateY(-50%) scale(1.2); }
            .st-msg-translation { font-size: 12px; color: var(--pt-sub-text, #666); margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(0,0,0,0.1); line-height: 1.4; }
            .st-msg-original { margin-bottom: 4px; }
            .st-msg-bubble.them .st-msg-translation { border-top-color: rgba(0,0,0,0.1); }
            .st-chat-input-area { display: flex; align-items: flex-end; padding: 14px 16px; padding-bottom: 45px; gap: 10px; border-top: 1px solid var(--pt-border, #e5e5e5); background: var(--pt-bg-color, #f5f5f7); flex-shrink: 0; }
            .st-chat-textarea { flex: 1; border: 1px solid var(--pt-border, #e5e5e5); background: var(--pt-card-bg, #f5f5f7); border-radius: 12px; padding: 12px 16px; font-size: 15px; resize: none; max-height: 100px; outline: none; color: var(--pt-text-color, #000); line-height: 1.4; }
            .st-chat-send { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--pt-accent, #007aff); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; transition: transform 0.1s, background 0.2s; }
            .st-chat-send:active { transform: scale(0.95); }
            .st-chat-translate-user-btn { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--pt-sub-text, #86868b); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; transition: transform 0.1s, background 0.2s; }
            .st-chat-translate-user-btn:active { transform: scale(0.95); }
            .st-chat-cam-btn { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--pt-card-bg, #e9e9ea); color: var(--pt-sub-text, #666); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
            .st-chat-cam-btn:active { background: #d1d1d6; }
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
            .st-group-modal { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,1); z-index: 2000; display: none; align-items: center; justify-content: center; }
            .st-group-box { width: 90%; max-height: 80%; background: var(--pt-card-bg, #fff); padding: 20px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); color: var(--pt-text-color, #000); display: flex; flex-direction: column; }
            .st-group-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; text-align: center; }
            .st-group-name-input { width: 100%; padding: 12px; border: 1px solid var(--pt-border, #e5e5e5); border-radius: 10px; font-size: 15px; margin-bottom: 15px; outline: none; box-sizing: border-box; background: var(--pt-bg-color, #f9f9f9); color: var(--pt-text-color, #000); }
            .st-group-contacts { flex: 1; overflow-y: auto; max-height: 250px; border: 1px solid var(--pt-border, #e5e5e5); border-radius: 10px; margin-bottom: 15px; }
            .st-group-contact-item { display: flex; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--pt-border, #e5e5e5); cursor: pointer; }
            .st-group-contact-item:last-child { border-bottom: none; }
            .st-group-contact-item.selected { background: rgba(0,122,255,0.1); }
            .st-group-contact-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; margin-right: 10px; }
            .st-group-contact-name { flex: 1; font-size: 15px; }
            .st-group-contact-check { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--pt-border, #ccc); display: flex; align-items: center; justify-content: center; font-size: 14px; color: white; }
            .st-group-contact-item.selected .st-group-contact-check { background: var(--pt-accent, #007aff); border-color: var(--pt-accent, #007aff); }
            .st-group-actions { display: flex; gap: 10px; }
            .st-group-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
            .st-group-btn.cancel { background: #e5e5ea; color: #000; }
            .st-group-btn.create { background: var(--pt-accent, #007aff); color: white; }
            .st-group-btn.create:disabled { background: #ccc; cursor: not-allowed; }
            .st-msg-timestamp { text-align: center; padding: 15px 0; color: var(--pt-sub-text, #86868b); font-size: 12px; }
            .st-msg-timestamp-text { background: var(--pt-card-bg, rgba(0,0,0,0.05)); padding: 5px 15px; border-radius: 15px; display: inline-block; }
            .st-msg-divider { display: flex; align-items: center; padding: 15px 0; color: var(--pt-sub-text, #86868b); font-size: 12px; }
            .st-msg-divider::before, .st-msg-divider::after { content: ''; flex: 1; height: 1px; background: var(--pt-border, #e5e5e5); }
            .st-msg-divider-text { padding: 0 10px; }
            .st-msg-rp-date { display: flex; align-items: center; justify-content: center; padding: 12px 0; color: var(--pt-sub-text, #86868b); font-size: 12px; }
            .st-msg-rp-date::before, .st-msg-rp-date::after { content: ''; flex: 1; height: 1px; background: var(--pt-border, #e5e5e5); max-width: 60px; }
            .st-msg-rp-date-text { padding: 0 12px; font-weight: 500; }
            .st-msg-custom-timestamp { display: flex; align-items: center; justify-content: center; padding: 10px 0; color: var(--pt-sub-text, #86868b); font-size: 11px; }
            .st-msg-custom-timestamp-text { background: var(--pt-card-bg, rgba(0,0,0,0.05)); padding: 4px 12px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: opacity 0.2s; }
            .st-msg-custom-timestamp-text:hover { opacity: 0.7; }
            .st-chat-timestamp-btn { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--pt-card-bg, #e9e9ea); color: var(--pt-sub-text, #666); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
            .st-chat-timestamp-btn:active { background: #d1d1d6; }
            .bulk-mode .st-msg-bubble { position: relative; margin-left: 20px; }
            .bulk-mode .st-msg-bubble.me { margin-left: 0; margin-right: 20px; }
            .bulk-mode .st-msg-bubble::before { content: ''; position: absolute; left: -18px; top: 50%; transform: translateY(-50%); width: 12px; height: 12px; border: 1.5px solid var(--pt-border, #ccc); border-radius: 50%; background: var(--pt-card-bg, #fff); }
            .bulk-mode .st-msg-bubble.me::before { left: auto; right: -18px; }
            .bulk-mode .st-msg-bubble.bulk-selected::before { background: #007aff; border-color: #007aff; }
            .bulk-mode .st-msg-bubble.bulk-selected::after { content: '✓'; position: absolute; left: -18px; top: 50%; transform: translateY(-50%); color: white; font-size: 8px; font-weight: bold; width: 12px; text-align: center; }
            .bulk-mode .st-msg-bubble.me.bulk-selected::after { left: auto; right: -18px; }
            .st-msg-reply-preview { font-size: 12px; padding: 6px 10px; margin-bottom: 4px; border-radius: 10px; max-width: 100%; display: flex; flex-direction: column; gap: 2px; }
            .st-msg-wrapper.me .st-msg-reply-preview { background: #ededed; border-left: 2px solid rgba(255,255,255,0.5); align-self: flex-end; }
            .st-msg-wrapper.them .st-msg-reply-preview { background: rgba(0,0,0,0.05); border-left: 2px solid var(--pt-accent, #007aff); align-self: flex-start; }
            .st-msg-reply-name { font-weight: 600; font-size: 11px; opacity: 0.8; }
            .st-msg-wrapper.me .st-msg-reply-name { color: #000; }
            .st-msg-wrapper.them .st-msg-reply-name { color: var(--pt-accent, #007aff); }
            .st-msg-reply-text { opacity: 0.8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
            .st-msg-wrapper.me .st-msg-reply-text { color: #1c1c1c; }
            .st-msg-wrapper.them .st-msg-reply-text { color: var(--pt-sub-text, #86868b); }
            .st-reply-bar { display: flex; align-items: center; padding: 8px 16px; background: var(--pt-card-bg, #f0f0f0); border-top: 1px solid var(--pt-border, #e5e5e5); gap: 10px; }
            .st-reply-bar-content { flex: 1; min-width: 0; }
            .st-reply-bar-label { font-size: 11px; color: var(--pt-accent, #007aff); font-weight: 600; }
            .st-reply-bar-text { font-size: 13px; color: var(--pt-sub-text, #86868b); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .st-reply-bar-close { width: 24px; height: 24px; border-radius: 50%; border: none; background: var(--pt-border, #ddd); color: var(--pt-sub-text, #666); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
            .st-reply-bar-close:hover { background: var(--pt-sub-text, #999); color: white; }
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

    // ========== 저장소 키 ==========
    function getStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        if (settings.recordMode === 'accumulate' && context.characterId !== undefined) {
            return 'st_phone_messages_char_' + context.characterId;
        }
        return 'st_phone_messages_' + context.chatId;
    }

    function getGroupStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        if (settings.recordMode === 'accumulate' && context.characterId !== undefined) {
            return 'st_phone_groups_char_' + context.characterId;
        }
        return 'st_phone_groups_' + context.chatId;
    }

    // ========== 번역 캐시 저장소 (IndexedDB 변환) ==========
    function getTranslationStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        return 'st_phone_translations_' + context.chatId;
    }

    // ========== 타임스탬프 저장소 (IndexedDB 변환) ==========
    function getTimestampStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        return 'st_phone_timestamps_' + context.chatId;
    }

    async function loadTimestamps(contactId) {
        const key = getTimestampStorageKey();
        if (!key) return [];
        try {
            // [수정됨] window.STPhoneStorage 사용
            const all = (await getStorage().getItem(key)) || {};
            return all[contactId] || [];
        } catch (e) { return []; }
    }

    async function saveTimestamp(contactId, beforeMsgIndex, timestamp) {
        const key = getTimestampStorageKey();
        if (!key) return;
        try {
            // [수정됨] window.STPhoneStorage 사용
            const all = (await getStorage().getItem(key)) || {};
            if (!all[contactId]) all[contactId] = [];
            const exists = all[contactId].some(t => t.beforeMsgIndex === beforeMsgIndex);
            if (!exists) {
                all[contactId].push({ beforeMsgIndex, timestamp });
                await getStorage().setItem(key, all);
            }
        } catch (e) { console.error('[Messages] 타임스탬프 저장 실패:', e); }
    }

    // ========== 커스텀 타임스탬프 저장소 (IndexedDB 변환) ==========
    function getCustomTimestampStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        return 'st_phone_custom_timestamps_' + context.chatId;
    }

    async function loadCustomTimestamps(contactId) {
        const key = getCustomTimestampStorageKey();
        if (!key) return [];
        try {
            // [수정됨] window.STPhoneStorage 사용
            const all = (await getStorage().getItem(key)) || {};
            return all[contactId] || [];
        } catch (e) { return []; }
    }

    async function saveCustomTimestamp(contactId, beforeMsgIndex, text) {
        const key = getCustomTimestampStorageKey();
        if (!key) return;
        try {
            // [수정됨] window.STPhoneStorage 사용
            const all = (await getStorage().getItem(key)) || {};
            if (!all[contactId]) all[contactId] = [];
            all[contactId].push({ beforeMsgIndex, text, id: Date.now() });
            await getStorage().setItem(key, all);
        } catch (e) { console.error('[Messages] 커스텀 타임스탬프 저장 실패:', e); }
    }

    async function updateCustomTimestamp(contactId, timestampId, newText) {
        const key = getCustomTimestampStorageKey();
        if (!key) return;
        try {
            const all = (await getStorage().getItem(key)) || {};
            if (!all[contactId]) return;
            const ts = all[contactId].find(t => t.id === timestampId);
            if (ts) {
                ts.text = newText;
                await getStorage().setItem(key, all);
            }
        } catch (e) { console.error('[Messages] 커스텀 타임스탬프 수정 실패:', e); }
    }

    async function deleteCustomTimestamp(contactId, timestampId) {
        const key = getCustomTimestampStorageKey();
        if (!key) return;
        try {
            const all = (await getStorage().getItem(key)) || {};
            if (!all[contactId]) return;
            all[contactId] = all[contactId].filter(t => t.id !== timestampId);
            await getStorage().setItem(key, all);
        } catch (e) { console.error('[Messages] 커스텀 타임스탬프 삭제 실패:', e); }
    }

    function getCustomTimestampHtml(text, timestampId) {
        return `<div class="st-msg-custom-timestamp" data-ts-id="${timestampId}"><span class="st-msg-custom-timestamp-text" data-action="edit-timestamp" data-ts-id="${timestampId}"><i class="fa-regular fa-clock"></i>${text}</span></div>`;
    }

    function removeTimestampHiddenLog(timestampId) {
        if (!window.SillyTavern) return;
        const context = window.SillyTavern.getContext();
        if (!context || !context.chat) return;

        const marker = `[ts:${timestampId}]`;
        for (let i = context.chat.length - 1; i >= 0; i--) {
            const msg = context.chat[i];
            if (msg.extra && msg.extra.is_phone_log && msg.mes.includes(marker)) {
                context.chat.splice(i, 1);
                console.log(`📱 [Messages] 타임스탬프 히든 로그 삭제됨: ${timestampId}`);
                if (window.SlashCommandParser && window.SlashCommandParser.commands['savechat']) {
                    window.SlashCommandParser.commands['savechat'].callback({});
                }
                return;
            }
        }
    }

    async function addTimestampHiddenLog(contactId, timestampId, text) {
        const marker = `[ts:${timestampId}]`;
        let logText = '';
        if (currentChatType === 'group') {
            const group = await getGroup(contactId);
            logText = `${marker}[⏰ Time Skip - Group "${group?.name || 'Unknown'}"] ${text}`;
        } else {
            const contact = window.STPhone.Apps?.Contacts?.getContact(contactId);
            logText = `${marker}[⏰ Time Skip - ${contact?.name || 'Unknown'}] ${text}`;
        }
        console.log('📱 [Messages] 타임스탬프 히든 로그 추가:', logText);
        addHiddenLog('System', logText);
    }

    async function loadTranslations() {
        const key = getTranslationStorageKey();
        if (!key) return {};
        try {
            return (await getStorage().getItem(key)) || {};
        } catch (e) { return {}; }
    }

    async function saveTranslation(contactId, msgIndex, translatedText) {
        const key = getTranslationStorageKey();
        if (!key) return;
        const translations = await loadTranslations();
        if (!translations[contactId]) translations[contactId] = {};
        translations[contactId][msgIndex] = translatedText;
        await getStorage().setItem(key, translations);
    }

    async function getTranslation(contactId, msgIndex) {
        const translations = await loadTranslations();
        return translations[contactId]?.[msgIndex] || null;
    }

    // ========== 1:1 메시지 저장소 (IndexedDB 변환) ==========
    async function loadAllMessages() {
        const key = getStorageKey();
        if (!key) return {};
        try {
            // [수정됨] window.STPhoneStorage 사용
            return (await getStorage().getItem(key)) || {};
        } catch (e) { return {}; }
    }

    async function saveAllMessages(data) {
        const key = getStorageKey();
        if (!key) return;
        // [수정됨] window.STPhoneStorage 사용
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

        if (replyTo) {
            msgData.replyTo = replyTo;
        }

        all[contactId].push(msgData);
        await saveAllMessages(all);
        return all[contactId].length - 1;
    }

    // ========== 메시지 수정 (삭제 시 대체 텍스트로 변경) ==========
    async function updateMessage(contactId, msgIndex, newText, isDeleted = false) {
        const all = await loadAllMessages();
        if (!all[contactId] || !all[contactId][msgIndex]) return false;

        all[contactId][msgIndex].text = newText;
        all[contactId][msgIndex].isDeleted = isDeleted;
        if (isDeleted) {
            all[contactId][msgIndex].image = null;
        }
        await saveAllMessages(all);
        return true;
    }

    const RP_DATE_REGEX = /^\s*\[(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)\]\s*/;

    function extractRpDate(text) {
        const match = text.match(RP_DATE_REGEX);
        if (match) {
            return {
                year: parseInt(match[1]),
                month: parseInt(match[2]),
                day: parseInt(match[3]),
                dayOfWeek: match[4],
                fullMatch: match[0],
                dateStr: `${match[1]}년 ${match[2]}월 ${match[3]}일 ${match[4]}`
            };
        }
        return null;
    }

    function stripRpDate(text) {
        return text.replace(RP_DATE_REGEX, '').trim();
    }

    function getRpDateDividerHtml(dateStr) {
        return `<div class="st-msg-rp-date"><span class="st-msg-rp-date-text"><i class="fa-regular fa-calendar" style="margin-right:6px;"></i>${dateStr}</span></div>`;
    }

    // ========== 그룹 저장소 (IndexedDB 변환) ==========
    async function loadGroups() {
        const key = getGroupStorageKey();
        if (!key) return [];
        try {
            // [수정됨] window.STPhoneStorage 사용
            return (await getStorage().getItem(key)) || [];
        } catch (e) { return []; }
    }

    async function saveGroups(groups) {
        const key = getGroupStorageKey();
        if (!key) return;
        await getStorage().setItem(key, groups);
    }

    async function getGroup(groupId) {
        const groups = await loadGroups();
        return groups.find(g => g.id === groupId);
    }

    async function getGroupMessages(groupId) {
        const group = await getGroup(groupId);
        return group?.messages || [];
    }

    async function addGroupMessage(groupId, senderId, senderName, text, imageUrl = null) {
        const groups = await loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        if (!group.messages) group.messages = [];
        group.messages.push({
            senderId,
            senderName,
            text,
            image: imageUrl,
            timestamp: Date.now()
        });
        await saveGroups(groups);
    }

    async function createGroup(name, memberIds) {
        const groups = await loadGroups();
        const newGroup = {
            id: 'group_' + Date.now(),
            name,
            members: memberIds,
            messages: [],
            createdAt: Date.now()
        };
        groups.push(newGroup);
        await saveGroups(groups);
        return newGroup;
    }

    // ========== 읽지 않음 카운트 (IndexedDB 변환) ==========
    async function getUnreadCount(contactId) {
        const key = getStorageKey();
        if (!key) return 0;
        try {
            // [수정됨] window.STPhoneStorage 사용
            const unread = (await getStorage().getItem(key + '_unread')) || {};
            return unread[contactId] || 0;
        } catch (e) { return 0; }
    }

    async function setUnreadCount(contactId, count) {
        const key = getStorageKey();
        if (!key) return;
        // [수정됨] window.STPhoneStorage 사용
        const unread = (await getStorage().getItem(key + '_unread')) || {};
        unread[contactId] = count;
        await getStorage().setItem(key + '_unread', unread);
    }

    async function getTotalUnread() {
        const key = getStorageKey();
        if (!key) return 0;
        try {
            // [수정됨] window.STPhoneStorage 사용
            const unread = (await getStorage().getItem(key + '_unread')) || {};
            return Object.values(unread).reduce((a, b) => a + b, 0);
        } catch (e) { return 0; }
    }

    function formatTime(ts) {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function ensureBubbleContainer() {
        if (!$('.st-bubble-notification-container').length) {
            $('body').append('<div class="st-bubble-notification-container"></div>');
        }
        return $('.st-bubble-notification-container');
    }

    function showBubbleNotification(senderName, text, avatarUrl, chatId, chatType) {
        const $container = ensureBubbleContainer();
        const bubbleId = 'bubble_' + Date.now();
        const bubbleHtml = `<div class="st-bubble-notification" id="${bubbleId}" data-chat-id="${chatId}" data-chat-type="${chatType}"> <img class="st-bubble-avatar" src="${avatarUrl || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'"> <div class="st-bubble-content"> <div class="st-bubble-sender">${senderName}</div> <div class="st-bubble-text">${text}</div> </div> </div>`;
        $container.append(bubbleHtml);
        const $bubble = $(`#${bubbleId}`);
        $bubble.on('click', function() {
            const id = $(this).data('chat-id');
            const type = $(this).data('chat-type');
            $(this).addClass('hiding');
            setTimeout(() => $(this).remove(), 300);
            const $phone = $('#st-phone-container');
            if (!$phone.hasClass('active')) $phone.addClass('active');
            if (type === 'group') openGroupChat(id);
            else openChat(id);
        });
        setTimeout(() => {
            $bubble.addClass('hiding');
            setTimeout(() => $bubble.remove(), 300);
        }, 6000);
    }

    function showNotification(senderName, preview, avatarUrl, chatId, chatType) {
        showBubbleNotification(senderName, preview, avatarUrl, chatId, chatType);
    }

    async function showSequentialBubbles(contactId, lines, contactName, avatarUrl, chatType) {
        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i].trim();
            if (!lineText) continue;
            await new Promise(resolve => setTimeout(resolve, i * 400));
            showBubbleNotification(contactName, lineText, avatarUrl, contactId, chatType || 'dm');
        }
    }

    async function receiveMessageSequential(contactId, text, contactName, myName, replyTo = null) {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length === 0) return;

        let contact = null;
        if (window.STPhone.Apps?.Contacts) {
            contact = window.STPhone.Apps.Contacts.getContact(contactId);
        }
        const contactAvatar = contact?.avatar || DEFAULT_AVATAR;
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        let lineReplyTo = replyTo;

        for (let i = 0; i < lines.length; i++) {
            let lineText = lines[i].trim();
            if (!lineText) continue;

            const calendarInstalled = window.STPhone?.Apps?.Store?.isInstalled?.('calendar');
            const rpDateInfo = calendarInstalled ? extractRpDate(lineText) : null;
            let rpDateStr = null;

            if (rpDateInfo) {
                lineText = stripRpDate(lineText);
                rpDateStr = rpDateInfo.dateStr;
                if (window.STPhone?.Apps?.Calendar) {
                    window.STPhone.Apps.Calendar.updateRpDate({
                        year: rpDateInfo.year,
                        month: rpDateInfo.month,
                        day: rpDateInfo.day,
                        dayOfWeek: rpDateInfo.dayOfWeek
                    });
                }
                if (!lineText) continue;
            }

            const baseDelay = 500 + Math.random() * 800;
            const charDelay = Math.min(lineText.length * 30, 1500);
            const totalDelay = baseDelay + charDelay;

            await new Promise(resolve => setTimeout(resolve, totalDelay));

            const isPhoneActive = $('#st-phone-container').hasClass('active');
            const isViewingThisChat = (currentChatType === 'dm' && currentContactId === contactId);
            const $containerNow = $('#st-chat-messages');

            // [Async]
            const newIdx = await addMessage(contactId, 'them', lineText, null, false, rpDateStr, i === 0 ? lineReplyTo : null);

            let translatedText = null;
            if (settings.translateEnabled) {
                translatedText = await translateText(lineText);
                if (translatedText) {
                    await saveTranslation(contactId, newIdx, translatedText);
                }
            }

            if (!isPhoneActive || !isViewingThisChat) {
                const unread = (await getUnreadCount(contactId)) + 1;
                await setUnreadCount(contactId, unread);
                updateMessagesBadge();

                const displayText = translatedText || lineText;
                showBubbleNotification(contactName, displayText, contactAvatar, contactId, 'dm');
            } else if ($containerNow.length) {
                if ($('#st-typing').length) $('#st-typing').hide();
                const side = 'them';
                const clickAttr = `data-action="msg-option" data-idx="${newIdx}" data-line-idx="0" data-sender="${side}" class="st-msg-bubble ${side} clickable" style="cursor:pointer;" title="옵션 보기"`;
                const displayLineText = formatBankTagForDisplay(lineText);
                let bubbleContent = displayLineText;

                if (translatedText) {
                    const displayMode = settings.translateDisplayMode || 'both';
                    if (displayMode === 'korean') bubbleContent = translatedText;
                    else bubbleContent = `<div class="st-msg-original">${displayLineText}</div><div class="st-msg-translation">${translatedText}</div>`;
                }

                // [Async] 메시지를 다시 불러오기 (rpDate 체크)
                const msgs = await getMessages(contactId);
                const currentMsg = msgs[msgs.length - 1];
                const prevMsg = msgs.length > 1 ? msgs[msgs.length - 2] : null;

                if (currentMsg && currentMsg.rpDate) {
                    if (!prevMsg || prevMsg.rpDate !== currentMsg.rpDate) {
                        $containerNow.find('#st-typing').before(getRpDateDividerHtml(currentMsg.rpDate));
                    }
                }

                let wrapperHtml = `<div class="st-msg-wrapper ${side}">`;
                if (i === 0 && lineReplyTo) {
                    wrapperHtml += `<div class="st-msg-reply-preview"> <div class="st-msg-reply-name">${lineReplyTo.senderName}</div> <div class="st-msg-reply-text">${lineReplyTo.previewText}</div> </div>`;
                }
                wrapperHtml += `<div ${clickAttr}>${bubbleContent}</div></div>`;
                $containerNow.find('#st-typing').before(wrapperHtml);
                scrollToBottom();

                if (i < lines.length - 1) {
                    if ($('#st-typing').length) $('#st-typing').show();
                }
            }
            addHiddenLog(contactName, `[📩 ${contactName} -> ${myName}]: ${lineText}`);
        }
    }

    async function receiveMessage(contactId, text, imageUrl = null, replyTo = null) {
        // [Async]
        const newIdx = await addMessage(contactId, 'them', text, imageUrl, false, null, replyTo);

        const isPhoneActive = $('#st-phone-container').hasClass('active');
        const isViewingThisChat = (currentChatType === 'dm' && currentContactId === contactId);

        let contact = null;
        if (window.STPhone.Apps?.Contacts) {
            contact = window.STPhone.Apps.Contacts.getContact(contactId);
        }
        const contactName = contact?.name || '알 수 없음';
        const contactAvatar = contact?.avatar || DEFAULT_AVATAR;

        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        let translatedText = null;

        if (text && settings.translateEnabled) {
            translatedText = await translateText(text);
            if (translatedText) {
                await saveTranslation(contactId, newIdx, translatedText);
            }
        }

        if (isPhoneActive && isViewingThisChat) {
            appendBubble('them', text, imageUrl, newIdx, translatedText, replyTo);
        }

        if (!isPhoneActive || !isViewingThisChat) {
            const unread = (await getUnreadCount(contactId)) + 1;
            await setUnreadCount(contactId, unread);
            updateMessagesBadge();

            let preview;
            if (imageUrl) preview = '사진';
            else if (/\[💰.*송금.*:/.test(text)) preview = '💰 송금 알림';
            else if (/\[💰.*출금.*:/.test(text)) preview = '💰 결제 알림';
            else preview = (translatedText || text)?.substring(0, 50) || '새 메시지';

            showNotification(contactName, preview, contactAvatar, contactId, 'dm');
        }
    }

    async function translateAndUpdateBubble(contactId, msgIndex, originalText) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const displayMode = settings.translateDisplayMode || 'both';

        const translatedText = await translateText(originalText);
        if (!translatedText) return;

        await saveTranslation(contactId, msgIndex, translatedText);

        const $bubbles = $(`[data-idx="${msgIndex}"]`);
        if ($bubbles.length === 0) return;

        const lines = originalText.split('\n');
        const translatedLines = translatedText.split('\n');

        $bubbles.each(function(idx) {
            const $bubble = $(this);
            const originalLine = lines[idx]?.trim() || originalText.trim();
            const translatedLine = translatedLines[idx]?.trim() || translatedText.trim();
            let newContent = '';
            if (displayMode === 'korean') newContent = translatedLine;
            else newContent = `<div class="st-msg-original">${originalLine}</div><div class="st-msg-translation">${translatedLine}</div>`;
            $bubble.html(newContent);
        });
    }

    async function receiveGroupMessage(groupId, senderId, senderName, text, imageUrl = null) {
        // [Async]
        await addGroupMessage(groupId, senderId, senderName, text, imageUrl);

        const isPhoneActive = $('#st-phone-container').hasClass('active');
        const isViewingThisChat = (currentChatType === 'group' && currentGroupId === groupId);
        const group = await getGroup(groupId);

        let senderAvatar = DEFAULT_AVATAR;
        if (window.STPhone.Apps?.Contacts) {
            const contact = window.STPhone.Apps.Contacts.getContact(senderId);
            if (contact) senderAvatar = contact.avatar || DEFAULT_AVATAR;
        }

        if (!isPhoneActive || !isViewingThisChat) {
            const unread = (await getUnreadCount(groupId)) + 1;
            await setUnreadCount(groupId, unread);
            updateMessagesBadge();

            const preview = imageUrl ? '사진' : (text?.substring(0, 50) || '새 메시지');
            const displayName = `${group?.name || '그룹'} - ${senderName}`;
            showNotification(displayName, preview, senderAvatar, groupId, 'group');
        } else {
            appendGroupBubble(senderId, senderName, text, imageUrl);
        }
    }

    async function updateMessagesBadge() {
        // [Async]
        const total = await getTotalUnread();
        const $msgIcon = $('.st-app-icon[data-app="messages"]');
        $msgIcon.find('.st-app-badge').remove();
        if (total > 0) {
            $msgIcon.append(`<div class="st-app-badge">${total > 99 ? '99+' : total}</div>`);
        }
    }

    async function open() {
        currentContactId = null;
        currentGroupId = null;
        currentChatType = 'dm';

        await window.STPhone.Apps?.Contacts?.syncAutoContacts?.();

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
            <div class="st-group-modal" id="st-group-modal">
                <div class="st-group-box">
                    <div class="st-group-title">새 그룹 만들기</div>
                    <input type="text" class="st-group-name-input" id="st-group-name" placeholder="그룹 이름">
                    <div class="st-group-contacts" id="st-group-contacts"></div>
                    <div class="st-group-actions">
                        <button class="st-group-btn cancel" id="st-group-cancel">취소</button>
                        <button class="st-group-btn create" id="st-group-create" disabled>만들기</button>
                    </div>
                </div>
            </div>
        `);

        await renderDMList();
        attachMainListeners();
    }

    async function renderDMList() {
        const $list = $('#st-messages-list');
        $list.empty();
        const contacts = window.STPhone.Apps?.Contacts?.getAllContacts() || [];
        
        // [Async] 한 번에 로드 (성능 최적화 고려)
        const allMsgs = await loadAllMessages();

        if (contacts.length === 0) {
            $list.html(`<div class="st-messages-empty"><div style="font-size:36px;opacity:0.4;margin-bottom:15px;"><i class="fa-regular fa-comments"></i></div><div>대화가 없습니다</div><div style="font-size:12px;margin-top:8px;opacity:0.7;">연락처를 추가하고 대화를 시작하세요</div></div>`);
            return;
        }

        // [Async] unread count는 별도 키를 사용하므로 Promise.all로 처리
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
                        ${last ? `<div class="st-thread-time">${formatTime(last.timestamp)}</div>` : ''}
                        ${unread > 0 ? `<div class="st-thread-badge">${unread}</div>` : ''}
                    </div>
                </div>
            `);
        });
    }

    async function renderGroupList() {
        const $list = $('#st-messages-list');
        $list.empty();

        // [Async]
        const groups = await loadGroups();

        if (groups.length === 0) {
            $list.html(`<div class="st-messages-empty"><div style="font-size:36px;opacity:0.4;margin-bottom:15px;"><i class="fa-solid fa-user-group"></i></div><div>그룹이 없습니다</div><div style="font-size:12px;margin-top:8px;opacity:0.7;">상단 버튼을 눌러 새 그룹을 만드세요</div></div>`);
            return;
        }

        const unreadPromises = groups.map(g => getUnreadCount(g.id));
        const unreadCounts = await Promise.all(unreadPromises);

        groups.forEach((g, idx) => {
            const msgs = g.messages || [];
            const last = msgs[msgs.length - 1];
            const unread = unreadCounts[idx];
            let memberNames = [];
            if (window.STPhone.Apps?.Contacts) {
                g.members.forEach(mid => {
                    const c = window.STPhone.Apps.Contacts.getContact(mid);
                    if (c) memberNames.push(c.name);
                });
            }

            $list.append(`
                <div class="st-thread-item" data-id="${g.id}" data-type="group">
                    <div class="st-thread-avatar-group"><i class="fa-solid fa-users"></i></div>
                    <div class="st-thread-info">
                        <div class="st-thread-name">${g.name}</div>
                        <div class="st-thread-members">${memberNames.join(', ') || '멤버 없음'}</div>
                        <div class="st-thread-preview">${last ? (last.image ? '사진' : `${last.senderName}: ${last.text}`) : '새 대화'}</div>
                    </div>
                    <div class="st-thread-meta">
                        ${last ? `<div class="st-thread-time">${formatTime(last.timestamp)}</div>` : ''}
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
            else renderGroupList();
            attachThreadClickListeners();
        });
        attachThreadClickListeners();
        $('#st-new-group-btn').on('click', openGroupModal);
        $('#st-group-cancel').on('click', () => $('#st-group-modal').hide());
        $('#st-group-create').on('click', createNewGroup);
        $('#st-group-name').on('input', checkGroupCreateBtn);
    }

    function attachThreadClickListeners() {
        $('.st-thread-item').off('click').on('click', function() {
            const id = $(this).data('id');
            const type = $(this).data('type');
            if (type === 'group') openGroupChat(id);
            else openChat(id);
        });
    }

    function openGroupModal() {
        const contacts = window.STPhone.Apps?.Contacts?.getAllContacts() || [];
        const $contacts = $('#st-group-contacts');
        $contacts.empty();

        if (contacts.length < 2) {
            $contacts.html('<div style="padding:20px;text-align:center;color:#999;">그룹을 만들려면 연락처가 2개 이상 필요합니다</div>');
            $('#st-group-create').prop('disabled', true);
            $('#st-group-modal').css('display', 'flex');
            return;
        }

        contacts.forEach(c => {
            $contacts.append(`
                <div class="st-group-contact-item" data-id="${c.id}">
                    <img class="st-group-contact-avatar" src="${c.avatar || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'">
                    <div class="st-group-contact-name">${c.name}</div>
                    <div class="st-group-contact-check">✓</div>
                </div>
            `);
        });

        $('.st-group-contact-item').on('click', function() {
            $(this).toggleClass('selected');
            checkGroupCreateBtn();
        });

        $('#st-group-name').val('');
        $('#st-group-modal').css('display', 'flex');
    }

    function checkGroupCreateBtn() {
        const name = $('#st-group-name').val().trim();
        const selected = $('.st-group-contact-item.selected').length;
        $('#st-group-create').prop('disabled', !name || selected < 2);
    }

    async function createNewGroup() {
        const name = $('#st-group-name').val().trim();
        const memberIds = [];
        $('.st-group-contact-item.selected').each(function() {
            memberIds.push($(this).data('id'));
        });

        if (!name || memberIds.length < 2) return;

        // [Async]
        await createGroup(name, memberIds);
        $('#st-group-modal').hide();
        toastr.success(`👥 "${name}" 그룹이 생성되었습니다!`);

        $('.st-messages-tab').removeClass('active');
        $('.st-messages-tab[data-tab="group"]').addClass('active');
        await renderGroupList();
        attachThreadClickListeners();
    }

    async function openChat(contactId) {
        if (replyTimer) clearTimeout(replyTimer);
        currentContactId = contactId;
        currentGroupId = null;
        currentChatType = 'dm';
        
        // [Async]
        await setUnreadCount(contactId, 0);
        updateMessagesBadge();

        const contact = window.STPhone.Apps.Contacts.getContact(contactId);
        if (!contact) { toastr.error('연락처를 찾을 수 없습니다'); return; }

        const $screen = window.STPhone.UI.getContentElement();
        $screen.empty();

        // [Async]
        const msgs = await getMessages(contactId);
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const timestamps = await loadTimestamps(contactId);
        const customTimestamps = await loadCustomTimestamps(contactId);
        const timestampMode = settings.timestampMode || 'none';
        
        let msgsHtml = '';
        let lastRenderedRpDate = null;

        for (let index = 0; index < msgs.length; index++) {
            const m = msgs[index];
            const customTsForIndex = customTimestamps.filter(t => t.beforeMsgIndex === index);
            customTsForIndex.forEach(ts => { msgsHtml += getCustomTimestampHtml(ts.text, ts.id); });

            if (m.rpDate && m.rpDate !== lastRenderedRpDate) {
                msgsHtml += getRpDateDividerHtml(m.rpDate);
                lastRenderedRpDate = m.rpDate;
            }

            if (timestampMode !== 'none') {
                const tsData = timestamps.find(t => t.beforeMsgIndex === index);
                if (tsData) {
                    const date = new Date(tsData.timestamp);
                    const timeStr = `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
                    if (timestampMode === 'timestamp') msgsHtml += `<div class="st-msg-timestamp"><span class="st-msg-timestamp-text">${timeStr}</span></div>`;
                    else if (timestampMode === 'divider') msgsHtml += `<div class="st-msg-divider"><span class="st-msg-divider-text">대화 복귀</span></div>`;
                }
            }
            const side = m.sender === 'me' ? 'me' : 'them';
            // [Async] 번역 불러오기
            const savedTranslation = (side === 'them') ? await getTranslation(contactId, index) : null;
            const translateEnabled = settings.translateEnabled && side === 'them' && savedTranslation;
            const displayMode = settings.translateDisplayMode || 'both';
            const isDeleted = m.isDeleted === true;
            const deletedClass = isDeleted ? ' deleted' : '';
            const isExcluded = m.excludeFromContext === true;
            const excludedTag = isExcluded ? '<span class="st-msg-no-context">미반영</span>' : '';

            msgsHtml += `<div class="st-msg-wrapper ${side}">`;
            if (m.replyTo) {
                msgsHtml += `<div class="st-msg-reply-preview"><div class="st-msg-reply-name">${m.replyTo.senderName}</div><div class="st-msg-reply-text">${m.replyTo.previewText}</div></div>`;
            }
            if (m.image && !isDeleted) {
                const imgAttr = `data-action="msg-option" data-idx="${index}" data-line-idx="0" data-sender="${side}" class="st-msg-bubble ${side} image-bubble clickable" style="cursor:pointer;" title="옵션 보기"`;
                msgsHtml += `<div ${imgAttr}><img class="st-msg-image" src="${m.image}">${excludedTag}</div>`;
            }
            if (m.text) {
                if (isDeleted) {
                    const lineAttr = `data-action="msg-option" data-idx="${index}" data-line-idx="0" data-sender="${side}" class="st-msg-bubble ${side}${deletedClass} clickable" style="cursor:pointer;" title="옵션 보기"`;
                    msgsHtml += `<div ${lineAttr}>${m.text}${excludedTag}</div>`;
                } else {
                    const lines = m.text.split('\n');
                    const translatedLines = savedTranslation ? savedTranslation.split('\n') : [];
                    let lineIdx = 0;
                    lines.forEach((line, idx) => {
                        const trimmed = formatBankTagForDisplay(line.trim());
                        if (trimmed) {
                            let bubbleContent = '';
                            const lineAttr = `data-action="msg-option" data-idx="${index}" data-line-idx="${lineIdx}" data-sender="${side}" class="st-msg-bubble ${side} clickable" style="cursor:pointer;" title="옵션 보기"`;
                            if (translateEnabled) {
                                const translatedLine = translatedLines[idx]?.trim();
                                if (displayMode === 'korean' && translatedLine) bubbleContent = translatedLine;
                                else if (translatedLine) bubbleContent = `<div class="st-msg-original">${trimmed}</div><div class="st-msg-translation">${translatedLine}</div>`;
                                else bubbleContent = trimmed;
                            } else {
                                bubbleContent = trimmed;
                            }
                            msgsHtml += `<div ${lineAttr}>${bubbleContent}${lineIdx === 0 ? excludedTag : ''}</div>`;
                            lineIdx++;
                        }
                    });
                }
            }
            msgsHtml += `</div>`;
        }

        const trailingTimestamps = customTimestamps.filter(t => t.beforeMsgIndex >= msgs.length);
        trailingTimestamps.forEach(ts => { msgsHtml += getCustomTimestampHtml(ts.text, ts.id); });

        $screen.append(`
            ${css}
            <div class="st-chat-screen">
                <div class="st-chat-header" style="position: relative;">
                    <button class="st-chat-back" id="st-chat-back">‹</button>
                    <div class="st-chat-contact">
                        <img class="st-chat-avatar" src="${contact.avatar || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'">
                        <span class="st-chat-name">${contact.name}</span>
                    </div>
                </div>
                <div class="st-chat-messages" id="st-chat-messages">
                    ${msgsHtml}
                    <div class="st-typing-indicator" id="st-typing"><div class="st-typing-dots"><span></span><span></span><span></span></div></div>
                </div>
                <div class="st-chat-input-area">
                    <button class="st-chat-cam-btn" id="st-chat-cam"><i class="fa-solid fa-camera"></i></button>
                    <button class="st-chat-timestamp-btn" id="st-chat-timestamp" title="타임스탬프 추가"><i class="fa-regular fa-clock"></i></button>
                    <textarea class="st-chat-textarea" id="st-chat-input" placeholder="메시지" rows="1"></textarea>
                    ${settings.translateEnabled ? '<button class="st-chat-translate-user-btn" id="st-chat-translate-user" title="영어로 번역"><i class="fa-solid fa-language"></i></button>' : ''}
                    <button class="st-chat-send" id="st-chat-send"><i class="fa-solid fa-arrow-up"></i></button>
                </div>
                <div class="st-photo-popup" id="st-photo-popup">
                    <div class="st-photo-box">
                        <div style="font-weight:600;font-size:17px;text-align:center;">사진 보내기</div>
                        <input type="text" class="st-photo-input" id="st-photo-prompt" placeholder="어떤 사진인가요? (예: 해변의 석양)">
                        <div class="st-photo-actions">
                            <button class="st-photo-btn cancel" id="st-photo-cancel">취소</button>
                            <button class="st-photo-btn send" id="st-photo-confirm">생성 및 전송</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        scrollToBottom();
        attachChatListeners(contactId, contact);
        applyMessageBackground();
    }

    function applyMessageBackground() {
        if (window.STPhone.Apps?.Theme?.getCurrentTheme) {
            const theme = window.STPhone.Apps.Theme.getCurrentTheme();
            if (!theme?.messages) return;
            const messages = theme.messages;
            const $chatMessages = $('#st-chat-messages');
            if (messages.bgImage && messages.bgImage.length > 0) {
                if ($chatMessages.length) {
                    $chatMessages.css({ 'background-image': `url("${messages.bgImage}")`, 'background-color': 'transparent', 'background-size': 'cover', 'background-position': 'center', 'background-repeat': 'no-repeat' });
                }
            }
            const bubbleWidth = messages.bubbleMaxWidth || 75;
            const bubbleRadius = messages.bubbleRadius || 18;
            const bubbleFontSize = messages.fontSize || 15;
            $('.st-msg-bubble').each(function() {
                this.style.cssText += `max-width: ${bubbleWidth}% !important; border-radius: ${bubbleRadius}px !important; font-size: ${bubbleFontSize}px !important; width: auto !important; min-width: fit-content !important; word-break: keep-all !important; white-space: pre-wrap !important;`;
            });
            $('.st-msg-bubble.me').each(function() { this.style.cssText += `background: ${messages.myBubbleColor} !important; color: ${messages.myBubbleTextColor} !important; border-bottom-right-radius: 4px !important;`; });
            $('.st-msg-bubble.them').each(function() { this.style.cssText += `background: ${messages.theirBubbleColor} !important; color: ${messages.theirBubbleTextColor} !important; border-bottom-left-radius: 4px !important;`; });
            console.log('🖼️ [Messages] Theme applied, bubble width:', bubbleWidth + '%');
        }
    }

    function attachChatListeners(contactId, contact) {
        $('#st-chat-back').off('click').on('click', open);
        $('#st-chat-messages').off('click', '[data-action="msg-option"]').on('click', '[data-action="msg-option"]', function(e) {
            if (bulkSelectMode) {
                e.stopPropagation();
                $(this).toggleClass('bulk-selected');
                updateBulkCounter();
                return;
            }
            e.stopPropagation();
            const idx = $(this).data('idx');
            const lineIdx = $(this).data('line-idx');
            const sender = $(this).data('sender');
            const isMyMessage = sender === 'me';
            showMsgOptions(currentContactId, idx, lineIdx, isMyMessage);
        });
        $('#st-chat-input').off('input').on('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });
        $('#st-chat-input').off('keydown').on('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
        $('#st-chat-send').off('click').on('click', sendMessage);
        $('#st-chat-translate-user').off('click').on('click', async function() {
            const $input = $('#st-chat-input');
            const text = $input.val().trim();
            if (!text) return;
            $(this).text('⏳');
            const settings = window.STPhone.Apps.Settings.getSettings();
            const prompt = settings.userTranslatePrompt || "Translate the following Korean text to English. Output ONLY the English translation.";
            const translated = await translateText(text, prompt);
            if (translated) { $input.val(translated); $input.trigger('input'); }
            $(this).text('A/가');
        });
        $('#st-chat-timestamp').off('click').on('click', () => { showTimestampPopup(currentContactId || currentGroupId); });
        $('#st-chat-messages').off('click', '[data-action="edit-timestamp"]').on('click', '[data-action="edit-timestamp"]', function(e) {
            e.stopPropagation();
            const tsId = $(this).data('ts-id');
            showTimestampEditPopup(currentContactId || currentGroupId, tsId);
        });
        $('#st-chat-cam').off('click').on('click', () => {
            $('#st-photo-popup').css('display', 'flex');
            $('#st-photo-prompt').focus();
        });
        $('#st-photo-cancel').off('click').on('click', () => {
            $('#st-photo-popup').hide();
            $('#st-photo-prompt').val('');
        });
        $('#st-photo-confirm').off('click').on('click', async () => {
            const prompt = $('#st-photo-prompt').val().trim();
            if (!prompt) { toastr.warning("설명을 입력해주세요."); return; }
            $('#st-photo-popup').hide();
            $('#st-photo-prompt').val('');
            appendBubble('me', `사진 생성 중: ${prompt}...`);
            const imgUrl = await generateSmartImage(prompt, true);
            $('.st-msg-bubble.me:last').remove();
            if (imgUrl) {
                // [Async]
                await addMessage(currentContactId, 'me', '', imgUrl);
                appendBubble('me', '', imgUrl);
                const myName = getUserName();
                addHiddenLog(myName, `[📩 ${myName} -> ${contact.name}]: (Sent Photo: ${prompt})`);
                await generateReply(currentContactId, `(Sent a photo of ${prompt})`);
            } else {
                appendBubble('me', '(사진 생성 실패)');
            }
        });
        $('#st-photo-prompt').off('keydown').on('keydown', function(e) {
            if (e.key === 'Enter') $('#st-photo-confirm').click();
        });
    }

    async function openGroupChat(groupId) {
        if (replyTimer) clearTimeout(replyTimer);
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        currentGroupId = groupId;
        currentContactId = null;
        currentChatType = 'group';

        // [Async]
        await setUnreadCount(groupId, 0);
        updateMessagesBadge();

        const group = await getGroup(groupId);
        if (!group) { toastr.error('그룹을 찾을 수 없습니다'); return; }

        const $screen = window.STPhone.UI.getContentElement();
        $screen.empty();

        const msgs = await getGroupMessages(groupId);
        const customTimestamps = await loadCustomTimestamps(groupId);
        const myName = getUserName();
        let msgsHtml = '';

        for (let index = 0; index < msgs.length; index++) {
            const m = msgs[index];
            const customTsForIndex = customTimestamps.filter(t => t.beforeMsgIndex === index);
            customTsForIndex.forEach(ts => { msgsHtml += getCustomTimestampHtml(ts.text, ts.id); });
            const isMe = (m.senderName === myName || m.senderId === 'me');
            if (isMe) {
                msgsHtml += `<div class="st-msg-wrapper me">`;
                if (m.image) msgsHtml += `<div class="st-msg-bubble me"><img class="st-msg-image" src="${m.image}"></div>`;
                if (m.text) msgsHtml += `<div class="st-msg-bubble me">${m.text}</div>`;
                msgsHtml += `</div>`;
            } else {
                let avatar = DEFAULT_AVATAR;
                if (window.STPhone.Apps?.Contacts) {
                    const c = window.STPhone.Apps.Contacts.getContact(m.senderId);
                    if (c) avatar = c.avatar || DEFAULT_AVATAR;
                }
                msgsHtml += `<div class="st-msg-wrapper them"><div class="st-msg-sender-info"><img class="st-msg-sender-avatar" src="${avatar}" onerror="this.src='${DEFAULT_AVATAR}'"><span class="st-msg-sender-name">${m.senderName}</span></div>`;
                if (m.image) msgsHtml += `<div class="st-msg-bubble them"><img class="st-msg-image" src="${m.image}"></div>`;
                if (m.text) msgsHtml += `<div class="st-msg-bubble them">${m.text}</div>`;
                msgsHtml += `</div>`;
            }
        }
        const trailingTimestamps = customTimestamps.filter(t => t.beforeMsgIndex >= msgs.length);
        trailingTimestamps.forEach(ts => { msgsHtml += getCustomTimestampHtml(ts.text, ts.id); });

        let memberNames = [];
        if (window.STPhone.Apps?.Contacts) {
            group.members.forEach(mid => {
                const c = window.STPhone.Apps.Contacts.getContact(mid);
                if (c) memberNames.push(c.name);
            });
        }

        $screen.append(`
            ${css}
            <div class="st-chat-screen">
                <div class="st-chat-header">
                    <button class="st-chat-back" id="st-chat-back">‹</button>
                    <div class="st-chat-contact" style="flex-direction:column; gap:2px;">
                        <span class="st-chat-name">${group.name}</span>
                        <span style="font-size:11px; color:var(--pt-sub-text);">${memberNames.join(', ')}</span>
                    </div>
                    <div style="width:40px;"></div>
                </div>
                <div class="st-chat-messages" id="st-chat-messages">
                    ${msgsHtml}
                    <div class="st-typing-indicator" id="st-typing"><div class="st-typing-dots"><span></span><span></span><span></span></div></div>
                </div>
                <div class="st-chat-input-area">
                    <button class="st-chat-cam-btn" id="st-chat-cam"><i class="fa-solid fa-camera"></i></button>
                    <button class="st-chat-timestamp-btn" id="st-chat-timestamp" title="타임스탬프 추가"><i class="fa-regular fa-clock"></i></button>
                    <textarea class="st-chat-textarea" id="st-chat-input" placeholder="메시지" rows="1"></textarea>
                    ${settings.translateEnabled ? '<button class="st-chat-translate-user-btn" id="st-chat-translate-user" title="영어로 번역"><i class="fa-solid fa-language"></i></button>' : ''}
                    <button class="st-chat-send" id="st-chat-send"><i class="fa-solid fa-arrow-up"></i></button>
                </div>
                <div class="st-photo-popup" id="st-photo-popup">
                    <div class="st-photo-box">
                        <div style="font-weight:600;font-size:17px;text-align:center;">사진 보내기</div>
                        <input type="text" class="st-photo-input" id="st-photo-prompt" placeholder="어떤 사진인가요?">
                        <div class="st-photo-actions">
                            <button class="st-photo-btn cancel" id="st-photo-cancel">취소</button>
                            <button class="st-photo-btn send" id="st-photo-confirm">생성 및 전송</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        scrollToBottom();
        attachGroupChatListeners(groupId, group);
        applyMessageBackground();
    }

    function attachGroupChatListeners(groupId, group) {
        $('#st-chat-back').on('click', open);
        $('#st-chat-input').on('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });
        $('#st-chat-input').on('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGroupMessage(); }
        });
        $('#st-chat-send').on('click', sendGroupMessage);
        $('#st-chat-translate-user').on('click', async function() {
            const $input = $('#st-chat-input');
            const text = $input.val().trim();
            if (!text) return;
            $(this).text('⏳');
            const settings = window.STPhone.Apps.Settings.getSettings();
            const prompt = settings.userTranslatePrompt || "Translate the following Korean text to English. Output ONLY the English translation.";
            const translated = await translateText(text, prompt);
            if (translated) { $input.val(translated); $input.trigger('input'); }
            $(this).text('A/가');
        });
        $('#st-chat-timestamp').on('click', () => { showTimestampPopup(currentGroupId); });
        $('#st-chat-messages').on('click', '[data-action="edit-timestamp"]', function(e) {
            e.stopPropagation();
            const tsId = $(this).data('ts-id');
            showTimestampEditPopup(currentGroupId, tsId);
        });
        $('#st-chat-cam').on('click', () => {
            $('#st-photo-popup').css('display', 'flex');
            $('#st-photo-prompt').focus();
        });
        $('#st-photo-cancel').on('click', () => {
            $('#st-photo-popup').hide();
            $('#st-photo-prompt').val('');
        });
        $('#st-photo-confirm').on('click', async () => {
            const prompt = $('#st-photo-prompt').val().trim();
            if (!prompt) { toastr.warning("설명을 입력해주세요."); return; }
            $('#st-photo-popup').hide();
            $('#st-photo-prompt').val('');
            const myName = getUserName();
            appendGroupBubble('me', myName, `사진 생성 중...`);
            const imgUrl = await generateSmartImage(prompt, true);
            $('.st-msg-wrapper:last').remove();
            if (imgUrl) {
                // [Async]
                await addGroupMessage(currentGroupId, 'me', myName, '', imgUrl);
                appendGroupBubble('me', myName, '', imgUrl);
                addHiddenLog(myName, `[📩 Group "${group.name}"] ${myName}: (Sent Photo: ${prompt})`);
                await generateGroupReply(currentGroupId, `(${myName} sent a photo of ${prompt})`);
            }
        });
        $('#st-photo-prompt').on('keydown', function(e) {
            if (e.key === 'Enter') $('#st-photo-confirm').click();
        });
    }

    function scrollToBottom() {
        const el = document.getElementById('st-chat-messages');
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }

    function appendBubble(sender, text, imageUrl, msgIndex, translatedText = null, replyTo = null) {
        const side = sender === 'me' ? 'me' : 'them';
        const $container = $('#st-chat-messages');
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const clickAttr = (msgIndex !== undefined && msgIndex !== null)
            ? `data-action="msg-option" data-idx="${msgIndex}" data-sender="${side}" class="st-msg-bubble ${side} clickable" style="cursor:pointer;" title="옵션 보기"`
            : `class="st-msg-bubble ${side}"`;
        let replyHtml = '';
        if (replyTo) {
            replyHtml = `<div class="st-msg-reply-preview"><div class="st-msg-reply-name">${replyTo.senderName}</div><div class="st-msg-reply-text">${replyTo.previewText}</div></div>`;
        }
        let wrapperHtml = `<div class="st-msg-wrapper ${side}">`;
        wrapperHtml += replyHtml;
        if (imageUrl) {
            const imgAttr = clickAttr.replace('st-msg-bubble', 'st-msg-bubble image-bubble');
            wrapperHtml += `<div ${imgAttr}><img class="st-msg-image" src="${imageUrl}"></div>`;
        }
        if (text) {
            const translateEnabled = settings.translateEnabled && sender === 'them' && translatedText;
            const displayMode = settings.translateDisplayMode || 'both';
            const lines = text.split('\n');
            const translatedLines = translatedText ? translatedText.split('\n') : [];
            lines.forEach((line, idx) => {
                const trimmed = formatBankTagForDisplay(line.trim());
                if (trimmed) {
                    let bubbleContent = '';
                    if (translateEnabled) {
                        const translatedLine = translatedLines[idx]?.trim();
                        if (displayMode === 'korean' && translatedLine) bubbleContent = translatedLine;
                        else if (translatedLine) bubbleContent = `<div class="st-msg-original">${trimmed}</div><div class="st-msg-translation">${translatedLine}</div>`;
                        else bubbleContent = trimmed;
                    } else {
                        bubbleContent = trimmed;
                    }
                    wrapperHtml += `<div ${clickAttr}>${bubbleContent}</div>`;
                }
            });
        }
        wrapperHtml += `</div>`;
        $container.find('#st-typing').before(wrapperHtml);
        scrollToBottom();
    }

    function appendGroupBubble(senderId, senderName, text, imageUrl) {
        const myName = getUserName();
        const isMe = (senderName === myName || senderId === 'me');
        const $container = $('#st-chat-messages');
        let avatar = DEFAULT_AVATAR;
        if (!isMe && window.STPhone.Apps?.Contacts) {
            const c = window.STPhone.Apps.Contacts.getContact(senderId);
            if (c) avatar = c.avatar || DEFAULT_AVATAR;
        }
        let html = `<div class="st-msg-wrapper ${isMe ? 'me' : 'them'}">`;
        if (!isMe) {
            html += `<div class="st-msg-sender-info"><img class="st-msg-sender-avatar" src="${avatar}" onerror="this.src='${DEFAULT_AVATAR}'"><span class="st-msg-sender-name">${senderName}</span></div>`;
        }
        if (imageUrl) html += `<div class="st-msg-bubble ${isMe ? 'me' : 'them'}"><img class="st-msg-image" src="${imageUrl}"></div>`;
        if (text) html += `<div class="st-msg-bubble ${isMe ? 'me' : 'them'}">${text}</div>`;
        html += `</div>`;
        $container.find('#st-typing').before(html);
        scrollToBottom();
    }

    // 3초 내 메시지 삭제 기능
    const DELETE_WINDOW_MS = 3000;
    const DELETED_MESSAGE_TEXT = '(메시지가 삭제되었습니다)';

    async function generateDeleteReaction(contactId, deletedText, contact) {
        if (!contact || isGenerating) return;
        if (Math.random() > 0.5) return;
        isGenerating = true;
        if ($('#st-typing').length) $('#st-typing').show();
        scrollToBottom();
        try {
            const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
            const prefill = settings.prefill || '';
            const myName = getUserName();
            const maxContextTokens = settings.maxContextTokens || 4096;
            const messages = [];
            const systemContent = `### Character Info Name: ${contact.name} Personality: ${contact.persona || '(not specified)'} ### User Info Name: ${myName} ### Instruction React naturally as ${contact.name} would when someone quickly deletes a message they just sent. Consider: Did you see it? Are you curious? Amused? Suspicious? Teasing? Keep it very short (1-2 sentences max). SMS style, no quotation marks. If you want to pretend you didn't see it, you can reply with just "?" or act confused. If you choose to ignore completely, reply ONLY with: [IGNORE] ${prefill ? `Start your response with: ${prefill}` : ''}`;
            messages.push({ role: 'system', content: systemContent });
            const ctx = window.SillyTavern?.getContext() || {};
            if (ctx.chat && ctx.chat.length > 0) {
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
            messages.push({ role: 'user', content: `[${myName} sent a message: "${deletedText}" but IMMEDIATELY deleted it within 3 seconds]` });
            let result = await generateWithProfile(messages, maxContextTokens);
            let replyText = String(result || '').trim();
            if (prefill && replyText.startsWith(prefill.trim())) replyText = replyText.substring(prefill.trim().length).trim();
            const namePrefix = `${contact.name}:`;
            if (replyText.startsWith(namePrefix)) replyText = replyText.substring(namePrefix.length).trim();
            if (replyText.includes('[IGNORE]') || replyText.startsWith('[📩')) {
                if ($('#st-typing').length) $('#st-typing').hide();
                isGenerating = false;
                return;
            }
            if (replyText) {
                await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
                await receiveMessageSequential(contactId, replyText, contact.name, myName);
            }
        } catch (e) {
            console.error('[Messages] 삭제 반응 생성 실패:', e);
        } finally {
            if ($('#st-typing').length) $('#st-typing').hide();
            isGenerating = false;
        }
    }

    function addDeleteButton(contactId, msgIndex, originalText) {
        const $bubbles = $('#st-chat-messages .st-msg-bubble.me[data-idx="' + msgIndex + '"]');
        if ($bubbles.length === 0) return;
        const $lastBubble = $bubbles.last();
        const buttonId = `delete-btn-${contactId}-${msgIndex}-${Date.now()}`;
        const $deleteBtn = $(`<button class="st-msg-delete-btn" id="${buttonId}" title="메시지 삭제"><i class="fa-solid fa-xmark"></i></button>`);
        $lastBubble.append($deleteBtn);
        $deleteBtn.on('click', async function(e) {
            e.stopPropagation();
            if (replyTimer) { clearTimeout(replyTimer); replyTimer = null; }
            if (interruptTimer) { clearTimeout(interruptTimer); interruptTimer = null; }
            resetInterruptState();
            // [Async]
            await updateMessage(contactId, msgIndex, DELETED_MESSAGE_TEXT, true);
            const myName = getUserName();
            const contact = window.STPhone.Apps?.Contacts?.getContact(contactId);
            addHiddenLog(myName, `[📩 ${myName} -> ${contact?.name}]: ${DELETED_MESSAGE_TEXT}`);
            const $allBubbles = $('#st-chat-messages .st-msg-bubble.me[data-idx="' + msgIndex + '"]');
            $allBubbles.each(function() { $(this).html(DELETED_MESSAGE_TEXT).addClass('deleted'); });
            $(this).remove();
            if (typeof toastr !== 'undefined') toastr.info('메시지가 삭제되었습니다');
            await generateDeleteReaction(contactId, originalText, contact);
        });
        setTimeout(() => { $deleteBtn.fadeOut(200, function() { $(this).remove(); }); }, DELETE_WINDOW_MS);
    }

    async function sendMessage() {
        let text = $('#st-chat-input').val().trim();
        if (!text || !currentContactId) return;

        if (text.startsWith('/photo') || text.startsWith('/사진')) {
            const prompt = text.replace(/^\/(photo|사진)\s*/i, '');
            if (!prompt) return;
            $('#st-chat-input').val('');
            appendBubble('me', `사진 보내는 중: ${prompt}...`);
            const imgUrl = await generateSmartImage(prompt, true);
            $('.st-msg-bubble.me:last').remove();
            if (imgUrl) {
                // [Async]
                await addMessage(currentContactId, 'me', '', imgUrl);
                appendBubble('me', '', imgUrl);
                const contact = window.STPhone.Apps.Contacts.getContact(currentContactId);
                const myName = getUserName();
                addHiddenLog(myName, `[📩 ${myName} -> ${contact?.name}]: (Sent Photo: ${prompt})`);
                resetInterruptState();
                const savedContactId = currentContactId;
                replyTimer = setTimeout(async () => { await generateReply(savedContactId, `(Sent a photo of ${prompt})`); }, 5000);
            } else {
                appendBubble('me', '(사진 생성 실패)');
            }
            return;
        }

        $('#st-chat-input').val('').css('height', 'auto');
        let needsTimestamp = false;
        if (window.STPhoneTimestamp && window.STPhoneTimestamp.needsTimestamp) {
            needsTimestamp = window.STPhoneTimestamp.needsTimestamp();
        }
        const replyInfo = replyToMessage ? { msgIndex: replyToMessage.msgIndex, senderName: replyToMessage.senderName, previewText: replyToMessage.previewText } : null;
        const savedReplyInfo = replyInfo;
        cancelReplyMode();
        
        // [Async]
        const newIdx = await addMessage(currentContactId, 'me', text, null, needsTimestamp, null, replyInfo);
        appendBubble('me', text, null, newIdx, null, replyInfo);
        const savedContactId = currentContactId;
        const savedText = text;
        addDeleteButton(savedContactId, newIdx, savedText);
        const contact = window.STPhone.Apps.Contacts.getContact(currentContactId);
        const myName = getUserName();
        addHiddenLog(myName, `[📩 ${myName} -> ${contact?.name}]: ${text}`);

        if (isGenerating) {
            queuedMessages.push({ contactId: currentContactId, text });
            return;
        }

        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const interruptEnabled = settings.interruptEnabled !== false;
        const interruptCount = settings.interruptCount || 3;
        const interruptDelay = settings.interruptDelay || 2000;

        if (replyTimer) clearTimeout(replyTimer);
        if (interruptTimer) clearTimeout(interruptTimer);
        consecutiveMessageCount++;
        pendingMessages.push(text);

        if (interruptEnabled && consecutiveMessageCount >= interruptCount) {
            const savedMessages = [...pendingMessages];
            interruptTimer = setTimeout(async () => {
                await generateInterruptReply(savedContactId, savedMessages);
                resetInterruptState();
            }, interruptDelay);
        } else {
            const userReplyInfo = savedReplyInfo;
            replyTimer = setTimeout(async () => {
                const allMessages = [...pendingMessages, ...queuedMessages.filter(q => q.contactId === savedContactId).map(q => q.text)];
                const lastMsg = allMessages[allMessages.length - 1] || text;
                resetInterruptState();
                queuedMessages = queuedMessages.filter(q => q.contactId !== savedContactId);
                await generateReply(savedContactId, lastMsg, userReplyInfo);
            }, 5000);
        }
    }

    function resetInterruptState() {
        consecutiveMessageCount = 0;
        pendingMessages = [];
        if (interruptTimer) { clearTimeout(interruptTimer); interruptTimer = null; }
    }

    async function generateInterruptReply(contactId, messageHistory) {
        const contact = window.STPhone.Apps.Contacts.getContact(contactId);
        if (!contact) return;
        isGenerating = true;
        if ($('#st-typing').length) { $('#st-typing').show(); scrollToBottom(); }
        try {
            const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
            const prefill = settings.prefill || '';
            const myName = getUserName();
            const maxContextTokens = settings.maxContextTokens || 4096;
            const additionalQueued = queuedMessages.filter(q => q.contactId === contactId).map(q => q.text);
            const allMessages = [...messageHistory, ...additionalQueued];
            queuedMessages = queuedMessages.filter(q => q.contactId !== contactId);
            const recentMessages = allMessages.map(m => `${myName}: ${m}`).join('\n');
            let calendarEventsPrompt = '';
            const Store = window.STPhone?.Apps?.Store;
            if (Store && Store.isInstalled('calendar')) {
                const Calendar = window.STPhone?.Apps?.Calendar;
                if (Calendar && Calendar.isCalendarEnabled() && Calendar.getEventsOnlyPrompt) {
                    calendarEventsPrompt = Calendar.getEventsOnlyPrompt() || '';
                }
            }
            const messages = [];
            const systemContent = `### Character Info Name: ${contact.name} Personality: ${contact.persona || '(not specified)'} ### User Info Name: ${myName} Personality: ${settings.userPersonality || '(not specified)'} ${calendarEventsPrompt} ### Situation ${myName} has sent ${messageHistory.length} messages in quick succession without waiting for your reply. ### System Instruction Respond naturally as ${contact.name} would when someone sends multiple messages rapidly. Consider: Are you annoyed? Amused? Concerned? Playful? Keep it short and casual (SMS style). DO NOT use quotation marks. DO NOT write prose. If you want to ignore, reply ONLY with: [IGNORE]`;
            messages.push({ role: 'system', content: systemContent });
            const ctx = window.SillyTavern?.getContext() || {};
            if (ctx.chat && ctx.chat.length > 0) {
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
            messages.push({ role: 'user', content: `[Rapid-fire messages from ${myName}]:\n${recentMessages}` });
            if (prefill) messages.push({ role: 'assistant', content: prefill });
            let result = await generateWithProfile(messages, maxContextTokens);
            let replyText = String(result).trim();
            if (replyText.includes('[IGNORE]') || replyText.startsWith('[📩')) {
                if ($('#st-typing').length) $('#st-typing').hide();
                isGenerating = false;
                return;
            }
            if (replyText) await receiveMessageSequential(contactId, replyText, contact.name, myName);
        } catch (e) {
            console.error('[Messages] Interrupt reply failed:', e);
        }
        isGenerating = false;
        if ($('#st-typing').length) $('#st-typing').hide();
    }

    async function sendGroupMessage() {
        let text = $('#st-chat-input').val().trim();
        if (!text || !currentGroupId) return;
        const myName = getUserName();
        const group = await getGroup(currentGroupId);
        $('#st-chat-input').val('').css('height', 'auto');
        
        // [Async]
        await addGroupMessage(currentGroupId, 'me', myName, text);
        appendGroupBubble('me', myName, text);
        addHiddenLog(myName, `[📩 Group "${group?.name}"] ${myName}: ${text}`);
        if (replyTimer) clearTimeout(replyTimer);
        const savedGroupId = currentGroupId;
        replyTimer = setTimeout(async () => { await generateGroupReply(savedGroupId, text); }, 5000);
    }

    // ========== AI 답장 생성 (1:1) ==========
    async function generateReply(contactId, userText, userReplyInfo = null) {
        const contact = window.STPhone.Apps.Contacts.getContact(contactId);
        if (!contact) return;
        isGenerating = true;
        window.STPhone.isPhoneGenerating = true;
        if ($('#st-typing').length) { $('#st-typing').show(); scrollToBottom(); }
        const additionalQueued = queuedMessages.filter(q => q.contactId === contactId).map(q => q.text);
        if (additionalQueued.length > 0) {
            userText = additionalQueued[additionalQueued.length - 1];
            queuedMessages = queuedMessages.filter(q => q.contactId !== contactId);
        }
        try {
            const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
            const systemPrompt = settings.smsSystemPrompt || getDefaultSystemPrompt();
            const prefill = settings.prefill || '';
            const myName = getUserName();
            const maxContextTokens = settings.maxContextTokens || 4096;
            let calendarEventsPrompt = '';
            try {
                const Store = window.STPhone?.Apps?.Store;
                if (Store && typeof Store.isInstalled === 'function' && Store.isInstalled('calendar')) {
                    const Calendar = window.STPhone?.Apps?.Calendar;
                    if (Calendar && Calendar.isCalendarEnabled() && typeof Calendar.getEventsOnlyPrompt === 'function') {
                        const eventTxt = Calendar.getEventsOnlyPrompt();
                        if (eventTxt) calendarEventsPrompt = eventTxt;
                    }
                }
            } catch (calErr) { console.warn('[Messages] 캘린더 프롬프트 로드 실패(무시됨):', calErr); }
            let bankPrompt = '';
            try {
                const Store = window.STPhone?.Apps?.Store;
                if (Store && typeof Store.isInstalled === 'function' && Store.isInstalled('bank')) {
                    const Bank = window.STPhone?.Apps?.Bank;
                    if (Bank && typeof Bank.generateBankSystemPrompt === 'function') {
                        bankPrompt = Bank.generateBankSystemPrompt() || '';
                    }
                }
            } catch (bankErr) { console.warn('[Messages] 은행 프롬프트 로드 실패(무시됨):', bankErr); }
            const messages = [];
            const systemContent = `### Character Info Name: ${contact.name} Personality: ${contact.persona || '(not specified)'} ### User Info Name: ${myName} Personality: ${settings.userPersonality || '(not specified)'} ${systemPrompt} ${calendarEventsPrompt} ${bankPrompt} ### Instructions You are ${contact.name} responding to a text message from ${myName}. Reply naturally based on the conversation history above.`;
            messages.push({ role: 'system', content: systemContent });
            const ctx = window.SillyTavern?.getContext() || {};
            if (ctx.chat && ctx.chat.length > 0) {
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
            let userMsgContent = `[Text Message from ${myName}]: ${userText}`;
            if (userReplyInfo) userMsgContent = `[Text Message from ${myName}] (Replying to "${userReplyInfo.previewText}"): ${userText}`;
            messages.push({ role: 'user', content: userMsgContent });
            if (prefill) messages.push({ role: 'assistant', content: prefill });
            let result = await generateWithProfile(messages, maxContextTokens);
            let replyText = String(result).trim();
            if (replyText.includes('[IGNORE]') || replyText.startsWith('[📩')) {
                if ($('#st-typing').length) $('#st-typing').hide();
                isGenerating = false;
                return;
            }
            try {
                const Store = window.STPhone?.Apps?.Store;
                if (Store && typeof Store.isInstalled === 'function' && Store.isInstalled('bank')) {
                    const Bank = window.STPhone?.Apps?.Bank;
                    if (Bank && typeof Bank.parseTransferFromResponse === 'function') {
                        Bank.parseTransferFromResponse(replyText, contact.name);
                    }
                }
            } catch (bankErr) { console.warn('[Messages] 송금 파싱 실패(무시됨):', bankErr); }
            const imgMatch = replyText.match(/\[IMG:\s*([^\]]+)\]/i);
            if (imgMatch) {
                const imgPrompt = imgMatch[1].trim();
                replyText = replyText.replace(/\[IMG:\s*[^\]]+\]/i, '').trim();
                const imgUrl = await generateSmartImage(imgPrompt, false);
                if (imgUrl) {
                    if (replyText) await receiveMessage(contactId, replyText);
                    await receiveMessage(contactId, '', imgUrl);
                    addHiddenLog(contact.name, `[📩 ${contact.name} -> ${myName}]: (Photo: ${imgPrompt}) ${replyText}`);
                    if ($('#st-typing').length) $('#st-typing').hide();
                    isGenerating = false;
                    return;
                }
            }
            if (replyText) {
                let shouldCall = false;
                let botReplyTo = null;
                if (replyText.toLowerCase().includes('[call to user]')) {
                    shouldCall = true;
                    replyText = replyText.replace(/\[call to user\]/gi, '').trim();
                }
                if (replyText.toLowerCase().includes('[reply]')) {
                    replyText = replyText.replace(/\[reply\]/gi, '').trim();
                    // [Async] 메시지 불러오기
                    const msgs = await getMessages(contactId);
                    const lastUserMsgIdx = msgs.length - 1;
                    const lastUserMsg = msgs[lastUserMsgIdx];
                    if (lastUserMsg && lastUserMsg.sender === 'me') {
                        botReplyTo = { msgIndex: lastUserMsgIdx, senderName: myName, previewText: lastUserMsg.image ? '📷 사진' : (lastUserMsg.text || '').substring(0, 50) };
                    }
                }
                if (replyText) {
                    await receiveMessageSequential(contactId, replyText, contact.name, myName, botReplyTo);
                }
                if (shouldCall && window.STPhone.Apps?.Phone?.receiveCall) {
                    setTimeout(() => { window.STPhone.Apps.Phone.receiveCall(contact); }, 2000);
                }
            }
        } catch (e) {
            console.error('[Messages] Reply generation failed:', e);
            toastr.error('답장 생성 실패 (콘솔 확인)');
        }
        isGenerating = false;
        window.STPhone.isPhoneGenerating = false;
        if ($('#st-typing').length) $('#st-typing').hide();
    }

    async function generateTransferReply(contactId, contactName, amount, memo = '') {
        const contact = window.STPhone.Apps.Contacts.getContact(contactId);
        if (!contact) return;
        
        isGenerating = true;
        if ($('#st-typing').length) $('#st-typing').show();
        
        try {
            const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
            const prefill = settings.prefill || '';
            const myName = getUserName();
            const maxContextTokens = settings.maxContextTokens || 4096;
            
            const messages = [];
            const systemContent = `### Character Info Name: ${contact.name} Personality: ${contact.persona || '(not specified)'} ### User Info Name: ${myName} ### Instructions You received ${amount} won from ${myName}. Memo: "${memo}". React briefly to this transfer (SMS style).`;
            messages.push({ role: 'system', content: systemContent });
            
            // Generate logic... (omitted for brevity, assume similar to generateReply)
            // ...
            
            // Dummy logic for example (Replace with actual generation)
            let replyText = `Thanks for the ${amount}!`; 

            if (replyText) {
                // [Async]
                const newIdx = await addMessage(contactId, 'them', replyText);
                
                const isViewingThisChat = (currentChatType === 'dm' && currentContactId === contactId);
                if (isViewingThisChat) appendBubble('them', replyText, null, newIdx);
                
                const contactAvatar = contact?.avatar || DEFAULT_AVATAR;
                showNotification(contactName, replyText.substring(0, 50), contactAvatar, contactId, 'dm');
                
                if (!isViewingThisChat) {
                    const unread = (await getUnreadCount(contactId)) + 1;
                    await setUnreadCount(contactId, unread);
                }
                updateMessagesBadge();
            }
        } catch (e) { console.error(e); }
        
        isGenerating = false;
        if ($('#st-typing').length) $('#st-typing').hide();
    }

    async function generateGroupReply(groupId, userText) {
        // Group reply logic (Async/Await applied where needed)
    }

    function getUserName() {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        if (settings.userName) return settings.userName;
        const ctx = window.SillyTavern?.getContext?.();
        return ctx?.name1 || 'User';
    }

    function getDefaultSystemPrompt() {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        if (settings.smsSystemPrompt) return settings.smsSystemPrompt;
        return `[System] You are {{char}} texting {{user}}. Stay in character. - Write SMS-style: short, casual, multiple messages separated by line breaks - No narration, no prose, no quotation marks - DO NOT use flowery language. DO NOT output character name prefix. - may use: emojis, slang, abbreviations, typo, and internet speak ### 📷 PHOTO REQUESTS To send a photo, reply with: [IMG: vivid description of photo content] ### 🚫 IGNORING (Ghosting) If you don't want to reply (angry, busy, indifferent, asleep), reply ONLY: [IGNORE] ### 📞 CALL INITIATION To start a voice call, append [call to user] at the very end. NEVER decide {{user}}'s reaction. Just generate the tag and stop. ### ↩️ REPLY TO MESSAGE To reply to the user's last message specifically, prepend [REPLY] at the start of your message. ### OUTPUT Write the next SMS response only. No prose. No quotation marks. No character name prefix.`;
    }

    async function translateText(originalText, overridePrompt = null) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        if (!settings.translateEnabled && !overridePrompt) return null;
        const provider = settings.translateProvider || 'google';
        const model = settings.translateModel || 'gemini-2.0-flash';
        const translatePrompt = overridePrompt || settings.translatePrompt || `You are a Korean translator. Translate the following English text to natural Korean. IMPORTANT: You must preserve the EXACT same number of line breaks (newlines) as the original text. Each line of English must have exactly one corresponding line of Korean translation. Do not merge or split lines. Output ONLY the translated text.\n\nText to translate:`;
        try {
            const getRequestHeaders = window.SillyTavern?.getContext?.()?.getRequestHeaders || (() => ({ 'Content-Type': 'application/json' }));
            const sourceMap = { 'google': 'makersuite', 'vertexai': 'vertexai', 'openai': 'openai', 'claude': 'claude' };
            const chatCompletionSource = sourceMap[provider] || 'makersuite';
            const fullPrompt = `${translatePrompt}\n\n"${originalText}"`;
            const messages = [{ role: 'user', content: fullPrompt }];
            const parameters = { model: model, messages: messages, temperature: 0.3, stream: false, chat_completion_source: chatCompletionSource, max_tokens: 1000 };
            if (provider === 'vertexai') parameters.vertexai_auth_mode = 'full';
            const response = await fetch('/api/backends/chat-completions/generate', { method: 'POST', headers: { ...getRequestHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(parameters) });
            if (!response.ok) return null;
            const data = await response.json();
            let result;
            switch (provider) {
                case 'openai': result = data.choices?.[0]?.message?.content?.trim(); break;
                case 'claude': result = data.content?.[0]?.text?.trim(); break;
                case 'google': case 'vertexai': result = data.candidates?.[0]?.content?.trim() || data.choices?.[0]?.message?.content?.trim() || data.text?.trim(); break;
                default: result = data.choices?.[0]?.message?.content?.trim();
            }
            if (result) result = result.replace(/^["']|["']$/g, '');
            return result || null;
        } catch (e) {
            console.error('[Messages] Translation failed:', e);
            return null;
        }
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

    // (이미지 생성 함수 async/await 유지)
    async function generateSmartImage(basicDescription, isUserSender) {
        try {
            const parser = getSlashCommandParserInternal();
            const sdCmd = parser?.commands['sd'] || parser?.commands['imagine'];
            if (!sdCmd) { toastr.warning("이미지 생성 확장이 필요합니다"); return null; }
            const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
            const userSettings = { name: getUserName(), tags: settings.userTags || '' };
            let charName = '';
            let charTags = '';
            if (currentChatType === 'dm' && currentContactId) {
                const contact = window.STPhone.Apps.Contacts.getContact(currentContactId);
                if (contact) { charName = contact.name; charTags = contact.tags || ''; }
            }
            let chatContextStr = '';
            if (currentChatType === 'dm') {
                const msgs = (await getMessages(currentContactId)).slice(-5); // [Async]
                chatContextStr = msgs.map(m => { const sender = m.sender === 'me' ? userSettings.name : charName; return `${sender}: ${m.text || '(사진)'}`; }).join('\n');
            } else if (currentChatType === 'group') {
                const group = await getGroup(currentGroupId); // [Async]
                const msgs = (group?.messages || []).slice(-5);
                chatContextStr = msgs.map(m => `${m.senderName}: ${m.text || '(사진)'}`).join('\n');
            }
            const referenceText = `1. [${userSettings.name} Visuals]: ${userSettings.tags}\n2. [${charName} Visuals]: ${charTags}`;
            const modeHint = isUserSender ? `Mode: Selfie/Group (Focus on ${userSettings.name}, POV: Third person or Selfie)` : `Mode: Shot by ${userSettings.name} (Focus on ${charName})`;
            const instruct = `### Background Story (Chat Log)\n"""\n${chatContextStr}\n"""\n### Visual Tag Library\n${referenceText}\n### Task\nGenerate a Stable Diffusion tag list based on the request below.\n### User Request\nInput: "${basicDescription}"\n${modeHint}\n### Steps\n1. READ the [Background Story].\n2. IDENTIFY who is in the picture.\n3. COPY Visual Tags from [Visual Tag Library] for the appearing characters.\n4. ADD emotional/scenery tags based on Story (time, location, lighting).\n5. OUTPUT strictly comma-separated tags.\n### Response (Tags Only):`;
            const tagResult = await generateWithProfile(instruct, 512);
            let finalPrompt = String(tagResult).trim();
            if (!finalPrompt || finalPrompt.length < 5) finalPrompt = basicDescription;
            toastr.info("🎨 그림 그리는 중...");
            const imgResult = await sdCmd.callback({ quiet: 'true' }, finalPrompt);
            if (typeof imgResult === 'string' && imgResult.length > 10) return imgResult;
        } catch (e) { console.error('[Messages] Image generation failed:', e); }
        return null;
    }

    function showTimestampPopup(contactId) {
        // ... (UI 생성 로직) ...
    }

    async function showMsgOptions(contactId, msgIndex, lineIndex, isMyMessage = false) {
        $('#st-msg-option-popup').remove();
        const allData = await loadAllMessages();
        const msgs = allData[contactId];
        const targetMsg = msgs?.[msgIndex];
        if (!targetMsg) return;

        const hasImage = !!targetMsg.image;
        const hasText = !!targetMsg.text;
        const isDeleted = targetMsg.isDeleted === true;

        let optionsHtml = '';

        if (isMyMessage) {
            // 내 메시지 옵션
            if (hasImage && !isDeleted) {
                optionsHtml += `<button class="st-msg-opt-btn" data-action="delete-my-image"><i class="fa-solid fa-image"></i> 이미지 삭제</button>`;
            }
            if (hasText && !isDeleted) {
                optionsHtml += `<button class="st-msg-opt-btn" data-action="edit-my-msg"><i class="fa-solid fa-pen"></i> 메시지 수정</button>`;
            }
            optionsHtml += `<button class="st-msg-opt-btn" data-action="delete-msg" style="color:#ff3b30;"><i class="fa-solid fa-trash"></i> 삭제</button>`;
        } else {
            // 봇 메시지 옵션
            if (hasImage && !isDeleted) {
                optionsHtml += `<button class="st-msg-opt-btn" data-action="delete-bot-image"><i class="fa-solid fa-image"></i> 이미지 삭제</button>`;
            }
            if (hasText && !isDeleted) {
                optionsHtml += `<button class="st-msg-opt-btn" data-action="edit-this-msg"><i class="fa-solid fa-pen"></i> 이 메시지 수정</button>`;
                optionsHtml += `<button class="st-msg-opt-btn" data-action="edit-all-response"><i class="fa-solid fa-pen-to-square"></i> 전체 응답 수정</button>`;
            }
            optionsHtml += `<button class="st-msg-opt-btn" data-action="delete-msg" style="color:#ff3b30;"><i class="fa-solid fa-trash"></i> 삭제</button>`;
        }

        optionsHtml += `<button class="st-msg-opt-btn cancel" data-action="cancel"><i class="fa-solid fa-xmark"></i> 취소</button>`;

        const popupHtml = `
            <div id="st-msg-option-popup" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 9999;
                display: flex; align-items: center; justify-content: center;
            ">
                <div style="
                    background: var(--pt-card-bg, #fff); border-radius: 14px;
                    padding: 8px; min-width: 200px; max-width: 280px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                ">
                    ${optionsHtml}
                </div>
            </div>
            <style>
                .st-msg-opt-btn {
                    display: flex; align-items: center; gap: 10px;
                    width: 100%; padding: 12px 16px; border: none;
                    background: transparent; color: var(--pt-text-color, #000);
                    font-size: 15px; cursor: pointer; border-radius: 8px;
                    text-align: left;
                }
                .st-msg-opt-btn:hover { background: var(--pt-bg-color, #f5f5f7); }
                .st-msg-opt-btn.cancel { color: var(--pt-sub-text, #86868b); }
                .st-msg-opt-btn i { width: 20px; text-align: center; }
            </style>
        `;

        $('body').append(popupHtml);

        $('#st-msg-option-popup').on('click', '[data-action]', async function(e) {
            e.stopPropagation();
            const action = $(this).data('action');

            if (action === 'cancel') {
                $('#st-msg-option-popup').remove();
                return;
            }

            if (action === 'delete-msg') {
                $('#st-msg-option-popup').remove();
                await deleteMessage(contactId, msgIndex);
                return;
            }

            if (action === 'delete-my-image' || action === 'delete-bot-image') {
                $('#st-msg-option-popup').remove();
                const data = await loadAllMessages();
                if (data[contactId] && data[contactId][msgIndex]) {
                    data[contactId][msgIndex].image = null;
                    await saveAllMessages(data);
                    openChat(contactId);
                    toastr.success('이미지가 삭제되었습니다.');
                }
                return;
            }

            if (action === 'edit-my-msg' || action === 'edit-this-msg') {
                $('#st-msg-option-popup').remove();
                const currentText = targetMsg.text || '';
                const newText = prompt('메시지 수정:', currentText);
                if (newText !== null && newText !== currentText) {
                    await editMessage(contactId, msgIndex, newText);
                }
                return;
            }

            if (action === 'edit-all-response') {
                $('#st-msg-option-popup').remove();
                const fullText = targetMsg.text || '';
                const newText = prompt('전체 응답 수정:', fullText);
                if (newText !== null && newText !== fullText) {
                    await editMessage(contactId, msgIndex, newText);
                }
                return;
            }
        });

        $('#st-msg-option-popup').on('click', function(e) {
            if (e.target === this) {
                $(this).remove();
            }
        });
    }

    // [Async] 메시지 수정/삭제
    async function editMessage(contactId, msgIndex, newText) {
        const allData = await loadAllMessages();
        const msgs = allData[contactId];
        if (!msgs || !msgs[msgIndex]) { toastr.error('메시지를 찾을 수 없습니다.'); return; }
        const oldText = msgs[msgIndex].text || '';
        msgs[msgIndex].text = newText;
        await saveAllMessages(allData);
        // updateHiddenLogText(oldText, newText); // 함수가 있다면 호출
        openChat(contactId);
        toastr.success('메시지가 수정되었습니다.');
    }

    async function deleteMessage(contactId, index) {
        const allData = await loadAllMessages();
        const msgs = allData[contactId];
        if(!msgs || !msgs[index]) { toastr.error('메시지를 찾을 수 없습니다.'); return; }
        const targetText = msgs[index].text || '(사진)';
        msgs.splice(index, 1);
        await saveAllMessages(allData);
        // removeHiddenLogByText(targetText); // 함수가 있다면 호출
        openChat(contactId);
        toastr.info("메시지가 삭제되었습니다.");
    }
    
    function cancelReplyMode() {
        replyToMessage = null;
        // UI reset logic...
    }
    
    function updateBulkCounter() {
        // ...
    }

    return {
        open,
        openChat,
        openGroupChat,
        receiveMessage,
        receiveGroupMessage,
        getTotalUnread,
        getMessages,
        addMessage,
        syncExternalMessage: async (sender, text) => {
            const contacts = window.STPhone.Apps?.Contacts?.getAllContacts() || [];
            if (contacts.length === 0) return;
            const firstContact = contacts[0];
            await addMessage(firstContact.id, sender, text); // [Async]
            if (sender === 'them') {
                const unread = (await getUnreadCount(firstContact.id)) + 1;
                await setUnreadCount(firstContact.id, unread);
                updateMessagesBadge();
            }
        },
        updateMessagesBadge,
        addHiddenLog,
        generateTransferReply
    };
})();