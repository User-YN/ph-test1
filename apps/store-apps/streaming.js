window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Streaming = (function() {
    'use strict';

    // ==========================================
    // [수정됨] 내부 DB 코드 삭제 -> 통합 저장소 사용
    // ==========================================
    
    // [Helper] 저장소 인스턴스 가져오기
    function getStorage() {
        if (window.STPhoneStorage) return window.STPhoneStorage;
        console.error('[Streaming] window.STPhoneStorage가 초기화되지 않았습니다.');
        return localforage; 
    }

    // ========== AI Generation Helper ==========
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

    async function generateWithProfile(promptOrMessages, maxTokens = 2048) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const profileId = settings.connectionProfileId;

        const messages = Array.isArray(promptOrMessages)
            ? promptOrMessages
            : [{ role: 'user', content: promptOrMessages }];

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
                        messages,
                        maxTokens,
                        {},
                        overrides
                    );
                    return normalizeModelOutput(result).trim();
                }
            }

            // Fallback
            const fallbackPrompt = Array.isArray(promptOrMessages)
                ? promptOrMessages.map(m => `${m.role}: ${m.content}`).join('\n\n')
                : promptOrMessages;

            const parser = getSlashCommandParser();
            const genCmd = parser?.commands['genraw'] || parser?.commands['gen'];
            if (!genCmd) throw new Error('AI 명령어를 찾을 수 없습니다');

            const result = await genCmd.callback({ quiet: 'true' }, fallbackPrompt);
            return String(result || '').trim();

        } catch (e) {
            const errorStr = String(e?.message || e || '');
            if (errorStr.includes('PROHIBITED_CONTENT') || errorStr.includes('SAFETY') || errorStr.includes('blocked')) {
                return '';
            }
            console.error('[Streaming] generateWithProfile failed:', e);
            throw e;
        }
    }

    const css = `<style> .st-streaming-app { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 999; display: flex; flex-direction: column; background: #0e0e10; color: #efeff1; font-family: var(--pt-font, -apple-system, sans-serif); box-sizing: border-box; } .st-streaming-header { padding: 15px 20px; flex-shrink: 0; background: linear-gradient(135deg, #9146ff 0%, #772ce8 100%); display: flex; align-items: center; justify-content: space-between; } .st-streaming-title { font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 8px; } .st-streaming-profile-btn { background: rgba(255,255,255,0.2); border: none; color: white; width: 36px; height: 36px; border-radius: 50%; font-size: 18px; cursor: pointer; } .st-streaming-content { flex: 1; overflow-y: auto; padding: 20px; } .st-streaming-home-card { background: #18181b; border-radius: 12px; padding: 24px; margin-bottom: 15px; text-align: center; } .st-streaming-home-icon { font-size: 48px; margin-bottom: 12px; } .st-streaming-home-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; } .st-streaming-home-desc { font-size: 14px; color: #adadb8; margin-bottom: 20px; } .st-streaming-start-btn { background: #9146ff; color: white; border: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.2s; } .st-streaming-start-btn:hover { background: #772ce8; } .st-streaming-setup { background: #18181b; border-radius: 12px; padding: 20px; } .st-streaming-setup-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; } .st-streaming-input { width: 100%; padding: 14px; border: 1px solid #3d3d3d; border-radius: 8px; background: #0e0e10; color: #efeff1; font-size: 15px; margin-bottom: 12px; box-sizing: border-box; outline: none; } .st-streaming-input:focus { border-color: #9146ff; } .st-streaming-textarea { width: 100%; padding: 14px; border: 1px solid #3d3d3d; border-radius: 8px; background: #0e0e10; color: #efeff1 !important; font-size: 15px; margin-bottom: 12px; box-sizing: border-box; outline: none; resize: none; min-height: 80px; } .st-streaming-textarea::placeholder { color: #adadb8; } .st-streaming-textarea:focus { border-color: #9146ff; } .st-streaming-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #3d3d3d; } .st-streaming-toggle-label { font-size: 14px; } .st-streaming-toggle-desc { font-size: 12px; color: #adadb8; margin-top: 2px; } .st-streaming-toggle { position: relative; width: 44px; height: 24px; background: #3d3d3d; border-radius: 12px; cursor: pointer; transition: background 0.3s; flex-shrink: 0; } .st-streaming-toggle.active { background: #9146ff; } .st-streaming-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: transform 0.3s; } .st-streaming-toggle.active::after { transform: translateX(20px); } .st-streaming-setup-actions { display: flex; gap: 10px; margin-top: 20px; } .st-streaming-btn { flex: 1; padding: 14px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; } .st-streaming-btn.cancel { background: #3d3d3d; color: #efeff1; } .st-streaming-btn.go-live { background: #9146ff; color: white; } .st-streaming-live { display: flex; flex-direction: column; height: 100%; } .st-streaming-live-header { padding: 12px 15px; background: #18181b; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; border-bottom: 1px solid #3d3d3d; } .st-streaming-live-info { display: flex; align-items: center; gap: 12px; } .st-streaming-live-badge { background: #eb0400; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; animation: livePulse 1.5s infinite; } @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } } .st-streaming-viewer-count { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #bf94ff; } .st-streaming-end-btn { background: #eb0400; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; } .st-streaming-display { flex: 0 0 auto; background: #000; border-radius: 8px; margin: 10px; aspect-ratio: 16 / 9; max-height: 200px; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; } .st-streaming-display-content { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 15px; box-sizing: border-box; font-size: 14px; color: #efeff1; text-align: center; line-height: 1.4; } .st-streaming-display img { width: 100%; height: 100%; object-fit: contain; } .st-streaming-display-title { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 20px 12px 10px; font-size: 13px; font-weight: 500; } .st-streaming-chat { flex: 1; display: flex; flex-direction: column; background: #18181b; margin: 0 10px 10px; border-radius: 8px; overflow: hidden; } .st-streaming-chat-header { padding: 10px 15px; border-bottom: 1px solid #3d3d3d; font-size: 14px; font-weight: 600; } .st-streaming-chat-messages { flex: 1; overflow-y: auto; padding: 10px 15px; display: flex; flex-direction: column; gap: 6px; } .st-streaming-chat-msg { font-size: 13px; line-height: 1.4; animation: chatFadeIn 0.3s ease; } @keyframes chatFadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } .st-streaming-chat-msg .username { font-weight: 600; color: #bf94ff; margin-right: 6px; } .st-streaming-chat-msg .donation { background: linear-gradient(135deg, #ff6b6b, #ffa500); color: white; padding: 8px 12px; border-radius: 8px; margin: 4px 0; } .st-streaming-chat-msg .donation-amount { font-weight: 700; display: flex; align-items: center; gap: 4px; margin-bottom: 4px; } .st-streaming-chat-msg .contact-msg { background: rgba(145, 70, 255, 0.2); border-left: 3px solid #9146ff; padding: 8px 12px; border-radius: 0 8px 8px 0; margin: 4px 0; } .st-streaming-action-area { padding: 10px 15px; background: #0e0e10; border-top: 1px solid #3d3d3d; display: flex; gap: 10px; flex-shrink: 0; margin-bottom: 80px; } .st-streaming-action-input { flex: 1; padding: 12px; border: 1px solid #3d3d3d; border-radius: 8px; background: #18181b; color: #efeff1 !important; font-size: 14px; outline: none; } .st-streaming-action-input::placeholder { color: #adadb8; } .st-streaming-action-input:focus { border-color: #9146ff; } .st-streaming-action-btn { background: #9146ff; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; } .st-streaming-end-screen { text-align: center; padding: 40px 20px; } .st-streaming-end-icon { font-size: 64px; margin-bottom: 16px; } .st-streaming-end-title { font-size: 24px; font-weight: 700; margin-bottom: 8px; } .st-streaming-end-subtitle { font-size: 14px; color: #adadb8; margin-bottom: 24px; } .st-streaming-stats { display: flex; justify-content: center; gap: 24px; margin-bottom: 24px; } .st-streaming-stat { text-align: center; } .st-streaming-stat-value { font-size: 28px; font-weight: 700; color: #9146ff; } .st-streaming-stat-label { font-size: 12px; color: #adadb8; } .st-streaming-end-btn-home { background: #9146ff; color: white; border: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; } .st-streaming-profile { padding: 20px; } .st-streaming-profile-header { display: flex; align-items: center; gap: 15px; margin-bottom: 24px; } .st-streaming-profile-avatar { width: 60px; height: 60px; border-radius: 50%; background: #9146ff; display: flex; align-items: center; justify-content: center; font-size: 28px; } .st-streaming-profile-name { font-size: 20px; font-weight: 700; } .st-streaming-profile-stats { display: flex; gap: 20px; } .st-streaming-profile-stat { text-align: center; } .st-streaming-profile-stat-value { font-size: 18px; font-weight: 700; color: #9146ff; } .st-streaming-profile-stat-label { font-size: 11px; color: #adadb8; } .st-streaming-section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; } .st-streaming-history-item { background: #18181b; border-radius: 8px; padding: 14px; margin-bottom: 10px; } .st-streaming-history-title { font-size: 14px; font-weight: 600; margin-bottom: 6px; } .st-streaming-history-meta { font-size: 12px; color: #adadb8; display: flex; gap: 15px; } .st-streaming-empty { text-align: center; padding: 40px; color: #adadb8; } .st-streaming-back-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 5px; } .st-streaming-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 20px; color: #adadb8; } .st-streaming-spinner { width: 20px; height: 20px; border: 2px solid #3d3d3d; border-top-color: #9146ff; border-radius: 50%; animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } } </style>`;

    // ========== State ==========
    let isLive = false;
    let streamData = null;
    let totalEarnings = 0;
    let viewerCount = 0;
    let followerCount = 0;
    let streamHistory = [];
    let autoImageEnabled = false;
    let isGenerating = false;
    let isReplayMode = false;
    let replayData = null;
    let replayIndex = 0;

    // ========== Storage ==========
    function getStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        return 'st_phone_streaming_' + context.chatId;
    }

    // [Async]
    async function loadData() {
        const key = getStorageKey();
        if (!key) { resetData(); return; }
        try {
            // [수정] 통합 저장소 사용
            const saved = await getStorage().getItem(key);
            if (saved) {
                streamHistory = saved.streamHistory || [];
                totalEarnings = saved.totalEarnings || 0;
                followerCount = saved.followerCount || 0;
            } else {
                resetData();
            }
        } catch (e) { resetData(); }
    }

    // [Async]
    async function saveData() {
        const key = getStorageKey();
        if (!key) return;
        try {
            // [수정] 통합 저장소 사용
            await getStorage().setItem(key, { streamHistory, totalEarnings, followerCount });
        } catch (e) { console.error('[Streaming] Save failed:', e); }
    }

    function resetData() {
        streamHistory = [];
        totalEarnings = 0;
        followerCount = 0;
    }

    // ========== Utility ==========
    function getUserName() {
        const settings = window.STPhone?.Apps?.Settings?.getSettings?.() || {};
        if (settings.userName) return settings.userName;
        const ctx = window.SillyTavern?.getContext?.();
        return ctx?.name1 || 'User';
    }

    function formatMoney(amount) {
        const Bank = window.STPhone?.Apps?.Bank;
        if (Bank && typeof Bank.formatAmount === 'function') {
            return Bank.formatAmount(amount);
        }
        return amount.toLocaleString() + '원';
    }

    function getRpDateString() {
        const Calendar = window.STPhone?.Apps?.Calendar;
        if (Calendar && typeof Calendar.getRpDate === 'function') {
            const rpDate = Calendar.getRpDate();
            if (rpDate) {
                return `${rpDate.year}년 ${rpDate.month}월 ${rpDate.day}일 ${rpDate.dayOfWeek || ''}`.trim();
            }
        }
        const now = new Date();
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;
    }

    function addHiddenLog(speaker, text) {
        if (!window.SillyTavern) return;
        const context = window.SillyTavern.getContext();
        if (!context || !context.chat) return;
        context.chat.push({
            name: speaker,
            is_user: false,
            is_system: false,
            send_date: Date.now(),
            mes: text,
            extra: { is_phone_log: true }
        });
        if (window.SlashCommandParser && window.SlashCommandParser.commands['savechat']) {
            window.SlashCommandParser.commands['savechat'].callback({});
        }
    }

    // ========== Image Generation ==========
    async function generateStreamImage(action) {
        try {
            const parser = getSlashCommandParser();
            const sdCmd = parser?.commands['sd'] || parser?.commands['imagine'];
            if (!sdCmd) {
                console.warn('[Streaming] Image generation extension not available');
                return null;
            }
            const settings = window.STPhone?.Apps?.Settings?.getSettings?.() || {};
            const userTags = settings.userTags || '';
            const myName = getUserName();
            const tagPrompt = `### Task: Generate Stable Diffusion tags for a livestream scene.\n\n### Streamer Info\nName: ${myName}\nVisual Tags: ${userTags}\n\n### Stream Info\nTitle: ${streamData?.title || 'Livestream'}\nCurrent Action: ${action}\n\n### Instructions\nGenerate comma-separated tags for this streaming scene.\nInclude: streamer appearance, action, streaming setup, mood, lighting.\nFocus on the action being performed.\nOutput ONLY tags, no explanation.\n\n### Tags:`;
            const tags = await generateWithProfile(tagPrompt, 256);
            const finalPrompt = tags || `1girl, streaming, webcam, ${action}`;
            const imgResult = await sdCmd.callback({ quiet: 'true' }, finalPrompt);
            if (typeof imgResult === 'string' && imgResult.length > 10) return imgResult;
        } catch (e) { console.error('[Streaming] Image generation failed:', e); }
        return null;
    }

    // ========== AI Response Generation ==========
    async function generateViewerResponse(action, includeContacts = true) {
        const settings = window.STPhone?.Apps?.Settings?.getSettings?.() || {};
        const myName = getUserName();
        const maxTokens = settings.maxContextTokens || 4096;
        const prefill = settings.prefill || '';
        let contactsInfo = '';
        if (includeContacts) {
            const contacts = window.STPhone?.Apps?.Contacts?.getAllContacts?.() || [];
            if (contacts.length > 0) {
                contactsInfo = contacts.map(c => `- ${c.name}: ${c.persona || '(no personality set)'} / Tags: ${c.tags || 'none'}`).join('\n');
            }
        }
        let chatHistory = '';
        const ctx = window.SillyTavern?.getContext() || {};
        if (ctx.chat && ctx.chat.length > 0) {
            const recentChat = ctx.chat.slice(-30);
            chatHistory = recentChat.map(m => {
                const name = m.is_user ? myName : (m.name || 'Assistant');
                return `${name}: ${m.mes}`;
            }).join('\n');
        }
        const messages = [];
        const systemContent = `### Registered Contacts (may appear in chat based on their personality and chat history context)\n${contactsInfo || '(No contacts registered)'}\n\n### Recent Chat History (RP context outside of streaming)\n${chatHistory || '(No recent history)'}\n\n### User Profile\nName: ${myName}\nPersonality: ${settings.userPersonality || '(not specified)'}\nAppearance: ${settings.userTags || '(not specified)'}\nCurrent Followers: ${followerCount}\n\n### FLING LIVE STREAMING SYSTEM PROMPT\n\nYou are generating viewer chat reactions for ${myName}'s Fling livestream.\n\nStream Title: "${streamData?.title || 'Untitled Stream'}"\nStreamer's Current Followers: ${followerCount}\nCurrent Viewers: ${viewerCount}\nCurrent Action: "${action}"\n\n### OUTPUT FORMAT\nFIRST LINE MUST BE viewer count in this format:\n[VIEWERS: number]\n\nThen generate 3-8 chat messages. Each line should be ONE chat message in this format:\n[username]: message\n\nFor donations, use this format:\n[username] donated X원: donation message\n\nFor BIG donations (jackpot moments), use larger amounts:\n[username] donated X원: donation message\n\n### RULES\n1. FIRST decide viewer count. Start from current viewers (${viewerCount}) and adjust based on content interest. Output [VIEWERS: X] first.\n2. All chat messages MUST be in Korean (한국어)\n3. Usernames should be creative Korean-style nicknames or English usernames\n4. Mix of reactions: excited, funny, supportive, teasing, questions\n5. DONATIONS:\n   - Regular donations: 1,000~10,000원 (occasional)\n   - Medium donations: 10,000~50,000원 (rare)\n   - BIG JACKPOT donations: 100,000~1,000,000원 (VERY RARE - only when content is EXTREMELY exciting, viewer is a super fan from contacts, or maximum dopamine moment)\n   - Consider if a contact is watching and has strong feelings for ${myName} - they might donate big!\n6. If a registered contact would realistically watch this stream (based on their personality and relationship with ${myName}), they MAY appear in chat using their actual name. Fans/lovers may donate big!\n7. Chat should feel natural and varied - not everyone reacts the same way\n8. Consider the action ${myName} is doing and react appropriately\n9. Some messages can be emotes only: ㅋㅋㅋ, ㅠㅠ, ㄷㄷ, 헐, 와, 대박 등\n10. NO English except for usernames\n11. Do NOT generate ${myName}'s responses - only viewer chat\n12. Viewer count changes naturally - interesting/provocative content = viewers increase, boring = decrease\n\n### Generate [VIEWERS: X] first, then viewer chat:`;
        messages.push({ role: 'system', content: systemContent });
        if (ctx.chat && ctx.chat.length > 0) {
            const reverseChat = ctx.chat.slice().reverse();
            const collectedMessages = [];
            let currentTokens = 0;
            for (const m of reverseChat) {
                const msgContent = m.mes || '';
                const estimatedTokens = Math.ceil(msgContent.length / 2.5);
                if (currentTokens + estimatedTokens > maxTokens) break;
                collectedMessages.unshift({ role: m.is_user ? 'user' : 'assistant', content: msgContent });
                currentTokens += estimatedTokens;
            }
            messages.push(...collectedMessages);
        }
        messages.push({ role: 'user', content: `[${myName}'s action on stream]: ${action}\n\nGenerate viewer chat reactions in Korean:` });
        if (prefill) messages.push({ role: 'assistant', content: prefill });
        try {
            const result = await generateWithProfile(messages, maxTokens);
            return result;
        } catch (e) {
            console.error('[Streaming] Failed to generate viewer response:', e);
            return '';
        }
    }

    function parseViewerChat(response) {
        const lines = response.split('\n').filter(l => l.trim());
        const chats = [];
        let newViewerCount = null;
        for (const line of lines) {
            const viewerMatch = line.match(/^\[?VIEWERS?\s*:\s*(\d+)\]?/i);
            if (viewerMatch) { newViewerCount = parseInt(viewerMatch[1]); continue; }
            const donationMatch = line.match(/^\[?([^\]]+)\]?\s*(?:donated|후원|도네이션)\s*([\d,]+)\s*원?\s*:?\s*(.*)$/i);
            if (donationMatch) {
                chats.push({ type: 'donation', username: donationMatch[1].trim(), amount: parseInt(donationMatch[2].replace(/,/g, '')), message: donationMatch[3].trim() });
                continue;
            }
            const chatMatch = line.match(/^\[?([^\]:]+)\]?\s*:\s*(.+)$/);
            if (chatMatch) {
                const username = chatMatch[1].trim();
                const message = chatMatch[2].trim();
                const contacts = window.STPhone?.Apps?.Contacts?.getAllContacts?.() || [];
                const isContact = contacts.some(c => c.name.toLowerCase() === username.toLowerCase() || username.toLowerCase().includes(c.name.toLowerCase()));
                chats.push({ type: isContact ? 'contact' : 'chat', username, message });
            }
        }
        if (newViewerCount !== null) {
            viewerCount = newViewerCount;
            if (streamData) streamData.maxViewers = Math.max(streamData.maxViewers || 0, viewerCount);
            $('#st-streaming-viewer-count').text(viewerCount.toLocaleString());
            if (chats.length > 0) chats[chats.length - 1].viewerCount = viewerCount;
        }
        return chats;
    }

    async function displayChatsSequentially(chats) {
        const $chatMessages = $('#st-streaming-chat-messages');
        if (!$chatMessages.length) return;
        let logBuffer = [];
        for (const chat of chats) {
            const delay = 300 + Math.random() * 1200;
            await new Promise(resolve => setTimeout(resolve, delay));
            if (!isLive) break;
            let html = '';
            if (chat.type === 'donation') {
                html = `<div class="st-streaming-chat-msg"><div class="donation"><div class="donation-amount">💎 ${chat.username} - ${formatMoney(chat.amount)}</div><div>${chat.message || '후원 감사합니다!'}</div></div></div>`;
                totalEarnings += chat.amount;
                streamData.earnings = (streamData.earnings || 0) + chat.amount;
                const Bank = window.STPhone?.Apps?.Bank;
                if (Bank && typeof Bank.addBalance === 'function') {
                    // [Async] Bank.addBalance is async now
                    Bank.addBalance(chat.amount, `${chat.username}님 Fling 후원`);
                }
                logBuffer.push(`[📺 FLING DONATION] ${chat.username}님이 ${chat.amount}원을 후원하며 메시지를 보냈습니다: "${chat.message || '후원 감사합니다!'}"`);
            } else if (chat.type === 'contact') {
                html = `<div class="st-streaming-chat-msg"><div class="contact-msg"><span class="username" style="color: #00ff7f;">⭐ ${chat.username}</span><span>${chat.message}</span></div></div>`;
                logBuffer.push(`[📺 FLING CONTACT CHAT] ${chat.username}: "${chat.message}"`);
            } else {
                html = `<div class="st-streaming-chat-msg"><span class="username">${chat.username}</span><span>${chat.message}</span></div>`;
                logBuffer.push(`[📺 FLING VIEWER] ${chat.username}: "${chat.message}"`);
            }
            $chatMessages.append(html);
            $chatMessages.scrollTop($chatMessages[0].scrollHeight);
        }
        if (logBuffer.length > 0) {
            addHiddenLog('System', logBuffer.join('\n'));
        }
    }

    // ========== Stream Actions ==========
    async function handleStreamAction() {
        const $input = $('#st-streaming-action-input');
        const action = $input.val().trim();
        if (!action || isGenerating) return;
        isGenerating = true;
        $input.val('');
        const $display = $('#st-streaming-display-content');
        const $actionBtn = $('#st-streaming-action-btn');
        $actionBtn.prop('disabled', true).text('생성중...');
        let imgUrl = null;
        if (autoImageEnabled) {
            $display.html('<div class="st-streaming-loading"><div class="st-streaming-spinner"></div>이미지 생성 중...</div>');
            imgUrl = await generateStreamImage(action);
            if (imgUrl && isLive) $display.html(`<img src="${imgUrl}" alt="Stream">`);
            else $display.html(`<div style="padding: 20px;">${action}</div>`);
        } else {
            $display.html(`<div style="padding: 20px; font-size: 16px;">${action}</div>`);
        }
        addHiddenLog(getUserName(), `[📺 FLING ACTION] ${getUserName()} on Fling stream: ${action}`);
        const response = await generateViewerResponse(action);
        const chats = parseViewerChat(response);
        if (streamData && streamData.actions) streamData.actions.push({ action, chats, imgUrl });
        await displayChatsSequentially(chats);
        isGenerating = false;
        $actionBtn.prop('disabled', false).text('다음 행동');
    }

    // ========== UI Screens ==========
    // [Async]
    async function open() {
        await loadData();
        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen || !$screen.length) return;
        $screen.empty();
        const html = `${css}<div class="st-streaming-app"><div class="st-streaming-header"><div class="st-streaming-title">📺 Fling</div><button class="st-streaming-profile-btn" id="st-streaming-profile-btn">👤</button></div><div class="st-streaming-content" id="st-streaming-content"></div></div>`;
        $screen.append(html);
        renderHomeScreen();
        attachListeners();
    }

    function renderHomeScreen() {
        const $content = $('#st-streaming-content');
        $content.empty();
        const html = `<div class="st-streaming-home-card"><div class="st-streaming-home-icon">📺</div><div class="st-streaming-home-title">Fling 방송 시작하기</div><div class="st-streaming-home-desc">방송을 시작하고 시청자들과 소통하세요!<br>후원을 받으면 은행에 자동으로 입금됩니다.<br><span style="color: #bf94ff;">팔로워: ${followerCount.toLocaleString()}명</span></div><button class="st-streaming-start-btn" id="st-streaming-start">🎬 방송 시작</button></div>${streamHistory.length > 0 ? `<div class="st-streaming-section-title">📊 최근 방송</div>${streamHistory.slice(0, 3).map((s, idx) => `<div class="st-streaming-history-item" style="cursor: pointer;" data-home-replay-idx="${idx}"><div class="st-streaming-history-title">${s.title}</div><div class="st-streaming-history-meta"><span>👁 ${s.maxViewers}명</span><span>💎 ${formatMoney(s.earnings)}</span><span>+${s.newFollowers || 0}팔로워</span></div><div style="font-size: 11px; color: #777; margin-top: 2px;">📅 ${s.rpDate || new Date(s.endTime).toLocaleDateString()}</div></div>`).join('')}` : ''}`;
        $content.append(html);
        $('#st-streaming-start').on('click', showSetupScreen);
        $('.st-streaming-history-item[data-home-replay-idx]').on('click', function() {
            const idx = parseInt($(this).data('home-replay-idx'));
            if (!isNaN(idx) && streamHistory[idx]) startReplay(streamHistory[idx]);
        });
    }

    function showSetupScreen() {
        const $content = $('#st-streaming-content');
        $content.empty();
        const html = `<div class="st-streaming-setup"><div class="st-streaming-setup-title">🎬 방송 설정</div><input type="text" class="st-streaming-input" id="st-streaming-title" placeholder="방송 제목을 입력하세요"><textarea class="st-streaming-textarea" id="st-streaming-first-action" placeholder="첫 번째 행동을 입력하세요 (예: 카메라를 보며 인사한다)"></textarea><div class="st-streaming-toggle-row"><div><div class="st-streaming-toggle-label">자동 이미지 생성</div><div class="st-streaming-toggle-desc">행동 입력 시 자동으로 이미지를 생성합니다</div></div><div class="st-streaming-toggle ${autoImageEnabled ? 'active' : ''}" id="st-streaming-auto-image"></div></div><div class="st-streaming-setup-actions"><button class="st-streaming-btn cancel" id="st-streaming-cancel">취소</button><button class="st-streaming-btn go-live" id="st-streaming-go-live">🔴 방송 시작</button></div></div>`;
        $content.append(html);
        $('#st-streaming-auto-image').on('click', function() { autoImageEnabled = !autoImageEnabled; $(this).toggleClass('active', autoImageEnabled); });
        $('#st-streaming-cancel').on('click', renderHomeScreen);
        $('#st-streaming-go-live').on('click', async () => {
            const title = $('#st-streaming-title').val().trim();
            const firstAction = $('#st-streaming-first-action').val().trim();
            if (!title) { toastr.warning('방송 제목을 입력하세요.'); return; }
            if (!firstAction) { toastr.warning('첫 번째 행동을 입력하세요.'); return; }
            await startStream(title, firstAction);
        });
    }

    async function startStream(title, firstAction) {
        isLive = true;
        viewerCount = 0;
        const rpDate = getRpDateString();
        streamData = { title, startTime: Date.now(), rpDate: rpDate, earnings: 0, maxViewers: 0, newFollowers: 0, actions: [{ action: firstAction, chats: [] }] };
        addHiddenLog(getUserName(), `[📺 FLING STREAM STARTED] ${getUserName()} started a Fling livestream titled "${title}" on ${rpDate}. Current Followers: ${followerCount}. First action: ${firstAction}`);
        renderLiveScreen(firstAction);
    }

    function renderLiveScreen(firstAction) {
        const $content = $('#st-streaming-content');
        $content.empty();
        const html = `<div class="st-streaming-live"><div class="st-streaming-live-header"><div class="st-streaming-live-info"><span class="st-streaming-live-badge">LIVE</span><span class="st-streaming-viewer-count">👁 <span id="st-streaming-viewer-count">${viewerCount}</span></span></div><button class="st-streaming-end-btn" id="st-streaming-end">방송 종료</button></div><div class="st-streaming-display"><div class="st-streaming-display-content" id="st-streaming-display-content">${autoImageEnabled ? '<div class="st-streaming-loading"><div class="st-streaming-spinner"></div>이미지 생성 중...</div>' : `<div style="padding: 20px; font-size: 16px;">${firstAction}</div>`}</div><div class="st-streaming-display-title">${streamData.title}</div></div><div class="st-streaming-chat"><div class="st-streaming-chat-header">💬 채팅</div><div class="st-streaming-chat-messages" id="st-streaming-chat-messages"></div></div><div class="st-streaming-action-area"><input type="text" class="st-streaming-action-input" id="st-streaming-action-input" placeholder="다음 행동을 입력하세요..."><button class="st-streaming-action-btn" id="st-streaming-action-btn">다음 행동</button></div></div>`;
        $content.append(html);
        $('#st-streaming-end').on('click', endStream);
        $('#st-streaming-action-btn').on('click', handleStreamAction);
        $('#st-streaming-action-input').on('keypress', function(e) { if (e.key === 'Enter') handleStreamAction(); });
        (async () => {
            let imgUrl = null;
            if (autoImageEnabled) {
                imgUrl = await generateStreamImage(firstAction);
                if (imgUrl && isLive) $('#st-streaming-display-content').html(`<img src="${imgUrl}" alt="Stream">`);
                else if (isLive) $('#st-streaming-display-content').html(`<div style="padding: 20px;">${firstAction}</div>`);
            }
            const response = await generateViewerResponse(firstAction);
            const chats = parseViewerChat(response);
            if (streamData && streamData.actions && streamData.actions[0]) {
                streamData.actions[0].chats = chats;
                streamData.actions[0].imgUrl = imgUrl;
            }
            await displayChatsSequentially(chats);
        })();
    }

    // [Async]
    async function endStream() {
        if (!isLive) return;
        isLive = false;
        isGenerating = false;
        const avgViewers = streamData.maxViewers > 0 ? Math.floor((streamData.maxViewers + viewerCount) / 2) : viewerCount;
        const earningsBonus = Math.floor((streamData.earnings || 0) / 10000);
        const baseNewFollowers = Math.floor(avgViewers * (0.01 + Math.random() * 0.05));
        const newFollowers = Math.max(0, baseNewFollowers + earningsBonus);
        streamData.newFollowers = newFollowers;
        followerCount += newFollowers;
        streamData.endTime = Date.now();
        streamData.maxViewers = Math.max(streamData.maxViewers || 0, viewerCount);
        streamHistory.unshift({ title: streamData.title, startTime: streamData.startTime, endTime: streamData.endTime, rpDate: streamData.rpDate, earnings: streamData.earnings || 0, maxViewers: streamData.maxViewers, newFollowers: newFollowers, actions: streamData.actions });
        if (streamHistory.length > 20) streamHistory = streamHistory.slice(0, 20);
        totalEarnings += streamData.earnings || 0;
        await saveData();
        addHiddenLog('System', `[📺 FLING STREAM ENDED] ${getUserName()}'s Fling stream "${streamData.title}" ended. Total earnings: ${formatMoney(streamData.earnings || 0)}, Max viewers: ${streamData.maxViewers}, New followers: +${newFollowers} (Total: ${followerCount})`);
        renderEndScreen();
    }

    function renderEndScreen() {
        const $content = $('#st-streaming-content');
        $content.empty();
        const duration = streamData.endTime - streamData.startTime;
        const minutes = Math.floor(duration / 60000);
        const html = `<div class="st-streaming-end-screen"><div class="st-streaming-end-icon">🎉</div><div class="st-streaming-end-title">방송 종료!</div><div class="st-streaming-end-subtitle">${streamData.title}</div><div class="st-streaming-stats"><div class="st-streaming-stat"><div class="st-streaming-stat-value">${formatMoney(streamData.earnings || 0)}</div><div class="st-streaming-stat-label">총 수익</div></div><div class="st-streaming-stat"><div class="st-streaming-stat-value">${streamData.maxViewers}</div><div class="st-streaming-stat-label">최고 시청자</div></div><div class="st-streaming-stat"><div class="st-streaming-stat-value">+${streamData.newFollowers || 0}</div><div class="st-streaming-stat-label">신규 팔로워</div></div><div class="st-streaming-stat"><div class="st-streaming-stat-value">${minutes}분</div><div class="st-streaming-stat-label">방송 시간</div></div></div><button class="st-streaming-end-btn-home" id="st-streaming-home">홈으로</button></div>`;
        $content.append(html);
        $('#st-streaming-home').on('click', () => { streamData = null; renderHomeScreen(); });
    }

    function renderProfileScreen() {
        const $content = $('#st-streaming-content');
        $content.empty();
        const myName = getUserName();
        const html = `<div class="st-streaming-profile"><div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;"><button class="st-streaming-back-btn" id="st-streaming-back">‹</button><span style="font-size: 18px; font-weight: 600;">프로필</span></div><div class="st-streaming-profile-header"><div class="st-streaming-profile-avatar">📺</div><div><div class="st-streaming-profile-name">${myName}</div><div class="st-streaming-profile-stats"><div class="st-streaming-profile-stat"><div class="st-streaming-profile-stat-value">${followerCount.toLocaleString()}</div><div class="st-streaming-profile-stat-label">팔로워</div></div><div class="st-streaming-profile-stat"><div class="st-streaming-profile-stat-value">${streamHistory.length}</div><div class="st-streaming-profile-stat-label">방송 수</div></div><div class="st-streaming-profile-stat"><div class="st-streaming-profile-stat-value">${formatMoney(totalEarnings)}</div><div class="st-streaming-profile-stat-label">총 수익</div></div></div></div></div><div class="st-streaming-section-title" style="margin-top: 24px;">📜 방송 기록</div>${streamHistory.length > 0 ? streamHistory.map((s, idx) => `<div class="st-streaming-history-item" style="cursor: pointer;" data-replay-idx="${idx}"><div class="st-streaming-history-title">${s.title}</div><div class="st-streaming-history-meta"><span>👁 ${s.maxViewers}명</span><span>💎 ${formatMoney(s.earnings)}</span><span>+${s.newFollowers || 0}팔로워</span></div><div style="font-size: 11px; color: #777; margin-top: 4px;">📅 ${s.rpDate || new Date(s.endTime).toLocaleDateString()}</div><div style="margin-top: 8px;"><button class="st-streaming-replay-btn" data-replay-idx="${idx}" style="background: #9146ff; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">📹 다시보기</button></div></div>`).join('') : '<div class="st-streaming-empty">아직 방송 기록이 없습니다</div>'}</div>`;
        $content.append(html);
        $('#st-streaming-back').on('click', renderHomeScreen);
        $('.st-streaming-replay-btn').on('click', function(e) {
            e.stopPropagation();
            const idx = parseInt($(this).data('replay-idx'));
            if (!isNaN(idx) && streamHistory[idx]) startReplay(streamHistory[idx]);
        });
    }

    function startReplay(historyItem) {
        isReplayMode = true;
        replayData = historyItem;
        replayIndex = 0;
        viewerCount = 0;
        renderReplayScreen();
    }

    function renderReplayScreen() {
        const $content = $('#st-streaming-content');
        $content.empty();
        const currentAction = replayData.actions[replayIndex];
        const actionText = typeof currentAction === 'string' ? currentAction : currentAction?.action || '';
        const html = `<div class="st-streaming-live"><div class="st-streaming-live-header"><div class="st-streaming-live-info"><span class="st-streaming-live-badge" style="background: #666;">다시보기</span><span class="st-streaming-viewer-count">👁 <span id="st-streaming-viewer-count">${viewerCount}</span></span></div><button class="st-streaming-end-btn" id="st-streaming-replay-back" style="background: #3d3d3d;">← 기록으로</button></div><div class="st-streaming-display"><div class="st-streaming-display-content" id="st-streaming-display-content">${currentAction?.imgUrl ? `<img src="${currentAction.imgUrl}" alt="Stream">` : `<div style="padding: 20px; font-size: 16px;">${actionText}</div>`}</div><div class="st-streaming-display-title">${replayData.title}</div></div><div class="st-streaming-chat"><div class="st-streaming-chat-header">💬 채팅 (${replayIndex + 1}/${replayData.actions.length})</div><div class="st-streaming-chat-messages" id="st-streaming-chat-messages"></div></div><div class="st-streaming-action-area" style="justify-content: center;"><button class="st-streaming-action-btn" id="st-streaming-replay-next" style="flex: none; padding: 12px 40px;">${replayIndex < replayData.actions.length - 1 ? '다음 행동 ▶' : '처음으로 ↺'}</button></div></div>`;
        $content.append(html);
        $('#st-streaming-replay-back').on('click', () => { isReplayMode = false; replayData = null; replayIndex = 0; renderProfileScreen(); });
        $('#st-streaming-replay-next').on('click', handleReplayNext);
        displayReplayChats();
    }

    async function displayReplayChats() {
        const currentAction = replayData.actions[replayIndex];
        const chats = currentAction?.chats || [];
        const $chatMessages = $('#st-streaming-chat-messages');
        if (!$chatMessages.length) return;
        for (const chat of chats) {
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));
            let html = '';
            if (chat.type === 'donation') html = `<div class="st-streaming-chat-msg"><div class="donation"><div class="donation-amount">💎 ${chat.username} - ${formatMoney(chat.amount)}</div><div>${chat.message || '후원 감사합니다!'}</div></div></div>`;
            else if (chat.type === 'contact') html = `<div class="st-streaming-chat-msg"><div class="contact-msg"><span class="username" style="color: #00ff7f;">⭐ ${chat.username}</span><span>${chat.message}</span></div></div>`;
            else html = `<div class="st-streaming-chat-msg"><span class="username">${chat.username}</span><span>${chat.message}</span></div>`;
            $chatMessages.append(html);
            $chatMessages.scrollTop($chatMessages[0].scrollHeight);
            if (chat.viewerCount) {
                viewerCount = chat.viewerCount;
                $('#st-streaming-viewer-count').text(viewerCount);
            }
        }
    }

    function handleReplayNext() {
        if (replayIndex < replayData.actions.length - 1) { replayIndex++; renderReplayScreen(); }
        else { replayIndex = 0; viewerCount = 0; renderReplayScreen(); }
    }

    function attachListeners() {
        $('#st-streaming-profile-btn').on('click', renderProfileScreen);
    }

    return {
        open,
        isInstalled: () => window.STPhone?.Apps?.Store?.isInstalled?.('streaming'),
        getStreamHistory: () => streamHistory,
        getTotalEarnings: () => totalEarnings,
        isLive: () => isLive
    };
})();