window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Settings = (function() {
    'use strict';

    function getStorage() {
        return window.STPhoneStorage || localforage;
    }

    const SETTINGS_KEY = 'st_phone_settings';

    const DEFAULT_SETTINGS = {
        userName: 'User',
        userAvatar: '',
        chatToSms: true,
        branchCopyRecords: false,
        connectionProfileId: null
    };

    let cachedSettings = { ...DEFAULT_SETTINGS };

    async function loadSettings() {
        try {
            const saved = await getStorage().getItem(SETTINGS_KEY);
            if (saved) {
                cachedSettings = { ...DEFAULT_SETTINGS, ...saved };
            }
        } catch (e) {
            console.error('[Settings] Failed to load settings:', e);
        }
        return cachedSettings;
    }

    async function saveSettings(newSettings) {
        try {
            cachedSettings = { ...cachedSettings, ...newSettings };
            await getStorage().setItem(SETTINGS_KEY, cachedSettings);
        } catch (e) {
            console.error('[Settings] Failed to save settings:', e);
        }
    }

    function getSettings() {
        return cachedSettings;
    }

    async function init() {
        await loadSettings();
        console.log('[Settings] Initialized with settings:', cachedSettings);
    }

    const css = `<style>
        .st-settings-app {
            position: absolute; top: 0; left: 0;
            width: 100%; height: 100%; z-index: 999;
            display: flex; flex-direction: column;
            background: var(--pt-bg-color, #f5f5f7);
            color: var(--pt-text-color, #000);
            font-family: var(--pt-font, -apple-system, sans-serif);
        }
        .st-settings-header {
            padding: 20px 20px 15px;
            font-size: 28px;
            font-weight: 700;
            flex-shrink: 0;
        }
        .st-settings-list {
            flex: 1;
            overflow-y: auto;
            padding: 0 20px 80px;
        }
        .st-settings-group {
            margin-bottom: 25px;
        }
        .st-settings-group-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--pt-sub-text, #86868b);
            text-transform: uppercase;
            margin-bottom: 8px;
            padding-left: 5px;
        }
        .st-settings-card {
            background: var(--pt-card-bg, #fff);
            border-radius: 12px;
            overflow: hidden;
        }
        .st-settings-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            border-bottom: 1px solid var(--pt-border, #e5e5e5);
        }
        .st-settings-item:last-child {
            border-bottom: none;
        }
        .st-settings-label {
            font-size: 16px;
            font-weight: 400;
        }
        .st-settings-input {
            border: 1px solid var(--pt-border, #e5e5e5);
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 14px;
            background: var(--pt-bg-color, #f5f5f7);
            color: var(--pt-text-color, #000);
            width: 150px;
            text-align: right;
        }
        .st-settings-toggle {
            position: relative;
            width: 51px;
            height: 31px;
            background: #e5e5ea;
            border-radius: 31px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .st-settings-toggle.active {
            background: #34c759;
        }
        .st-settings-toggle::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 27px;
            height: 27px;
            background: white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: transform 0.3s;
        }
        .st-settings-toggle.active::after {
            transform: translateX(20px);
        }
        .st-settings-select {
            border: 1px solid var(--pt-border, #e5e5e5);
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 14px;
            background: var(--pt-bg-color, #f5f5f7);
            color: var(--pt-text-color, #000);
            min-width: 150px;
        }
        .st-settings-btn {
            background: var(--pt-accent, #007aff);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 14px;
            cursor: pointer;
        }
        .st-settings-btn.danger {
            background: #ff3b30;
        }
    </style>`;

    async function open() {
        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen?.length) return;
        $screen.empty();

        await loadSettings();

        let profileOptions = '<option value="">기본 (슬래시 커맨드)</option>';
        try {
            const context = window.SillyTavern?.getContext?.();
            if (context?.ConnectionManagerRequestService) {
                const profiles = context.ConnectionManagerRequestService.getProfiles?.() || [];
                profiles.forEach(p => {
                    const selected = cachedSettings.connectionProfileId === p.id ? 'selected' : '';
                    profileOptions += `<option value="${p.id}" ${selected}>${p.name}</option>`;
                });
            }
        } catch (e) {
            console.warn('[Settings] Could not load connection profiles:', e);
        }

        $screen.append(`
            ${css}
            <div class="st-settings-app">
                <div class="st-settings-header">설정</div>
                <div class="st-settings-list">
                    <div class="st-settings-group">
                        <div class="st-settings-group-title">사용자 정보</div>
                        <div class="st-settings-card">
                            <div class="st-settings-item">
                                <span class="st-settings-label">이름</span>
                                <input type="text" class="st-settings-input" id="st-settings-username"
                                       value="${cachedSettings.userName}" placeholder="사용자 이름">
                            </div>
                        </div>
                    </div>

                    <div class="st-settings-group">
                        <div class="st-settings-group-title">메시지</div>
                        <div class="st-settings-card">
                            <div class="st-settings-item">
                                <span class="st-settings-label">채팅 → SMS 동기화</span>
                                <div class="st-settings-toggle ${cachedSettings.chatToSms ? 'active' : ''}"
                                     id="st-settings-chat-sync"></div>
                            </div>
                            <div class="st-settings-item">
                                <span class="st-settings-label">브랜치 기록 복사</span>
                                <div class="st-settings-toggle ${cachedSettings.branchCopyRecords ? 'active' : ''}"
                                     id="st-settings-branch-copy"></div>
                            </div>
                        </div>
                    </div>

                    <div class="st-settings-group">
                        <div class="st-settings-group-title">AI 연결</div>
                        <div class="st-settings-card">
                            <div class="st-settings-item">
                                <span class="st-settings-label">연결 프로필</span>
                                <select class="st-settings-select" id="st-settings-profile">
                                    ${profileOptions}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="st-settings-group">
                        <div class="st-settings-group-title">데이터</div>
                        <div class="st-settings-card">
                            <div class="st-settings-item">
                                <span class="st-settings-label">모든 데이터 초기화</span>
                                <button class="st-settings-btn danger" id="st-settings-reset">초기화</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        attachListeners();
    }

    function attachListeners() {
        $('#st-settings-username').on('change', async function() {
            const value = $(this).val().trim() || 'User';
            await saveSettings({ userName: value });
            toastr.success('이름이 저장되었습니다.');
        });

        $('#st-settings-chat-sync').on('click', async function() {
            $(this).toggleClass('active');
            const enabled = $(this).hasClass('active');
            await saveSettings({ chatToSms: enabled });
        });

        $('#st-settings-branch-copy').on('click', async function() {
            $(this).toggleClass('active');
            const enabled = $(this).hasClass('active');
            await saveSettings({ branchCopyRecords: enabled });
        });

        $('#st-settings-profile').on('change', async function() {
            const value = $(this).val() || null;
            await saveSettings({ connectionProfileId: value });
            toastr.success('연결 프로필이 저장되었습니다.');
        });

        $('#st-settings-reset').on('click', async function() {
            if (!confirm('모든 폰 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

            try {
                const storage = getStorage();
                const keys = await storage.keys();
                for (const key of keys) {
                    if (key.startsWith('st_phone_')) {
                        await storage.removeItem(key);
                    }
                }
                cachedSettings = { ...DEFAULT_SETTINGS };
                await storage.setItem(SETTINGS_KEY, cachedSettings);
                toastr.success('모든 데이터가 초기화되었습니다.');
                open();
            } catch (e) {
                console.error('[Settings] Reset failed:', e);
                toastr.error('초기화에 실패했습니다.');
            }
        });
    }

    return {
        init,
        open,
        getSettings,
        loadSettings,
        saveSettings
    };
})();