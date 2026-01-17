window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Settings = (function() {
    'use strict';

    // ==========================================
    // [NEW] IndexedDB Helper (공용 DB 사용)
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
                    console.error('[Settings] DB Init Error', e);
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
        },
        del: async function(key) {
            await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction(STORE_NAME, 'readwrite');
                const req = tx.objectStore(STORE_NAME).delete(key);
                req.onsuccess = () => resolve();
                req.onerror = (e) => reject(e);
            });
        }
    };

    const defaultSettings = {
        maxContextTokens: 4096,
        connectionProfileId: '',

        interruptEnabled: true,
        interruptCount: 3,
        interruptDelay: 2000,

        isDarkMode: false,
        wallpaper: 'linear-gradient(135deg, #1e1e2f, #2a2a40)',
        fontFamily: 'default',

        // [사용자 프로필]
        userName: 'User',
        userPersonality: '',
        userTags: '',
        userAvatar: '',
        profileAutoSync: true,
        profileGlobal: false,

        // [AI 동작 설정]
        chatToSms: true,
        prefill: '',

        // [번역 설정]
        translateEnabled: false,
        translateDisplayMode: 'both',
        translateProvider: 'google',
        translateModel: 'gemini-2.0-flash',
        translatePrompt: `You are a Korean translator. Translate the following English text to natural Korean. Output ONLY the Korean translation, nothing else.\n\nText to translate:`,
        userTranslatePrompt: `Translate the following Korean text to English. Output ONLY the English translation, nothing else.\n\nText to translate:`,

        persistSettings: true,
        recordMode: 'refresh',
        branchCopyRecords: false,

        // [프롬프트 설정]
        smsSystemPrompt: `[System] You are {{char}} texting {{user}}. Stay in character.\n- Write SMS-style: short, casual, multiple messages separated by line breaks\n- No narration, no prose, no quotation marks\n- DO NOT use flowery language. DO NOT output character name prefix.\n- may use: emojis, slang, abbreviations, typo, and internet speak\n\n### 📷 PHOTO REQUESTS\nTo send a photo, reply with: [IMG: vivid description of photo content]\n\n### 🚫 IGNORING (Ghosting)\nIf you don't want to reply (angry, busy, indifferent, asleep), reply ONLY: [IGNORE]\n\n### 📞 CALL INITIATION\nTo start a voice call, append [call to user] at the very end.\nNEVER decide {{user}}'s reaction. Just generate the tag and stop.\n\n### ↩️ REPLY TO MESSAGE\nTo reply to the user's last message specifically, prepend [REPLY] at the start of your message.\n\n### OUTPUT\nWrite the next SMS response only. No prose. No quotation marks. No character name prefix.`,
        groupChatPrompt: `[System] GROUP CHAT Mode.\n### Instructions\n1. User just sent a message.\n2. Decide who responds (one or multiple members).\n3. Format each response as: [REPLY character_name]: message\n4. Stay in character for each member.`,
        phonePickupPrompt: `[System Instruction: Incoming Voice Call Simulation]\nYou are "{{char}}". User "{{user}}" is calling you on the phone.\n\n### Task\nAnalyze the relationship and current situation, then output a JSON object defined below.\n\n1. **pickup**: boolean (true = Accept Call, false = Reject Call)\n2. **content**: string (The message)\n - If pickup=true: Your **FIRST SPOKEN LINE** when answering.\n - If pickup=false: The **Internal Reason** for rejection.\n\n### Format (Strict JSON)\n{"pickup": true, "content": "Hello, what's up?"}`,
        phoneCallPrompt: `### 📞 Strict Phone Call Rules (MUST FOLLOW)\n1. **Language:** Respond ONLY in **Korean**.\n2. **Format:** DO NOT use quotation marks ("") around speech. Just write the raw text.\n3. **No Prose:** DO NOT write novel-style descriptions, actions, or inner thoughts.\n4. **Audio Only:** Output ONLY what can be heard through the phone (Speech) and audible sounds.\n5. **Sound Effects:** Put distinct sounds in parentheses like (한숨), (웃음).\n6. **Termination:** To hang up the phone, append [HANGUP] at the very end of your response.\n\n### Response Format (JSON Only)\n{"text": "대사_입력"}`,
        cameraPrompt: `[System] You are an expert image prompt generator for Stable Diffusion.\nConvert the user's simple description into a detailed, high-quality image generation prompt.\n\nRules:\n 1. Identify all characters mentioned in the request from the [Visual Tag Library] and use their tags.\n 2. If multiple characters are mentioned, combine their tags naturally.\n 3. Output ONLY a single <pic prompt="..."> tag, nothing else.\n 4. The prompt inside should be in English, descriptive, and vivid.\n 5. Keep it under 250 characters.\n\nExample output format:\n <pic prompt="a fluffy orange cat, warm sunlight, soft focus">`,
        photoMessagePrompt: `### Background Story (Chat Log)\n"""\n{{chatContext}}\n"""\n\n### Visual Tag Library\n{{visualTags}}\n\n### Task\nGenerate a Stable Diffusion tag list based on the request below.\n\n### User Request\nInput: "{{description}}"\n{{modeHint}}\n\n### Steps\n1. READ the [Background Story].\n2. IDENTIFY who is in the picture.\n3. COPY Visual Tags from [Visual Tag Library] for the appearing characters.\n4. ADD emotional/scenery tags based on Story (time, location, lighting).\n5. OUTPUT strictly comma-separated tags.\n\n### Response (Tags Only):`,

        promptOrder: ['character', 'user', 'context', 'system', 'instruction'],
        promptDepth: {
            smsSystemPrompt: 0,
            groupChatPrompt: 0,
            phonePickupPrompt: 0,
            phoneCallPrompt: 0,
            cameraPrompt: 0,
            photoMessagePrompt: 0
        },

        proactiveEnabled: false,
        proactiveChance: 30,
        proactivePrompt: `Based on the current conversation context, {{char}} decides to send a text message to {{user}}'s phone instead of continuing the face-to-face conversation.\n\nReasons {{char}} might text instead:\n- Wants to say something privately\n- Sending a photo or link\n- Feeling shy about saying it out loud\n- It's more natural to text (e.g., sharing contact info, address)\n- Playful/flirty message they don't want others to hear\n- Following up on something mentioned earlier\n\nGenerate 1-3 short text messages. Keep it natural and match {{char}}'s texting style.\nNO quotation marks. Just raw text messages, one per line.`,

        airdropEnabled: false,
        airdropChance: 15,
        airdropPrompt: `Based on the current conversation context, {{char}} wants to share a photo with {{user}} via AirDrop.\n\nDescribe what kind of photo {{char}} would send. Consider:\n- Recent events in the story (a selfie from earlier, a photo they took)\n- Something meaningful to share (a memory, something funny they saw)\n- A photo that fits {{char}}'s personality\n\nOutput ONLY a brief visual description of the photo content (what's in the image).\nExample: "A selfie of {{char}} making a peace sign with coffee in hand"\nExample: "A sunset photo taken from {{char}}'s balcony"\nExample: "A blurry photo of a cute stray cat {{char}} found"\n\nKeep it under 50 words. Just the description, nothing else.`
    };

    let currentSettings = { ...defaultSettings };

    function getStorageKey() {
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : null;
        if (!context || !context.chatId) return null;
        return 'st_phone_config_' + context.chatId;
    }

    function getGlobalStorageKey() {
        return 'st_phone_global_config';
    }

    // [Async]
    async function loadGlobalSettings() {
        try {
            const saved = await DB.get(getGlobalStorageKey());
            return saved ? saved : null;
        } catch (e) { return null; }
    }

    // [Async]
    async function saveGlobalSettings() {
        try {
            await DB.set(getGlobalStorageKey(), currentSettings);
        } catch (e) { console.error('[Settings] 전역 설정 저장 실패:', e); }
    }

    // [Async]
    async function saveProfileGlobal() {
        try {
            const profileData = {
                userName: currentSettings.userName,
                userPersonality: currentSettings.userPersonality,
                userTags: currentSettings.userTags,
                userAvatar: currentSettings.userAvatar,
                profileGlobal: true
            };
            await DB.set('st_phone_global_profile', profileData);
        } catch (e) { console.error('[Settings] 프로필 전역 저장 실패:', e); }
    }

    // [Async]
    async function loadProfileGlobal() {
        try {
            const saved = await DB.get('st_phone_global_profile');
            return saved ? saved : null;
        } catch (e) { return null; }
    }

    async function syncFromSillyTavern() {
        const ctx = window.SillyTavern?.getContext?.();
        if (!ctx?.substituteParams) return;

        try {
            const userName = await ctx.substituteParams('{{user}}');
            const userPersona = await ctx.substituteParams('{{persona}}');
            let userAvatar = '';

            if (ctx.user_avatar) {
                userAvatar = `/User Avatars/${ctx.user_avatar}`;
            }

            if (userName && userName !== '{{user}}') {
                currentSettings.userName = userName;
                $('#st-set-name').val(userName);
            }
            if (userPersona && userPersona !== '{{persona}}') {
                currentSettings.userPersonality = userPersona;
                $('#st-set-personality').val(userPersona);
            }
            if (userAvatar) {
                currentSettings.userAvatar = userAvatar;
                $('#st-set-avatar-preview').attr('src', userAvatar);
            }

            await saveToStorage();
            console.log('[Settings] SillyTavern 페르소나 동기화 완료:', userName);
        } catch (e) {
            console.error('[Settings] SillyTavern 동기화 실패:', e);
        }
    }

    function updateSetting(key, value) {
        if (currentSettings.hasOwnProperty(key)) {
            currentSettings[key] = value;
            saveToStorage();
        }
    }

    // [Async]
    async function loadFromStorage() {
        const key = getStorageKey();
        const globalSettings = await loadGlobalSettings();

        if (!key) {
            if (globalSettings && globalSettings.persistSettings) {
                currentSettings = { ...defaultSettings, ...globalSettings };
            } else {
                currentSettings = { ...defaultSettings };
            }
            return;
        }

        const saved = await DB.get(key);
        if (saved) {
            currentSettings = { ...defaultSettings, ...saved };
        } else if (globalSettings && globalSettings.persistSettings) {
            currentSettings = { ...defaultSettings, ...globalSettings };
            await saveToStorage();
        } else {
            currentSettings = { ...defaultSettings };
        }

        const globalProfile = await loadProfileGlobal();
        if (globalProfile && globalProfile.profileGlobal) {
            currentSettings.userName = globalProfile.userName || currentSettings.userName;
            currentSettings.userPersonality = globalProfile.userPersonality || currentSettings.userPersonality;
            currentSettings.userTags = globalProfile.userTags || currentSettings.userTags;
            currentSettings.userAvatar = globalProfile.userAvatar || currentSettings.userAvatar;
            currentSettings.profileGlobal = true;
        }
    }

    // [Async] 데이터 마이그레이션 (IndexedDB 기반)
    async function migrateDataToCharacterBased() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId || context.characterId === undefined) {
            console.log('📱 [Settings] 마이그레이션 불가: 컨텍스트 없음');
            return;
        }

        const chatId = context.chatId;
        const charId = context.characterId;

        // 메시지
        const msgKey = 'st_phone_messages_' + chatId;
        const msgCharKey = 'st_phone_messages_char_' + charId;
        const existingMsgs = await DB.get(msgKey);
        if (existingMsgs) {
            try {
                const charData = (await DB.get(msgCharKey)) || {};
                for (const contactId in existingMsgs) {
                    if (!charData[contactId] || charData[contactId].length === 0) {
                        charData[contactId] = existingMsgs[contactId];
                    }
                }
                await DB.set(msgCharKey, charData);
                console.log('📱 [Settings] 메시지 데이터 마이그레이션 완료');
            } catch (e) { console.error('메시지 마이그레이션 실패:', e); }
        }

        // 그룹
        const groupKey = 'st_phone_groups_' + chatId;
        const groupCharKey = 'st_phone_groups_char_' + charId;
        const existingGroups = await DB.get(groupKey);
        if (existingGroups) {
            try {
                const charData = (await DB.get(groupCharKey)) || []; // 그룹은 배열
                existingGroups.forEach(g => {
                    if (!charData.find(cg => cg.id === g.id)) {
                        charData.push(g);
                    }
                });
                await DB.set(groupCharKey, charData);
                console.log('📱 [Settings] 그룹 데이터 마이그레이션 완료');
            } catch (e) { console.error('그룹 마이그레이션 실패:', e); }
        }

        // 전화
        const callKey = 'st_phone_calls_' + chatId;
        const callCharKey = 'st_phone_calls_char_' + charId;
        const existingCalls = await DB.get(callKey);
        if (existingCalls) {
            try {
                const charCalls = (await DB.get(callCharKey)) || [];
                existingCalls.forEach(call => {
                    if (!charCalls.find(c => c.timestamp === call.timestamp)) {
                        charCalls.push(call);
                    }
                });
                charCalls.sort((a, b) => b.timestamp - a.timestamp);
                await DB.set(callCharKey, charCalls);
                console.log('📱 [Settings] 전화 기록 마이그레이션 완료');
            } catch (e) { console.error('전화 마이그레이션 실패:', e); }
        }

        console.log('📱 [Settings] 누적 모드 마이그레이션 완료');
    }

    // [Async] 설정 저장 (메모리 업데이트 + DB 비동기 저장)
    async function saveToStorage() {
        const key = getStorageKey();
        if (key) {
            await DB.set(key, currentSettings);
        }

        if (currentSettings.persistSettings) {
            await saveGlobalSettings();
        }

        if (currentSettings.profileGlobal) {
            await saveProfileGlobal();
        } else {
            await DB.del('st_phone_global_profile');
        }

        // 즉시 반영
        applyTheme();
        applyWallpaper();
        applyFont();

        if(window.STPhone.Utils) {
            $(document).trigger('stPhoneSettingsChanged', [currentSettings]);
        }
    }

    // 동기식 Getter (캐시된 값 반환)
    function getSettings() {
        // init() 또는 chat changed 이벤트에서 loadFromStorage가 호출되어 currentSettings가 최신화되어 있다고 가정
        return currentSettings;
    }

    function getPromptDepth(promptKey) {
        // currentSettings는 loadFromStorage에 의해 업데이트됨
        const depths = currentSettings.promptDepth || defaultSettings.promptDepth;
        return depths[promptKey] || 0;
    }

    function compressImage(file, callback) {
        const maxSize = 1280;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxSize) { height *= maxSize / width; width = maxSize; }
                } else {
                    if (height > maxSize) { width *= maxSize / height; height = maxSize; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                callback(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async function open() {
        await loadFromStorage(); // [Async] 화면 열기 전 데이터 로드
        const $screen = window.STPhone.UI.getContentElement();
        $screen.empty();

        const html = `
            <div class="st-settings-app">
                <div class="st-settings-header">Settings</div>
                <div class="st-settings-tabs">
                    <div class="st-set-tab active" data-tab="general">일반</div>
                    <div class="st-set-tab" data-tab="profile">프로필</div>
                    <div class="st-set-tab" data-tab="ai">AI 설정</div>
                    <div class="st-set-tab" data-tab="sms">문자</div>
                    <div class="st-set-tab" data-tab="prompts">프롬프트</div>
                </div>
                <div class="st-settings-content">
                    <div id="tab-general" class="st-tab-page">
                        <div class="st-section">
                            <div class="st-row">
                                <span class="st-label">다크 모드</span>
                                <input type="checkbox" class="st-switch" id="st-set-darkmode">
                            </div>
                            <div class="st-row">
                                <span class="st-label">폰트</span>
                                <select id="st-set-font" class="st-select">
                                    <option value="default">기본</option>
                                    <option value="serif">명조</option>
                                    <option value="mono">코딩</option>
                                </select>
                            </div>
                            <div class="st-row" style="flex-direction:column; align-items:flex-start;">
                                <span class="st-label" style="margin-bottom:10px;">배경화면</span>
                                <div class="st-bg-list">
                                    <div class="st-bg-preview" data-bg="#1e1e2f" style="background:#1e1e2f"></div>
                                    <div class="st-bg-preview" data-bg="#f5f5f7" style="background:#f5f5f7"></div>
                                    <div class="st-bg-preview" data-bg="#2c3e50" style="background:#2c3e50"></div>
                                    <label class="st-bg-preview upload">
                                        <i class="fa-solid fa-plus"></i> <input type="file" id="st-bg-upload" accept="image/*">
                                    </label>
                                </div>
                            </div>
                            <div class="st-row">
                                <div>
                                    <span class="st-label"><i class="fa-solid fa-database" style="margin-right:6px;"></i>기록 누적 모드</span>
                                    <div class="st-desc">새 채팅에서도 문자/전화 기록 유지</div>
                                </div>
                                <input type="checkbox" class="st-switch" id="st-set-record-mode">
                            </div>
                            <div class="st-row">
                                <div>
                                    <span class="st-label"><i class="fa-solid fa-code-branch" style="margin-right:6px;"></i>브랜치 기록 복사</span>
                                    <div class="st-desc">브랜치 생성 시 문자/전화 기록 복사</div>
                                </div>
                                <input type="checkbox" class="st-switch" id="st-set-branch-copy">
                            </div>
                        </div>
                    </div>

                    <div id="tab-profile" class="st-tab-page" style="display:none;">
                        <div class="st-section">
                            <div class="st-checkbox-option">
                                <input type="checkbox" id="st-set-profile-autosync">
                                <div class="st-checkbox-option-content">
                                    <div class="st-checkbox-option-title">SillyTavern 연동</div>
                                    <div class="st-checkbox-option-desc">페르소나 정보를 자동으로 동기화합니다.</div>
                                </div>
                            </div>
                            <div class="st-checkbox-option">
                                <input type="checkbox" id="st-set-profile-global">
                                <div class="st-checkbox-option-content">
                                    <div class="st-checkbox-option-title">프로필 전역 저장</div>
                                    <div class="st-checkbox-option-desc">새로고침이나 다른 캐릭터에서도 유지됩니다.</div>
                                </div>
                            </div>
                            <div class="st-row" style="flex-direction: column; align-items: center; padding: 20px;">
                                <img id="st-set-avatar-preview" src="" style="width:80px; height:80px; border-radius:50%; object-fit:cover; background:#ddd; margin-bottom:10px;">
                                <label style="color:var(--pt-accent, #007aff); cursor:pointer; font-size:14px;">
                                    사진 변경 <input type="file" id="st-set-avatar-upload" accept="image/*" style="display:none;">
                                </label>
                            </div>
                            <div class="st-row">
                                <span class="st-label">내 이름</span>
                                <input type="text" class="st-input" id="st-set-name" placeholder="User">
                            </div>
                            <div class="st-row-block">
                                <span class="st-label">내 성격 (User Persona)</span>
                                <textarea class="st-textarea" id="st-set-personality" rows="3"></textarea>
                            </div>
                            <div class="st-row-block">
                                <span class="st-label">내 외모 (Visual Tags)</span>
                                <textarea class="st-textarea" id="st-set-tags" rows="2" placeholder="Example: black hair, blue eyes"></textarea>
                            </div>
                        </div>
                    </div>

                    <div id="tab-ai" class="st-tab-page" style="display:none;">
                        <div class="st-section">
                            <div class="st-row">
                                <div>
                                    <span class="st-label">채팅 연동 (Sync)</span>
                                    <div class="st-desc">채팅방 대화를 폰 문자로 가져오기</div>
                                </div>
                                <input type="checkbox" class="st-switch" id="st-set-sync">
                            </div>
                            <div class="st-row-block">
                                <span class="st-label">Prefill (시작 문구)</span>
                                <span class="st-desc">AI 대답을 이 문구로 시작하게 합니다.</span>
                                <input type="text" class="st-textarea" id="st-set-prefill" placeholder="예: (blushes) ">
                            </div>
                            <div class="st-row-block">
                                <span class="st-label">최대 컨텍스트 토큰 (Max Tokens)</span>
                                <span class="st-desc">AI에게 보낼 과거 대화량 제한 (기본: 4096)</span>
                                <input type="number" class="st-input" id="st-set-max-tokens" style="width:100%; text-align:left;" placeholder="4096">
                            </div>
                            <div class="st-row-block">
                                <span class="st-label"><i class="fa-solid fa-link" style="margin-right:6px;"></i>Connection Profile</span>
                                <span class="st-desc">폰 앱 전용 AI 연결 프로필</span>
                                <select class="st-input" id="st-set-connection-profile" style="width:100%;">
                                    <option value="">-- 기본값 (메인 API 사용) --</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div id="tab-sms" class="st-tab-page" style="display:none;">
                        <div class="st-section">
                            <div class="st-row">
                                <div>
                                    <span class="st-label"><i class="fa-solid fa-paper-plane" style="margin-right:6px;"></i>선제 메시지</span>
                                    <div class="st-desc">대화 중 봇이 문자를 보낼 만한 상황에서 자동 발송</div>
                                </div>
                                <input type="checkbox" class="st-switch" id="st-set-proactive">
                            </div>
                            <div id="st-proactive-options" style="display:none;">
                                <div class="st-row-block">
                                    <span class="st-label"><i class="fa-solid fa-dice" style="margin-right:6px;"></i>발생 확률</span>
                                    <div style="display:flex; align-items:center; gap:10px; margin-top:8px;">
                                        <input type="range" id="st-set-proactive-chance" min="1" max="100" value="30" style="flex:1;">
                                        <span id="st-proactive-chance-display" style="min-width:40px; text-align:right;">30%</span>
                                    </div>
                                </div>
                                <div class="st-row-block">
                                    <span class="st-label"><i class="fa-regular fa-comment" style="margin-right:6px;"></i>선제 메시지 프롬프트</span>
                                    <textarea class="st-textarea mono" id="st-set-proactive-prompt" rows="6"></textarea>
                                    <button id="st-reset-proactive-prompt" class="st-btn-small">기본값 복원</button>
                                </div>
                            </div>
                        </div>
                        <div class="st-section">
                            <div class="st-row">
                                <div>
                                    <span class="st-label"><i class="fa-brands fa-apple" style="margin-right:6px;"></i>에어드롭</span>
                                    <div class="st-desc">대화 중 봇이 사진을 공유할 상황에서 자동 발송</div>
                                </div>
                                <input type="checkbox" class="st-switch" id="st-set-airdrop">
                            </div>
                            <div id="st-airdrop-options" style="display:none;">
                                <div class="st-row-block">
                                    <span class="st-label"><i class="fa-solid fa-dice" style="margin-right:6px;"></i>발생 확률</span>
                                    <div style="display:flex; align-items:center; gap:10px; margin-top:8px;">
                                        <input type="range" id="st-set-airdrop-chance" min="1" max="100" value="15" style="flex:1;">
                                        <span id="st-airdrop-chance-display" style="min-width:40px; text-align:right;">15%</span>
                                    </div>
                                </div>
                                <div class="st-row-block">
                                    <span class="st-label"><i class="fa-regular fa-image" style="margin-right:6px;"></i>에어드롭 프롬프트</span>
                                    <textarea class="st-textarea mono" id="st-set-airdrop-prompt" rows="6"></textarea>
                                    <button id="st-reset-airdrop-prompt" class="st-btn-small">기본값 복원</button>
                                </div>
                            </div>
                        </div>
                        <div class="st-section">
                            <div class="st-row">
                                <div>
                                    <span class="st-label"><i class="fa-solid fa-comment-dots" style="margin-right:6px;"></i>연속 문자 인터럽트</span>
                                    <div class="st-desc">연속으로 문자 보내면 봇이 끼어듦</div>
                                </div>
                                <input type="checkbox" class="st-switch" id="st-set-interrupt">
                            </div>
                            <div id="st-interrupt-options">
                                <div class="st-row-block">
                                    <span class="st-label">인터럽트 트리거 횟수</span>
                                    <input type="number" class="st-input" id="st-set-interrupt-count" style="width:100%;" min="2" max="10" value="3">
                                </div>
                                <div class="st-row-block">
                                    <span class="st-label">인터럽트 딜레이 (ms)</span>
                                    <input type="number" class="st-input" id="st-set-interrupt-delay" style="width:100%;" min="500" max="10000" value="2000">
                                </div>
                            </div>
                            <div class="st-row-block">
                                <span class="st-label"><i class="fa-regular fa-clock" style="margin-right:6px;"></i>대화 구분 표시</span>
                                <select id="st-set-timestamp-mode" class="st-select" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--pt-border); background:var(--pt-card-bg); color:var(--pt-text-color);">
                                    <option value="none">표시 안 함</option>
                                    <option value="timestamp">타임스탬프</option>
                                    <option value="divider">구분선</option>
                                </select>
                            </div>
                            <div class="st-row">
                                <div>
                                    <span class="st-label"><i class="fa-solid fa-globe" style="margin-right:6px;"></i>번역 기능</span>
                                    <div class="st-desc">AI 답장을 한국어로 번역합니다</div>
                                </div>
                                <input type="checkbox" class="st-switch" id="st-set-translate">
                            </div>
                            <div id="st-translate-options" style="display:none;">
                                <div class="st-row-block">
                                    <span class="st-label">표시 방식</span>
                                    <select id="st-set-translate-mode" class="st-select" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--pt-border); background:var(--pt-card-bg); color:var(--pt-text-color);">
                                        <option value="korean">한국어 번역만 표시</option>
                                        <option value="both">원문 + 번역 함께 표시</option>
                                    </select>
                                </div>
                                <div class="st-row-block">
                                    <span class="st-label">번역 공급자</span>
                                    <select id="st-set-translate-provider" class="st-select" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--pt-border); background:var(--pt-card-bg); color:var(--pt-text-color);">
                                        <option value="google">Google AI (Gemini)</option>
                                        <option value="vertexai">Google Vertex AI</option>
                                        <option value="openai">OpenAI</option>
                                        <option value="claude">Claude</option>
                                    </select>
                                </div>
                                <div class="st-row-block">
                                    <span class="st-label">번역 모델</span>
                                    <select id="st-set-translate-model" class="st-select" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--pt-border); background:var(--pt-card-bg); color:var(--pt-text-color);"></select>
                                </div>
                                <div class="st-row-block">
                                    <span class="st-label">상대 메시지 번역 프롬프트 (영->한)</span>
                                    <textarea class="st-textarea mono" id="st-set-translate-prompt" rows="5"></textarea>
                                    <button id="st-reset-translate-prompt" class="st-btn-small">기본값 복원</button>
                                </div>
                                <div class="st-row-block">
                                    <span class="st-label">내 메시지 번역 프롬프트 (한->영)</span>
                                    <textarea class="st-textarea mono" id="st-set-user-translate-prompt" rows="5"></textarea>
                                    <button id="st-reset-user-translate-prompt" class="st-btn-small">기본값 복원</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="tab-prompts" class="st-tab-page" style="display:none;">
                        <div class="st-section">
                            <div class="st-row">
                                <div>
                                    <span class="st-label"><i class="fa-solid fa-floppy-disk" style="margin-right:6px;"></i>설정 유지</span>
                                    <div class="st-desc">새 채팅/캐릭터에서도 설정 유지</div>
                                </div>
                                <input type="checkbox" class="st-switch" id="st-set-persist">
                            </div>
                        </div>
                        <div class="st-section">
                            <div class="st-row-block">
                                <span class="st-label"><i class="fa-solid fa-box-archive" style="margin-right:6px;"></i>프롬프트 내보내기 / 불러오기</span>
                                <div style="display:flex; gap:10px; margin-top:12px;">
                                    <button class="st-prompt-io-btn" id="st-export-prompts"><i class="fa-solid fa-arrow-up-from-bracket"></i> 내보내기</button>
                                    <label class="st-prompt-io-btn" id="st-import-prompts-label">
                                        <i class="fa-solid fa-arrow-down-to-bracket"></i> 불러오기
                                        <input type="file" id="st-import-prompts" accept=".json" style="display:none;">
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="st-section">
                            <div class="st-row-block">
                                <div class="st-prompt-header">
                                    <span class="st-label"><i class="fa-regular fa-comment" style="margin-right:6px;"></i>문자 앱 시스템 프롬프트</span>
                                    <div class="st-depth-control">
                                        <span class="st-depth-label">깊이:</span>
                                        <input type="number" class="st-depth-input" id="st-depth-sms" min="0" max="100" value="0">
                                    </div>
                                </div>
                                <textarea class="st-textarea mono" id="st-prompt-sms" rows="8"></textarea>
                                <button class="st-btn-small" id="st-reset-sms-prompt">기본값</button>
                            </div>
                        </div>
                        <div class="st-section">
                            <div class="st-row-block">
                                <div class="st-prompt-header">
                                    <span class="st-label"><i class="fa-solid fa-users" style="margin-right:6px;"></i>그룹 채팅 프롬프트</span>
                                    <div class="st-depth-control">
                                        <span class="st-depth-label">깊이:</span>
                                        <input type="number" class="st-depth-input" id="st-depth-group" min="0" max="100" value="0">
                                    </div>
                                </div>
                                <textarea class="st-textarea mono" id="st-prompt-group" rows="6"></textarea>
                                <button class="st-btn-small" id="st-reset-group-prompt">기본값</button>
                            </div>
                        </div>
                        <div class="st-section">
                            <div class="st-row-block">
                                <div class="st-prompt-header">
                                    <span class="st-label"><i class="fa-solid fa-phone" style="margin-right:6px;"></i>전화 수신 판단 프롬프트</span>
                                    <div class="st-depth-control">
                                        <span class="st-depth-label">깊이:</span>
                                        <input type="number" class="st-depth-input" id="st-depth-phone-pickup" min="0" max="100" value="0">
                                    </div>
                                </div>
                                <textarea class="st-textarea mono" id="st-prompt-phone-pickup" rows="8"></textarea>
                                <button class="st-btn-small" id="st-reset-phone-pickup">기본값</button>
                            </div>
                        </div>
                        <div class="st-section">
                            <div class="st-row-block">
                                <div class="st-prompt-header">
                                    <span class="st-label"><i class="fa-solid fa-phone-volume" style="margin-right:6px;"></i>전화 대화 프롬프트</span>
                                    <div class="st-depth-control">
                                        <span class="st-depth-label">깊이:</span>
                                        <input type="number" class="st-depth-input" id="st-depth-phone-call" min="0" max="100" value="0">
                                    </div>
                                </div>
                                <textarea class="st-textarea mono" id="st-prompt-phone-call" rows="8"></textarea>
                                <button class="st-btn-small" id="st-reset-phone-call">기본값</button>
                            </div>
                        </div>
                        <div class="st-section">
                            <div class="st-row-block">
                                <div class="st-prompt-header">
                                    <span class="st-label"><i class="fa-solid fa-camera" style="margin-right:6px;"></i>카메라 앱 프롬프트</span>
                                    <div class="st-depth-control">
                                        <span class="st-depth-label">깊이:</span>
                                        <input type="number" class="st-depth-input" id="st-depth-camera" min="0" max="100" value="0">
                                    </div>
                                </div>
                                <textarea class="st-textarea mono" id="st-prompt-camera" rows="8"></textarea>
                                <button class="st-btn-small" id="st-reset-camera-prompt">기본값</button>
                            </div>
                        </div>
                        <div class="st-section">
                            <div class="st-row-block">
                                <div class="st-prompt-header">
                                    <span class="st-label"><i class="fa-regular fa-image" style="margin-right:6px;"></i>사진 메시지 프롬프트</span>
                                    <div class="st-depth-control">
                                        <span class="st-depth-label">깊이:</span>
                                        <input type="number" class="st-depth-input" id="st-depth-photo-msg" min="0" max="100" value="0">
                                    </div>
                                </div>
                                <textarea class="st-textarea mono" id="st-prompt-photo-msg" rows="10"></textarea>
                                <button class="st-btn-small" id="st-reset-photo-msg">기본값</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                .st-settings-tabs { display: flex; border-bottom: 1px solid var(--pt-border); background: var(--pt-card-bg); margin: -20px -20px 20px -20px; padding: 0 8px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
                .st-settings-tabs::-webkit-scrollbar { display: none; }
                .st-set-tab { padding: 14px 10px; font-weight: 600; font-size: 13px; color: var(--pt-sub-text); cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; flex-shrink: 0; }
                .st-set-tab.active { color: var(--pt-accent); border-bottom-color: var(--pt-accent); }
                .st-row-block { padding: 16px; border-bottom: 1px solid var(--pt-border); display: flex; flex-direction: column; gap: 10px; }
                .st-row-block:last-child { border-bottom: none; }
                .st-select { border: none; background: transparent; color: var(--pt-accent); font-size: 16px; outline: none; }
                .st-bg-list { display: flex; gap: 10px; flex-wrap: wrap; }
                .st-bg-preview { width: 60px; height: 100px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border: 2px solid rgba(255,255,255,0.1); cursor: pointer; transition: transform 0.2s; }
                .st-bg-preview:hover { transform: scale(1.05); }
                .st-bg-preview.upload { display: flex; align-items: center; justify-content: center; background: #ddd; font-size: 24px; color:#555; }
                .st-bg-preview.upload input { display: none; }
                .st-btn-small { margin-top: 5px; padding: 6px 12px; background: var(--pt-border); border: none; border-radius: 8px; font-size: 12px; cursor: pointer; align-self: flex-start; }
                .mono { font-family: 'SF Mono', 'Consolas', monospace !important; font-size: 12px !important; line-height: 1.5; }
                .st-checkbox-option { display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--pt-border, #e5e5e5); }
                .st-checkbox-option:last-child { border-bottom: none; }
                .st-checkbox-option input[type="checkbox"], .st-settings-app .st-switch { position: relative !important; width: 44px !important; height: 24px !important; margin: 0; margin-top: 2px; -webkit-appearance: none !important; appearance: none !important; background-color: #78788080 !important; border-radius: 12px !important; cursor: pointer !important; border: none !important; outline: none !important; transition: background-color 0.3s !important; flex-shrink: 0; }
                .st-checkbox-option input[type="checkbox"]:checked, .st-settings-app .st-switch:checked { background-color: #34c759 !important; }
                .st-checkbox-option input[type="checkbox"]::after, .st-settings-app .st-switch::after { content: "" !important; position: absolute !important; top: 2px !important; left: 2px !important; width: 20px !important; height: 20px !important; background: #fff !important; border-radius: 50% !important; box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important; transition: transform 0.3s !important; }
                .st-checkbox-option input[type="checkbox"]:checked::after, .st-settings-app .st-switch:checked::after { transform: translateX(20px) !important; }
                .st-checkbox-option-content { flex: 1; }
                .st-checkbox-option-title { font-size: 14px; font-weight: 500; color: var(--pt-text-color, #1d1d1f); margin-bottom: 4px; }
                .st-checkbox-option-desc { font-size: 13px; color: var(--pt-sub-text, #86868b); line-height: 1.4; }
                .st-prompt-header { display: flex; justify-content: space-between; align-items: center; width: 100%; }
                .st-depth-control { display: flex; align-items: center; gap: 5px; background: var(--pt-bg-color, #f0f0f0); padding: 4px 10px; border-radius: 8px; }
                .st-depth-label { font-size: 12px; color: var(--pt-sub-text, #666); }
                .st-depth-input { width: 50px; padding: 4px 8px; border: 1px solid var(--pt-border, #ddd); border-radius: 6px; font-size: 13px; text-align: center; background: var(--pt-card-bg, #fff); color: var(--pt-text-color, #000); }
                .st-depth-input:focus { outline: none; border-color: var(--pt-accent, #007aff); }
                .st-prompt-io-btn { flex: 1; padding: 14px 16px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; text-align: center; transition: background 0.2s, transform 0.1s; }
                #st-export-prompts { background: var(--pt-accent, #007aff); color: white; }
                #st-export-prompts:hover { opacity: 0.9; }
                #st-export-prompts:active { transform: scale(0.98); }
                #st-import-prompts-label { background: var(--pt-card-bg, #e5e5ea); color: var(--pt-text-color, #333); display: flex; align-items: center; justify-content: center; gap: 6px; }
                #st-import-prompts-label:hover { opacity: 0.9; }
                #st-import-prompts-label:active { transform: scale(0.98); }
            </style>
        `;

        $screen.append(html);
        loadValuesToUI();
        attachListeners();

        applyTheme();
        applyWallpaper();
        applyFont();
    }

    function loadValuesToUI() {
        $('#st-set-darkmode').prop('checked', currentSettings.isDarkMode);
        $('#st-set-font').val(currentSettings.fontFamily);
        $('#st-set-record-mode').prop('checked', currentSettings.recordMode === 'accumulate');
        $('#st-set-branch-copy').prop('checked', currentSettings.branchCopyRecords);
        $('#st-set-name').val(currentSettings.userName);
        $('#st-set-personality').val(currentSettings.userPersonality);
        $('#st-set-tags').val(currentSettings.userTags);
        $('#st-set-profile-autosync').prop('checked', currentSettings.profileAutoSync !== false);
        $('#st-set-profile-global').prop('checked', currentSettings.profileGlobal);
        const DEFAULT_AVATAR = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
        $('#st-set-avatar-preview').attr('src', currentSettings.userAvatar || DEFAULT_AVATAR);
        $('#st-set-sync').prop('checked', currentSettings.chatToSms);
        $('#st-set-prefill').val(currentSettings.prefill);
        $('#st-set-timestamp-mode').val(currentSettings.timestampMode || 'none');
        $('#st-set-max-tokens').val(currentSettings.maxContextTokens || 4096);

        loadConnectionProfiles();

        $('#st-set-interrupt').prop('checked', currentSettings.interruptEnabled !== false);
        $('#st-set-interrupt-count').val(currentSettings.interruptCount || 3);
        $('#st-set-interrupt-delay').val(currentSettings.interruptDelay || 2000);
        if (currentSettings.interruptEnabled === false) $('#st-interrupt-options').hide();

        $('#st-set-sms-persona').val(currentSettings.smsPersona);
        $('#st-set-proactive').prop('checked', currentSettings.proactiveEnabled);
        $('#st-set-proactive-chance').val(currentSettings.proactiveChance || 30);
        $('#st-proactive-chance-display').text((currentSettings.proactiveChance || 30) + '%');
        $('#st-set-proactive-prompt').val(currentSettings.proactivePrompt || defaultSettings.proactivePrompt);
        if (currentSettings.proactiveEnabled) $('#st-proactive-options').show();

        $('#st-set-airdrop').prop('checked', currentSettings.airdropEnabled);
        $('#st-set-airdrop-chance').val(currentSettings.airdropChance || 15);
        $('#st-airdrop-chance-display').text((currentSettings.airdropChance || 15) + '%');
        $('#st-set-airdrop-prompt').val(currentSettings.airdropPrompt || defaultSettings.airdropPrompt);
        if (currentSettings.airdropEnabled) $('#st-airdrop-options').show();

        $('#st-set-translate').prop('checked', currentSettings.translateEnabled);
        $('#st-set-translate-mode').val(currentSettings.translateDisplayMode || 'both');
        $('#st-set-translate-provider').val(currentSettings.translateProvider || 'google');
        $('#st-set-translate-prompt').val(currentSettings.translatePrompt);
        $('#st-set-user-translate-prompt').val(currentSettings.userTranslatePrompt);
        if (currentSettings.translateEnabled) $('#st-translate-options').show();

        updateTranslateModelList();
        $('#st-set-translate-model').val(currentSettings.translateModel || 'gemini-2.0-flash');

        $('#st-set-persist').prop('checked', currentSettings.persistSettings !== false);

        const depths = currentSettings.promptDepth || defaultSettings.promptDepth;
        $('#st-depth-sms').val(depths.smsSystemPrompt || 0);
        $('#st-depth-group').val(depths.groupChatPrompt || 0);
        $('#st-depth-phone-pickup').val(depths.phonePickupPrompt || 0);
        $('#st-depth-phone-call').val(depths.phoneCallPrompt || 0);
        $('#st-depth-camera').val(depths.cameraPrompt || 0);
        $('#st-depth-photo-msg').val(depths.photoMessagePrompt || 0);

        $('#st-prompt-sms').val(currentSettings.smsSystemPrompt || defaultSettings.smsSystemPrompt);
        $('#st-prompt-group').val(currentSettings.groupChatPrompt || defaultSettings.groupChatPrompt);
        $('#st-prompt-phone-pickup').val(currentSettings.phonePickupPrompt || defaultSettings.phonePickupPrompt);
        $('#st-prompt-phone-call').val(currentSettings.phoneCallPrompt || defaultSettings.phoneCallPrompt);
        $('#st-prompt-camera').val(currentSettings.cameraPrompt || defaultSettings.cameraPrompt);
        $('#st-prompt-photo-msg').val(currentSettings.photoMessagePrompt || defaultSettings.photoMessagePrompt);
    }

    function updateTranslateModelList() {
        const provider = $('#st-set-translate-provider').val();
        const $modelSelect = $('#st-set-translate-model');
        $modelSelect.empty();
        const models = {
            'google': ['gemini-3-flash-preview', 'gemini-2.5-pro-preview-05-06', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
            'vertexai': ['gemini-2.5-flash', 'gemini-2.5-pro-preview-05-06', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
            'openai': ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
            'claude': ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-haiku-20240307']
        };
        const providerModels = models[provider] || [];
        providerModels.forEach(model => { $modelSelect.append(`<option value="${model}">${model}</option>`); });
    }

    function loadConnectionProfiles() {
        const $select = $('#st-set-connection-profile');
        $select.empty();
        $select.append('<option value="">-- 기본값 (메인 API 사용) --</option>');
        try {
            const context = window.SillyTavern?.getContext?.();
            if (!context) return;
            const connectionManager = context.ConnectionManagerRequestService;
            if (!connectionManager) return;
            let profiles = [];
            if (typeof connectionManager.getConnectionProfiles === 'function') profiles = connectionManager.getConnectionProfiles() || [];
            else if (context.extensionSettings?.connectionManager?.profiles) profiles = context.extensionSettings.connectionManager.profiles || [];
            profiles.forEach(profile => {
                const id = profile.id || profile.name;
                const name = profile.name || profile.id;
                $select.append(`<option value="${id}">${name}</option>`);
            });
            if (currentSettings.connectionProfileId) $select.val(currentSettings.connectionProfileId);
        } catch (e) { console.error('[Settings] Connection Profiles 로드 실패:', e); }
    }

    function attachListeners() {
        $('.st-set-tab').on('click', function() {
            $('.st-set-tab').removeClass('active');
            $(this).addClass('active');
            $('.st-tab-page').hide();
            $(`#tab-${$(this).data('tab')}`).show();
        });
        $('#st-set-darkmode').on('change', function() { currentSettings.isDarkMode = $(this).is(':checked'); saveToStorage(); });
        $('#st-set-font').on('change', function() { currentSettings.fontFamily = $(this).val(); saveToStorage(); });
        $('#st-set-record-mode').on('change', async function() {
            const newMode = $(this).is(':checked') ? 'accumulate' : 'refresh';
            const oldMode = currentSettings.recordMode;
            currentSettings.recordMode = newMode;
            await saveToStorage();
            if (newMode === 'accumulate' && oldMode !== 'accumulate') {
                await migrateDataToCharacterBased();
                toastr.success('📚 기록 누적 모드: 새 채팅에서도 문자/전화 기록이 유지됩니다');
            } else if (newMode === 'refresh') {
                toastr.info('🔄 기록 갱신 모드: 새 채팅 시 문자/전화 기록이 초기화됩니다');
            }
        });
        $('#st-set-branch-copy').on('change', function() { currentSettings.branchCopyRecords = $(this).is(':checked'); saveToStorage(); });
        $('#st-set-name').on('input', function() { currentSettings.userName = $(this).val(); saveToStorage(); });
        $('#st-set-personality').on('input', function() { currentSettings.userPersonality = $(this).val(); saveToStorage(); });
        $('#st-set-tags').on('input', function() { currentSettings.userTags = $(this).val(); saveToStorage(); });
        $('#st-set-profile-autosync').on('change', function() {
            currentSettings.profileAutoSync = $(this).is(':checked');
            saveToStorage();
            if (currentSettings.profileAutoSync) { syncFromSillyTavern(); toastr.success('🔄 SillyTavern 페르소나와 동기화됩니다'); }
            else toastr.info('🔄 자동 동기화가 해제되었습니다');
        });
        $('#st-set-avatar-upload').on('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            compressImage(file, base64 => {
                currentSettings.userAvatar = base64;
                $('#st-set-avatar-preview').attr('src', base64);
                saveToStorage();
                toastr.success('프로필 사진이 변경되었습니다');
            });
        });
        $('#st-set-profile-global').on('change', async function() {
            currentSettings.profileGlobal = $(this).is(':checked');
            if (currentSettings.profileGlobal) { await saveToStorage(); await saveProfileGlobal(); toastr.success('🔒 프로필이 전역 저장됩니다'); }
            else { await DB.del('st_phone_global_profile'); await saveToStorage(); toastr.info('🔓 프로필 전역 저장이 해제되었습니다'); }
        });
        $('#st-set-sync').on('change', function() { currentSettings.chatToSms = $(this).is(':checked'); saveToStorage(); });
        $('#st-set-prefill').on('input', function() { currentSettings.prefill = $(this).val(); saveToStorage(); });
        $('#st-set-timestamp-mode').on('change', function() { currentSettings.timestampMode = $(this).val(); saveToStorage(); });
        $('#st-set-max-tokens').on('input', function() { currentSettings.maxContextTokens = parseInt($(this).val()) || 4096; saveToStorage(); });
        $('#st-set-connection-profile').on('change', function() {
            currentSettings.connectionProfileId = $(this).val();
            saveToStorage();
            if (currentSettings.connectionProfileId) toastr.success(`🔗 Connection Profile 설정됨: ${$(this).find('option:selected').text()}`);
            else toastr.info('🔗 기본 API로 전환됨');
        });
        $('#st-set-interrupt').on('change', function() {
            currentSettings.interruptEnabled = $(this).is(':checked');
            if (currentSettings.interruptEnabled) $('#st-interrupt-options').show(); else $('#st-interrupt-options').hide();
            saveToStorage();
        });
        $('#st-set-interrupt-count').on('input', function() { currentSettings.interruptCount = parseInt($(this).val()) || 3; saveToStorage(); });
        $('#st-set-interrupt-delay').on('input', function() { currentSettings.interruptDelay = parseInt($(this).val()) || 2000; saveToStorage(); });
        $('#st-set-sms-persona').on('input', function() { currentSettings.smsPersona = $(this).val(); saveToStorage(); });
        $('.st-bg-preview[data-bg]').on('click', function() { currentSettings.wallpaper = $(this).data('bg'); saveToStorage(); });
        $('#st-bg-upload').on('change', function(e) {
            const file = e.target.files[0];
            if (file) compressImage(file, base64 => { currentSettings.wallpaper = `url(${base64})`; saveToStorage(); });
        });
        $('#st-set-proactive').on('change', function() {
            currentSettings.proactiveEnabled = $(this).is(':checked');
            if (currentSettings.proactiveEnabled) $('#st-proactive-options').show(); else $('#st-proactive-options').hide();
            saveToStorage();
            $(document).trigger('stPhoneProactiveChanged', [currentSettings.proactiveEnabled]);
        });
        $('#st-set-proactive-chance').on('input', function() {
            currentSettings.proactiveChance = parseInt($(this).val()) || 30;
            $('#st-proactive-chance-display').text(currentSettings.proactiveChance + '%');
            saveToStorage();
        });
        $('#st-set-proactive-prompt').on('input', function() { currentSettings.proactivePrompt = $(this).val(); saveToStorage(); });
        $('#st-reset-proactive-prompt').on('click', () => { if(confirm('선제 메시지 프롬프트를 기본값으로 되돌릴까요?')) { currentSettings.proactivePrompt = defaultSettings.proactivePrompt; $('#st-set-proactive-prompt').val(currentSettings.proactivePrompt); saveToStorage(); } });
        $('#st-set-airdrop').on('change', function() {
            currentSettings.airdropEnabled = $(this).is(':checked');
            if (currentSettings.airdropEnabled) $('#st-airdrop-options').show(); else $('#st-airdrop-options').hide();
            saveToStorage();
            $(document).trigger('stPhoneAirdropChanged', [currentSettings.airdropEnabled]);
        });
        $('#st-set-airdrop-chance').on('input', function() {
            currentSettings.airdropChance = parseInt($(this).val()) || 15;
            $('#st-airdrop-chance-display').text(currentSettings.airdropChance + '%');
            saveToStorage();
        });
        $('#st-set-airdrop-prompt').on('input', function() { currentSettings.airdropPrompt = $(this).val(); saveToStorage(); });
        $('#st-reset-airdrop-prompt').on('click', () => { if(confirm('에어드롭 프롬프트를 기본값으로 되돌릴까요?')) { currentSettings.airdropPrompt = defaultSettings.airdropPrompt; $('#st-set-airdrop-prompt').val(currentSettings.airdropPrompt); saveToStorage(); } });
        $('#st-set-translate').on('change', function() {
            currentSettings.translateEnabled = $(this).is(':checked');
            if (currentSettings.translateEnabled) $('#st-translate-options').show(); else $('#st-translate-options').hide();
            saveToStorage();
        });
        $('#st-set-translate-mode').on('change', function() { currentSettings.translateDisplayMode = $(this).val(); saveToStorage(); });
        $('#st-set-translate-provider').on('change', function() {
            currentSettings.translateProvider = $(this).val();
            updateTranslateModelList();
            currentSettings.translateModel = $('#st-set-translate-model').val();
            saveToStorage();
        });
        $('#st-set-translate-model').on('change', function() { currentSettings.translateModel = $(this).val(); saveToStorage(); });
        $('#st-set-translate-prompt').on('input', function() { currentSettings.translatePrompt = $(this).val(); saveToStorage(); });
        $('#st-reset-translate-prompt').on('click', () => { if(confirm('번역 프롬프트를 기본값으로 되돌릴까요?')) { currentSettings.translatePrompt = defaultSettings.translatePrompt; $('#st-set-translate-prompt').val(currentSettings.translatePrompt); saveToStorage(); } });
        $('#st-set-user-translate-prompt').on('input', function() { currentSettings.userTranslatePrompt = $(this).val(); saveToStorage(); });
        $('#st-reset-user-translate-prompt').on('click', () => { if(confirm('내 메시지 번역 프롬프트를 기본값으로 되돌릴까요?')) { currentSettings.userTranslatePrompt = defaultSettings.userTranslatePrompt; $('#st-set-user-translate-prompt').val(currentSettings.userTranslatePrompt); saveToStorage(); } });

        function updateDepth(key, value) {
            if (!currentSettings.promptDepth) currentSettings.promptDepth = { ...defaultSettings.promptDepth };
            currentSettings.promptDepth[key] = parseInt(value) || 0;
            saveToStorage();
        }
        $('#st-depth-sms').on('change', function() { updateDepth('smsSystemPrompt', $(this).val()); });
        $('#st-depth-group').on('change', function() { updateDepth('groupChatPrompt', $(this).val()); });
        $('#st-depth-phone-pickup').on('change', function() { updateDepth('phonePickupPrompt', $(this).val()); });
        $('#st-depth-phone-call').on('change', function() { updateDepth('phoneCallPrompt', $(this).val()); });
        $('#st-depth-camera').on('change', function() { updateDepth('cameraPrompt', $(this).val()); });
        $('#st-depth-photo-msg').on('change', function() { updateDepth('photoMessagePrompt', $(this).val()); });
        $('#st-set-persist').on('change', function() {
            currentSettings.persistSettings = $(this).is(':checked');
            saveToStorage();
            if (currentSettings.persistSettings) toastr.success('✅ 설정이 모든 채팅에서 유지됩니다');
        });
        $('#st-prompt-sms').on('input', function() { currentSettings.smsSystemPrompt = $(this).val(); saveToStorage(); });
        $('#st-reset-sms-prompt').on('click', () => { if(confirm('문자 프롬프트를 기본값으로 되돌릴까요?')) { currentSettings.smsSystemPrompt = defaultSettings.smsSystemPrompt; $('#st-prompt-sms').val(currentSettings.smsSystemPrompt); saveToStorage(); } });
        $('#st-prompt-group').on('input', function() { currentSettings.groupChatPrompt = $(this).val(); saveToStorage(); });
        $('#st-reset-group-prompt').on('click', () => { if(confirm('그룹 채팅 프롬프트를 기본값으로 되돌릴까요?')) { currentSettings.groupChatPrompt = defaultSettings.groupChatPrompt; $('#st-prompt-group').val(currentSettings.groupChatPrompt); saveToStorage(); } });
        $('#st-prompt-phone-pickup').on('input', function() { currentSettings.phonePickupPrompt = $(this).val(); saveToStorage(); });
        $('#st-reset-phone-pickup').on('click', () => { if(confirm('전화 수신 프롬프트를 기본값으로 되돌릴까요?')) { currentSettings.phonePickupPrompt = defaultSettings.phonePickupPrompt; $('#st-prompt-phone-pickup').val(currentSettings.phonePickupPrompt); saveToStorage(); } });
        $('#st-prompt-phone-call').on('input', function() { currentSettings.phoneCallPrompt = $(this).val(); saveToStorage(); });
        $('#st-reset-phone-call').on('click', () => { if(confirm('전화 대화 프롬프트를 기본값으로 되돌릴까요?')) { currentSettings.phoneCallPrompt = defaultSettings.phoneCallPrompt; $('#st-prompt-phone-call').val(currentSettings.phoneCallPrompt); saveToStorage(); } });
        $('#st-prompt-camera').on('input', function() { currentSettings.cameraPrompt = $(this).val(); saveToStorage(); });
        $('#st-reset-camera-prompt').on('click', () => { if(confirm('카메라 프롬프트를 기본값으로 되돌릴까요?')) { currentSettings.cameraPrompt = defaultSettings.cameraPrompt; $('#st-prompt-camera').val(currentSettings.cameraPrompt); saveToStorage(); } });
        $('#st-prompt-photo-msg').on('input', function() { currentSettings.photoMessagePrompt = $(this).val(); saveToStorage(); });
        $('#st-reset-photo-msg').on('click', () => { if(confirm('사진 메시지 프롬프트를 기본값으로 되돌릴까요?')) { currentSettings.photoMessagePrompt = defaultSettings.photoMessagePrompt; $('#st-prompt-photo-msg').val(currentSettings.photoMessagePrompt); saveToStorage(); } });
        $('#st-export-prompts').on('click', exportAllPrompts);
        $('#st-import-prompts').on('change', importAllPrompts);
    }

    function exportAllPrompts() {
        const promptsToExport = {
            _exportInfo: { app: 'ST Phone System', version: '1.0.5', exportDate: new Date().toISOString(), type: 'prompts' },
            promptDepth: currentSettings.promptDepth || defaultSettings.promptDepth,
            smsSystemPrompt: currentSettings.smsSystemPrompt,
            groupChatPrompt: currentSettings.groupChatPrompt,
            phonePickupPrompt: currentSettings.phonePickupPrompt,
            phoneCallPrompt: currentSettings.phoneCallPrompt,
            cameraPrompt: currentSettings.cameraPrompt,
            photoMessagePrompt: currentSettings.photoMessagePrompt,
            translatePrompt: currentSettings.translatePrompt,
            userTranslatePrompt: currentSettings.userTranslatePrompt,
            prefill: currentSettings.prefill
        };
        const jsonStr = JSON.stringify(promptsToExport, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const dateStr = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
        a.download = `st-phone-prompts_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toastr.success('📤 프롬프트가 내보내기 되었습니다!');
    }

    function importAllPrompts(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (!imported._exportInfo || imported._exportInfo.type !== 'prompts') { toastr.error('❌ 유효하지 않은 프롬프트 파일입니다.'); return; }
                if (imported.promptDepth) currentSettings.promptDepth = imported.promptDepth;
                if (imported.smsSystemPrompt) currentSettings.smsSystemPrompt = imported.smsSystemPrompt;
                if (imported.groupChatPrompt) currentSettings.groupChatPrompt = imported.groupChatPrompt;
                if (imported.phonePickupPrompt) currentSettings.phonePickupPrompt = imported.phonePickupPrompt;
                if (imported.phoneCallPrompt) currentSettings.phoneCallPrompt = imported.phoneCallPrompt;
                if (imported.cameraPrompt) currentSettings.cameraPrompt = imported.cameraPrompt;
                if (imported.photoMessagePrompt) currentSettings.photoMessagePrompt = imported.photoMessagePrompt;
                if (imported.translatePrompt) currentSettings.translatePrompt = imported.translatePrompt;
                if (imported.userTranslatePrompt) currentSettings.userTranslatePrompt = imported.userTranslatePrompt;
                if (imported.prefill) currentSettings.prefill = imported.prefill;
                saveToStorage();
                toastr.success(`📥 불러오기 완료!`);
            } catch (err) { console.error('[Settings] 프롬프트 불러오기 실패:', err); toastr.error('❌ 파일을 읽는 중 오류가 발생했습니다.'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function applyTheme() {
        const $phone = $('#st-phone-container');
        currentSettings.isDarkMode ? $phone.addClass('dark-mode') : $phone.removeClass('dark-mode');
    }
    function applyWallpaper() {
        if (window.STPhone.Apps?.Theme?.getCurrentTheme) {
            const theme = window.STPhone.Apps.Theme.getCurrentTheme();
            if (theme?.phone?.bgImage && theme.phone.bgImage.length > 0) return;
        }
        $('.st-phone-screen').css({ background: currentSettings.wallpaper, backgroundSize: 'cover', backgroundPosition: 'center' });
    }
    function applyFont() {
        const fonts = { 'serif': "'Times New Roman', serif", 'mono': "'Courier New', monospace", 'default': "-apple-system, sans-serif" };
        $('#st-phone-container').css('--pt-font', fonts[currentSettings.fontFamily] || fonts['default']);
    }

    async function init() {
        await loadFromStorage();
        if (currentSettings.profileAutoSync !== false) setTimeout(() => { syncFromSillyTavern(); }, 500);
        setInterval(() => {
            loadFromStorage();
            applyTheme(); applyWallpaper(); applyFont();
        }, 1000);
    }

    return { open, init, getSettings, getPromptDepth, updateSetting, syncFromSillyTavern };
})();