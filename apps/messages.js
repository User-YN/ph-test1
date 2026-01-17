window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Messages = (function() {
    'use strict';

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
            const all = (await getStorage().getItem(key)) || {};
            return all[contactId] || [];
        } catch (e) { return []; }
    }

    async function saveTimestamp(contactId, beforeMsgIndex, timestamp) {
        const key = getTimestampStorageKey();
        if (!key) return;
        try {
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
            const all = (await getStorage().getItem(key)) || {};
            return all[contactId] || [];
        } catch (e) { return []; }
    }

    async function saveCustomTimestamp(contactId, beforeMsgIndex, text) {
        const key = getCustomTimestampStorageKey();
        if (!key) return;
        try {
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
            return (await getStorage().getItem(key)) || {};
        } catch (e) { return {}; }
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
            const unread = (await getStorage().getItem(key + '_unread')) || {};
            return unread[contactId] || 0;
        } catch (e) { return 0; }
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
        try {
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

    // [New] 메시지 옵션 팝업 UI 생성 및 이벤트 연결
    async function showMsgOptions(contactId, msgIndex, lineIndex, isMyMessage = false) {
        $('#st-msg-option-popup').remove();

        const allData = await loadAllMessages();
        const msgs = allData[contactId];
        const targetMsg = msgs?.[msgIndex];

        if (!targetMsg) return;

        const hasImage = !!targetMsg.image;
        const hasText = !!(targetMsg.text && targetMsg.text.trim());
        const lines = hasText ? targetMsg.text.split('\n').filter(l => l.trim()) : [];
        const hasMultipleLines = lines.length > 1;
        const currentLineText = lines[lineIndex] || '';

        let optionsHtml = '';

        if (hasImage && !hasText) {
            optionsHtml += `
                <div id="st-opt-delete-image" style="padding: 16px 20px; cursor: pointer; color: var(--pt-text-color, #333); border-bottom:1px solid var(--pt-border, #eee); font-size:15px; display: flex; align-items: center; gap: 12px;"><i class="fa-regular fa-trash-can" style="width:16px; color:#ff3b30;"></i> 이미지 삭제</div>
            `;
        } else if (hasImage && hasText) {
            optionsHtml += `
                <div id="st-opt-delete-image" style="padding: 16px 20px; cursor: pointer; color: var(--pt-text-color, #333); border-bottom:1px solid var(--pt-border, #eee); font-size:15px; display: flex; align-items: center; gap: 12px;"><i class="fa-regular fa-trash-can" style="width:16px; color:#ff3b30;"></i> 이미지만 삭제</div>
                <div id="st-opt-edit-line" style="padding: 16px 20px; cursor: pointer; color: var(--pt-text-color, #333); border-bottom:1px solid var(--pt-border, #eee); font-size:15px; display: flex; align-items: center; gap: 12px;"><i class="fa-regular fa-pen-to-square" style="width:16px; color:var(--pt-accent, #007aff);"></i> 이 메시지 수정</div>
                <div id="st-opt-delete-line" style="padding: 16px 20px; cursor: pointer; color: var(--pt-text-color, #333); border-bottom:1px solid var(--pt-border, #eee); font-size:15px; display: flex; align-items: center; gap: 12px;"><i class="fa-regular fa-trash-can" style="width:16px; color:#ff3b30;"></i> 이 메시지 삭제</div>
            `;
        } else {
            optionsHtml += `
                <div id="st-opt-edit-line" style="padding: 16px 20px; cursor: pointer; color: var(--pt-text-color, #333); border-bottom:1px solid var(--pt-border, #eee); font-size:15px; display: flex; align-items: center; gap: 12px;"><i class="fa-regular fa-pen-to-square" style="width:16px; color:var(--pt-accent, #007aff);"></i> 이 메시지 수정</div>
                <div id="st-opt-delete-line" style="padding: 16px 20px; cursor: pointer; color: var(--pt-text-color, #333); border-bottom:1px solid var(--pt-border, #eee); font-size:15px; display: flex; align-items: center; gap: 12px;"><i class="fa-regular fa-trash-can" style="width:16px; color:#ff3b30;"></i> 이 메시지 삭제</div>
            `;
        }

        if (hasMultipleLines) {
            optionsHtml += `
                <div id="st-opt-edit-all" style="padding: 16px 20px; cursor: pointer; color: var(--pt-text-color, #333); border-bottom:1px solid var(--pt-border, #eee); font-size:15px; display: flex; align-items: center; gap: 12px;"><i class="fa-solid fa-pen-to-square" style="width:16px; color:var(--pt-accent, #007aff);"></i> 전체 응답 수정</div>
                <div id="st-opt-delete-all" style="padding: 16px 20px; cursor: pointer; color: var(--pt-text-color, #333); border-bottom:1px solid var(--pt-border, #eee); font-size:15px; display: flex; align-items: center; gap: 12px;"><i class="fa-solid fa-trash-can" style="width:16px; color:#ff3b30;"></i> 전체 응답 삭제</div>
            `;
        }

        if (!isMyMessage) {
            optionsHtml += `
                <div id="st-opt-regenerate" style="padding: 16px 20px; cursor: pointer; color: var(--pt-text-color, #333); border-bottom:1px solid var(--pt-border, #eee); font-size:15px; display: flex; align-items: center; gap: 12px;"><i class="fa-solid fa-rotate" style="width:16px; color:var(--pt-accent, #007aff);"></i> 다시 받기</div>
            `;
        }

        const isExcluded = targetMsg.excludeFromContext === true;
        optionsHtml += `
            <div id="st-opt-toggle-context" style="padding: 16px 20px; cursor: pointer; color: var(--pt-text-color, #333); border-bottom:1px solid var(--pt-border, #eee); font-size:15px; display: flex; align-items: center; gap: 12px;">
                <i class="fa-solid ${isExcluded ? 'fa-toggle-on' : 'fa-toggle-off'}" style="width:16px; color:${isExcluded ? '#ff9500' : 'var(--pt-sub-text, #86868b)'};"></i>
                콘텍스트 미반영 ${isExcluded ? '<span class="st-msg-no-context">ON</span>' : ''}
            </div>
        `;

        optionsHtml += `
            <div id="st-opt-reply" style="padding: 16px 20px; cursor: pointer; color: var(--pt-text-color, #333); border-bottom:1px solid var(--pt-border, #eee); font-size:15px; display: flex; align-items: center; gap: 12px;"><i class="fa-solid fa-reply" style="width:16px; color:var(--pt-accent, #007aff);"></i> 답장</div>
        `;

        const popupHtml = `
            <div id="st-msg-option-popup" style="
                position: absolute; top:0; left:0; width:100%; height:100%;
                background: rgba(0,0,0,1); z-index: 3000;
                display: flex; align-items: center; justify-content: center;
            ">
                <div style="
                    width: 260px; background: var(--pt-card-bg, #fff);
                    border-radius: 15px; overflow: hidden; text-align: center;
                    box-shadow: 0 5px 25px rgba(0,0,0,0.4);
                    color: var(--pt-text-color, #000);
                ">
                    <div style="padding: 15px; font-weight:600; font-size:15px; border-bottom:1px solid var(--pt-border, #eee);">메시지 옵션</div>
                    ${optionsHtml}
                    <div id="st-opt-cancel" style="padding: 15px; cursor: pointer; background: #f2f2f7; color: #000; font-weight:600;">취소</div>
                </div>
            </div>
        `;
        $('.st-chat-screen').append(popupHtml);

        $('#st-opt-cancel').on('click', () => $('#st-msg-option-popup').remove());

        // 각 버튼에 async 함수 연결
        $('#st-opt-delete-image').on('click', async () => {
            $('#st-msg-option-popup').remove();
            await deleteImage(contactId, msgIndex);
        });

        $('#st-opt-edit-all').on('click', () => {
            $('#st-msg-option-popup').remove();
            const text = targetMsg.text || '';
            const newText = prompt('메시지를 수정하세요', text);
            if (newText !== null) editMessage(contactId, msgIndex, newText);
        });

        $('#st-opt-delete-all').on('click', async () => {
            $('#st-msg-option-popup').remove();
            if(confirm('전체 메시지를 삭제하시겠습니까?')) await deleteMessage(contactId, msgIndex);
        });

        $('#st-opt-reply').on('click', () => {
            $('#st-msg-option-popup').remove();
            replyToMessage = { contactId, msgIndex, senderName: isMyMessage ? '나' : (window.STPhone.Apps.Contacts.getContact(contactId)?.name || '상대방'), previewText: (targetMsg.text || '').substring(0,30) };
            toastr.info('답장 모드 시작');
        });
        
        // 나머지 버튼 이벤트 핸들러 추가 가능...
    }

    // [New] 비동기 함수들 (DB 연동)
    async function editMessage(contactId, msgIndex, newText) {
        const allData = await loadAllMessages();
        const msgs = allData[contactId];
        if (!msgs || !msgs[msgIndex]) { toastr.error('메시지를 찾을 수 없습니다.'); return; }
        const oldText = msgs[msgIndex].text || '';
        msgs[msgIndex].text = newText;
        await saveAllMessages(allData);
        openChat(contactId);
        toastr.success('메시지가 수정되었습니다.');
    }

    async function deleteMessage(contactId, index) {
        const allData = await loadAllMessages();
        const msgs = allData[contactId];
        if(!msgs || !msgs[index]) { toastr.error('메시지를 찾을 수 없습니다.'); return; }
        msgs.splice(index, 1);
        await saveAllMessages(allData);
        openChat(contactId);
        toastr.info("메시지가 삭제되었습니다.");
    }

    async function deleteImage(contactId, msgIndex) {
        const allData = await loadAllMessages();
        const msgs = allData[contactId];
        if (!msgs || !msgs[msgIndex]) return;
        
        if (msgs[msgIndex].text && msgs[msgIndex].text.trim()) {
            delete msgs[msgIndex].image;
        } else {
            msgs.splice(msgIndex, 1);
        }
        await saveAllMessages(allData);
        openChat(contactId);
        toastr.info('이미지가 삭제되었습니다.');
    }

    function cancelReplyMode() {
        replyToMessage = null;
    }

    // [New] Race Condition 방지용 async 처리
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
            
            // ... (기존 프롬프트 생성 로직 생략, 원본 유지) ...
            let calendarEventsPrompt = ''; // (생략 가능, 위 원본 코드 참조)
            
            const messages = [];
            const systemContent = `### Character Info Name: ${contact.name} Personality: ${contact.persona || '(not specified)'} ### User Info Name: ${myName} Personality: ${settings.userPersonality || '(not specified)'} ${systemPrompt} ${calendarEventsPrompt} ### Instructions You are ${contact.name} responding to a text message from ${myName}. Reply naturally based on the conversation history above.`;
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

            const imgMatch = replyText.match(/\[IMG:\s*([^\]]+)\]/i);
            if (imgMatch) {
                const imgPrompt = imgMatch[1].trim();
                replyText = replyText.replace(/\[IMG:\s*[^\]]+\]/i, '').trim();
                const imgUrl = await generateSmartImage(imgPrompt, false);
                if (imgUrl) {
                    // [핵심 수정] await를 붙여서 순차적으로 처리 (덮어쓰기 방지)
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

    // ... (나머지 함수들은 원본 유지) ...
    // 아래 내용은 변경 없음 (기존 제공해주신 IndexedDB 버전의 함수들)
    async function translateAndUpdateBubble(contactId, msgIndex, originalText) { /* ... */ }
    async function receiveGroupMessage(groupId, senderId, senderName, text, imageUrl = null) { /* ... */ }
    async function updateMessagesBadge() { /* ... */ }
    // ... 등등

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