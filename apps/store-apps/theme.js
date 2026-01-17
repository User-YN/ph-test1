window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Theme = (function() {
    'use strict';

    // ==========================================
    // [수정됨] 내부 DB 코드 삭제 -> 통합 저장소 사용
    // ==========================================
    const LEGACY_STORAGE_KEY = 'st_phone_theme_settings'; // 구버전 마이그레이션용
    const THEME_STORAGE_KEY = 'st_phone_theme_current';   // 신규 저장 키

    // [Helper] 저장소 인스턴스 가져오기
    function getStorage() {
        if (window.STPhoneStorage) return window.STPhoneStorage;
        console.error('[Theme] window.STPhoneStorage가 초기화되지 않았습니다.');
        return localforage; 
    }

    // 기본 테마 설정
    const DEFAULT_THEME = {
        frame: {
            color: '#2c2c2c',
            borderColor: '#555',
            thickness: 10,
            radius: 55,
            shadow: 'default',
            glowColor: '#007aff'
        },
        phone: {
            bgColor: '#1e1e2f',
            bgImage: '',
            bgGradient: 'linear-gradient(135deg, #1e1e2f 0%, #2a2a40 100%)',
            notchColor: '#000000',
            homeBarColor: 'rgba(255,255,255,0.4)',
            font: '-apple-system, sans-serif',
            accentColor: '#007aff',
            iconSize: 65,
            iconRadius: 16
        },
        messages: {
            bgColor: '',
            bgImage: '',
            myBubbleColor: '#007aff',
            myBubbleTextColor: '#ffffff',
            theirBubbleColor: '#e5e5ea',
            theirBubbleTextColor: '#000000',
            bubbleMaxWidth: 75,
            bubbleRadius: 18,
            fontSize: 15,
            timestampColor: '#8e8e93'
        },
        apps: {
            headerBg: 'rgba(255,255,255,0.9)',
            headerTextColor: '#000000',
            listBg: '#ffffff',
            listTextColor: '#000000',
            listSubTextColor: '#86868b',
            listBorderColor: '#e5e5e5',
            isDarkMode: false
        },
        icons: {
            phone: '', messages: '', contacts: '', camera: '', album: '', settings: '', store: ''
        }
    };

    // 프리셋 테마들
    const PRESET_THEMES = {
        light: { name: '☀️ 라이트', theme: { ...DEFAULT_THEME } },
        dark: {
            name: '🌙 다크',
            theme: {
                frame: { color: '#1c1c1e', borderColor: '#333', thickness: 10, radius: 55, shadow: 'default', glowColor: '#007aff' },
                phone: { bgColor: '#000000', bgImage: '', bgGradient: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', notchColor: '#000', homeBarColor: 'rgba(255,255,255,0.3)', font: '-apple-system, sans-serif', accentColor: '#0a84ff', iconSize: 65, iconRadius: 16 },
                messages: { bgColor: '#000000', bgImage: '', myBubbleColor: '#0a84ff', myBubbleTextColor: '#ffffff', theirBubbleColor: '#2c2c2e', theirBubbleTextColor: '#ffffff', bubbleMaxWidth: 75, bubbleRadius: 18, fontSize: 15, timestampColor: '#8e8e93' },
                apps: { headerBg: 'rgba(28,28,30,0.95)', headerTextColor: '#ffffff', listBg: '#1c1c1e', listTextColor: '#ffffff', listSubTextColor: '#98989e', listBorderColor: '#38383a', isDarkMode: true },
                icons: { phone: '', messages: '', contacts: '', camera: '', album: '', settings: '', store: '' }
            }
        },
        neon: {
            name: '💜 네온',
            theme: {
                frame: { color: '#0d0d0d', borderColor: '#ff00ff', thickness: 10, radius: 55, shadow: 'glow', glowColor: '#ff00ff' },
                phone: { bgColor: '#0a0a0a', bgImage: '', bgGradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 100%)', notchColor: '#000', homeBarColor: 'rgba(255,0,255,0.5)', font: '-apple-system, sans-serif', accentColor: '#ff00ff', iconSize: 65, iconRadius: 16 },
                messages: { bgColor: '#0a0a0a', bgImage: '', myBubbleColor: '#ff00ff', myBubbleTextColor: '#ffffff', theirBubbleColor: '#1a1a2e', theirBubbleTextColor: '#ff88ff', bubbleMaxWidth: 75, bubbleRadius: 18, fontSize: 15, timestampColor: '#ff88ff' },
                apps: { headerBg: 'rgba(10,10,10,0.95)', headerTextColor: '#ff00ff', listBg: '#0d0d1a', listTextColor: '#ffffff', listSubTextColor: '#ff88ff', listBorderColor: '#2a0a3e', isDarkMode: true },
                icons: { phone: '', messages: '', contacts: '', camera: '', album: '', settings: '', store: '' }
            }
        },
        ocean: {
            name: '🌊 오션',
            theme: {
                frame: { color: '#1a3a4a', borderColor: '#2dd4bf', thickness: 10, radius: 55, shadow: 'glow', glowColor: '#2dd4bf' },
                phone: { bgColor: '#0c2233', bgImage: '', bgGradient: 'linear-gradient(135deg, #0c2233 0%, #1a4a5a 100%)', notchColor: '#0a1a2a', homeBarColor: 'rgba(45,212,191,0.5)', font: '-apple-system, sans-serif', accentColor: '#2dd4bf', iconSize: 65, iconRadius: 16 },
                messages: { bgColor: '#0c2233', bgImage: '', myBubbleColor: '#2dd4bf', myBubbleTextColor: '#000000', theirBubbleColor: '#1a3a4a', theirBubbleTextColor: '#ffffff', bubbleMaxWidth: 75, bubbleRadius: 18, fontSize: 15, timestampColor: '#5eead4' },
                apps: { headerBg: 'rgba(12,34,51,0.95)', headerTextColor: '#2dd4bf', listBg: '#0f2a3a', listTextColor: '#ffffff', listSubTextColor: '#5eead4', listBorderColor: '#1a4a5a', isDarkMode: true },
                icons: { phone: '', messages: '', contacts: '', camera: '', album: '', settings: '', store: '' }
            }
        },
        rose: {
            name: '🌸 로즈',
            theme: {
                frame: { color: '#4a2a3a', borderColor: '#f472b6', thickness: 10, radius: 55, shadow: 'glow', glowColor: '#f472b6' },
                phone: { bgColor: '#2a1a2a', bgImage: '', bgGradient: 'linear-gradient(135deg, #2a1a2a 0%, #4a2a4a 100%)', notchColor: '#1a0a1a', homeBarColor: 'rgba(244,114,182,0.5)', font: '-apple-system, sans-serif', accentColor: '#f472b6', iconSize: 65, iconRadius: 16 },
                messages: { bgColor: '#2a1a2a', bgImage: '', myBubbleColor: '#f472b6', myBubbleTextColor: '#ffffff', theirBubbleColor: '#3a2a3a', theirBubbleTextColor: '#fda4af', bubbleMaxWidth: 75, bubbleRadius: 18, fontSize: 15, timestampColor: '#fda4af' },
                apps: { headerBg: 'rgba(42,26,42,0.95)', headerTextColor: '#f472b6', listBg: '#2a1a2a', listTextColor: '#ffffff', listSubTextColor: '#fda4af', listBorderColor: '#4a2a4a', isDarkMode: true },
                icons: { phone: '', messages: '', contacts: '', camera: '', album: '', settings: '', store: '' }
            }
        }
    };

    let currentTheme = null;
    let currentEditSection = 'frame';

    // [Async]
    async function init() {
        // 테마 앱이 설치되어 있을 때만 테마 로드
        try {
            // store.js에서 관리하는 전역 설치 앱 목록 확인 (DB에서 확인)
            const globalApps = await getStorage().getItem('st_phone_global_installed_apps');
            if (Array.isArray(globalApps) && !globalApps.includes('theme')) {
                return;
            }
        } catch (e) {}
        
        await loadTheme();
        applyTheme();
        console.log('🎨 [ST Phone] Theme App Initialized');
    }

    // [Async]
    async function loadTheme() {
        try {
            // 1. 통합 저장소(IndexedDB) 시도
            let saved = await getStorage().getItem(THEME_STORAGE_KEY);

            // 2. 없으면 localStorage (Legacy 마이그레이션)
            if (!saved) {
                const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
                if (legacySaved) {
                    try {
                        saved = JSON.parse(legacySaved);
                        // 마이그레이션 후 저장
                        await getStorage().setItem(THEME_STORAGE_KEY, saved);
                        localStorage.removeItem(LEGACY_STORAGE_KEY);
                        console.log('🎨 [Theme] Migrated to IndexedDB');
                    } catch (e) { console.error('Migration failed', e); }
                }
            }

            if (saved) {
                currentTheme = structuredClone(DEFAULT_THEME);
                deepMerge(currentTheme, saved);
            } else {
                currentTheme = structuredClone(DEFAULT_THEME);
            }
        } catch (e) {
            console.error('Theme load error:', e);
            currentTheme = structuredClone(DEFAULT_THEME);
        }
    }

    // [Async]
    async function saveTheme() {
        try {
            let themeToSave = structuredClone(currentTheme);
            let sizeInMB = new Blob([JSON.stringify(themeToSave)]).size / (1024 * 1024);

            // 50MB 초과 시 이미지 압축
            if (sizeInMB > 50) {
                console.log(`🖼️ [Theme] Compressing large theme (${sizeInMB.toFixed(2)}MB)...`);
                themeToSave = await compressAllImages(themeToSave);
                currentTheme = themeToSave; // 압축된 버전으로 업데이트
            }

            // [수정] 통합 저장소에 저장
            await getStorage().setItem(THEME_STORAGE_KEY, themeToSave);
            return true;
        } catch (e) {
            console.error('Theme save error:', e);
            toastr.error('테마 저장 실패: ' + e.message);
            return false;
        }
    }

    async function compressAllImages(theme) {
        const compressed = structuredClone(theme);
        if (compressed.phone?.bgImage) compressed.phone.bgImage = await compressImage(compressed.phone.bgImage, 1920, 0.85);
        if (compressed.messages?.bgImage) compressed.messages.bgImage = await compressImage(compressed.messages.bgImage, 1920, 0.85);
        if (compressed.icons) {
            for (const key of Object.keys(compressed.icons)) {
                if (compressed.icons[key]) {
                    compressed.icons[key] = await compressImage(compressed.icons[key], 256, 0.85);
                }
            }
        }
        return compressed;
    }

    function compressImage(base64Data, maxWidth = 1920, quality = 0.9) {
        return new Promise((resolve) => {
            if (!base64Data || !base64Data.startsWith('data:image')) { resolve(base64Data); return; }
            const img = new Image();
            const timeout = setTimeout(() => resolve(base64Data), 10000);
            img.onload = () => {
                clearTimeout(timeout);
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const isPng = base64Data.includes('image/png');
                    resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality));
                } catch (err) { resolve(base64Data); }
            };
            img.onerror = () => { clearTimeout(timeout); resolve(base64Data); };
            img.src = base64Data;
        });
    }

    function deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    function applyTheme() {
        if (!currentTheme) return;
        const $container = $('#st-phone-container');
        if (!$container.length) return;
        const { frame, phone, messages, apps } = currentTheme;

        // Frame
        let frameStyle = `background-color: ${frame.color}; border-radius: ${frame.radius}px; box-shadow: 0 0 0 ${frame.thickness}px ${frame.color}, 0 0 0 ${frame.thickness + 1}px ${frame.borderColor}`;
        if (frame.shadow === 'glow') frameStyle += `, 0 0 30px ${frame.glowColor}, 0 0 60px ${frame.glowColor}40`;
        else if (frame.shadow === 'default') frameStyle += `, 0 30px 60px rgba(0,0,0,0.6)`;
        frameStyle += ';';
        $container.attr('style', frameStyle);
        $container.css('padding', '12px');

        // Phone Background
        const $screen = $container.find('.st-phone-screen');
        if (phone.bgImage && phone.bgImage.length > 0) {
            $screen.css({ 'background-image': `url(${phone.bgImage})`, 'background-size': 'cover', 'background-position': 'center', 'background-repeat': 'no-repeat' });
        } else if (phone.bgGradient && phone.bgGradient.length > 0) {
            $screen.css({ 'background-image': 'none', 'background': phone.bgGradient });
        } else {
            $screen.css({ 'background-image': 'none', 'background': phone.bgColor });
        }

        // Notch & HomeBar
        $container.find('.st-phone-notch').css('background-color', phone.notchColor);
        $container.find('.st-phone-home-bar').css('background-color', phone.homeBarColor);

        // Icon Size
        $container.find('.st-app-icon').css({ 'width': `${phone.iconSize}px`, 'height': `${phone.iconSize}px`, 'border-radius': `${phone.iconRadius}px` });

        // Custom Icons
        const icons = currentTheme.icons || {};
        Object.keys(icons).forEach(appId => {
            const iconImage = icons[appId];
            if (iconImage && iconImage.length > 0) {
                const $icon = $container.find(`.st-app-icon[data-app="${appId}"]`);
                if ($icon.length) {
                    $icon.css({ 'background-color': 'transparent', 'background-image': `url(${iconImage})`, 'background-size': 'cover', 'background-position': 'center' });
                    $icon.find('svg').css('opacity', '0');
                }
            }
        });

        // Dark Mode
        apps.isDarkMode ? $container.addClass('dark-mode') : $container.removeClass('dark-mode');

        // CSS Variables
        const root = $container[0];
        root.style.setProperty('--pt-bg-color', apps.listBg);
        root.style.setProperty('--pt-text-color', apps.listTextColor);
        root.style.setProperty('--pt-sub-text', apps.listSubTextColor);
        root.style.setProperty('--pt-card-bg', apps.listBg);
        root.style.setProperty('--pt-border', apps.listBorderColor);
        root.style.setProperty('--pt-accent', phone.accentColor);
        root.style.setProperty('--pt-font', phone.font);
        root.style.setProperty('--msg-my-bubble', messages.myBubbleColor);
        root.style.setProperty('--msg-my-text', messages.myBubbleTextColor);
        root.style.setProperty('--msg-their-bubble', messages.theirBubbleColor);
        root.style.setProperty('--msg-their-text', messages.theirBubbleTextColor);
        root.style.setProperty('--msg-bubble-width', `${messages.bubbleMaxWidth}%`);
        root.style.setProperty('--msg-bubble-radius', `${messages.bubbleRadius}px`);
        root.style.setProperty('--msg-font-size', `${messages.fontSize}px`);
        root.style.setProperty('--msg-timestamp', messages.timestampColor);

        if (messages.bgImage && messages.bgImage.length > 0) {
            root.style.setProperty('--msg-bg-image', `url("${messages.bgImage}")`);
            root.style.setProperty('--msg-bg-color', 'transparent');
            const $chatMessages = $container.find('.st-chat-messages');
            if ($chatMessages.length) $chatMessages.css({ 'background-image': `url("${messages.bgImage}")`, 'background-color': 'transparent', 'background-size': 'cover', 'background-position': 'center', 'background-repeat': 'no-repeat' });
        } else {
            root.style.setProperty('--msg-bg-image', 'none');
            root.style.setProperty('--msg-bg-color', messages.bgColor || phone.bgColor || '#f5f5f7');
            const $chatMessages = $container.find('.st-chat-messages');
            if ($chatMessages.length) $chatMessages.css({ 'background-image': 'none', 'background-color': messages.bgColor || phone.bgColor || '#f5f5f7' });
        }
    }

    // [Async]
    async function open() {
        if (!currentTheme) await loadTheme();
        const $screen = window.STPhone.UI.getContentElement();
        $screen.empty();
        currentEditSection = 'frame';
        renderMainMenu();
    }

    function renderMainMenu() {
        const $screen = window.STPhone.UI.getContentElement();
        $screen.empty();
        const html = `
            <div class="st-theme-app" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--pt-bg-color); color: var(--pt-text-color); overflow-y: auto; padding: 20px; box-sizing: border-box;">
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <button id="theme-back-btn" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--pt-accent); padding: 0; margin-right: 10px;">←</button>
                    <h1 style="font-size: 28px; font-weight: 700; margin: 0;">🎨 테마</h1>
                </div>
                <div class="st-section" style="background: var(--pt-card-bg); border-radius: 12px; margin-bottom: 20px; overflow: hidden;">
                    <div style="padding: 16px; border-bottom: 1px solid var(--pt-border);"><span style="font-size: 14px; font-weight: 600; color: var(--pt-sub-text);">프리셋</span></div>
                    <div id="theme-presets" style="display: flex; gap: 10px; padding: 16px; overflow-x: auto;"></div>
                </div>
                <div class="st-section" style="background: var(--pt-card-bg); border-radius: 12px; margin-bottom: 20px; overflow: hidden;">
                    <div style="padding: 16px; border-bottom: 1px solid var(--pt-border);"><span style="font-size: 14px; font-weight: 600; color: var(--pt-sub-text);">커스텀 편집</span></div>
                    <div class="theme-menu-item" data-section="frame" style="padding: 16px; border-bottom: 1px solid var(--pt-border); cursor: pointer; display: flex; justify-content: space-between; align-items: center;"><span>📱 폰 프레임 (케이스)</span><span style="color: var(--pt-sub-text);">›</span></div>
                    <div class="theme-menu-item" data-section="phone" style="padding: 16px; border-bottom: 1px solid var(--pt-border); cursor: pointer; display: flex; justify-content: space-between; align-items: center;"><span>🏠 전체 UI</span><span style="color: var(--pt-sub-text);">›</span></div>
                    <div class="theme-menu-item" data-section="messages" style="padding: 16px; border-bottom: 1px solid var(--pt-border); cursor: pointer; display: flex; justify-content: space-between; align-items: center;"><span>💬 메시지 앱</span><span style="color: var(--pt-sub-text);">›</span></div>
                    <div class="theme-menu-item" data-section="apps" style="padding: 16px; border-bottom: 1px solid var(--pt-border); cursor: pointer; display: flex; justify-content: space-between; align-items: center;"><span>🎛️ 앱 공통</span><span style="color: var(--pt-sub-text);">›</span></div>
                    <div class="theme-menu-item" data-section="icons" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"><span>🖼️ 앱 아이콘</span><span style="color: var(--pt-sub-text);">›</span></div>
                </div>
                <div class="st-section" style="background: var(--pt-card-bg); border-radius: 12px; margin-bottom: 20px; overflow: hidden;">
                    <div style="padding: 16px; border-bottom: 1px solid var(--pt-border);"><span style="font-size: 14px; font-weight: 600; color: var(--pt-sub-text);">테마 공유</span></div>
                    <div id="theme-export-btn" style="padding: 16px; border-bottom: 1px solid var(--pt-border); cursor: pointer; display: flex; justify-content: space-between; align-items: center;"><span>📤 테마 내보내기 (JSON)</span><span style="color: var(--pt-sub-text);">›</span></div>
                    <div id="theme-import-btn" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"><span>📥 테마 불러오기</span><span style="color: var(--pt-sub-text);">›</span></div>
                    <input type="file" id="theme-file-input" accept=".json" style="display: none;">
                </div>
                <div class="st-section" style="background: var(--pt-card-bg); border-radius: 12px; margin-bottom: 100px; overflow: hidden;">
                    <div id="theme-reset-btn" style="padding: 16px; cursor: pointer; text-align: center; color: #ff3b30;">🔄 기본값으로 초기화</div>
                </div>
            </div>`;
        $screen.append(html);
        renderPresets();
        $('#theme-back-btn').on('click', () => window.STPhone.UI.renderHomeScreen());
        $('.theme-menu-item').on('click', function() { renderEditSection($(this).data('section')); });
        $('#theme-export-btn').on('click', exportTheme);
        $('#theme-import-btn').on('click', () => $('#theme-file-input').click());
        $('#theme-file-input').on('change', importTheme);
        $('#theme-reset-btn').on('click', resetTheme);
    }

    function renderPresets() {
        const $container = $('#theme-presets');
        $container.empty();
        Object.entries(PRESET_THEMES).forEach(([key, preset]) => {
            const previewColor = preset.theme.phone.bgGradient || preset.theme.phone.bgColor;
            const frameColor = preset.theme.frame.color;
            $container.append(`<div class="theme-preset-item" data-preset="${key}" style="min-width: 70px; text-align: center; cursor: pointer;"><div style="width: 50px; height: 80px; margin: 0 auto 8px; border-radius: 10px; background: ${previewColor}; box-shadow: 0 0 0 3px ${frameColor};"></div><span style="font-size: 12px;">${preset.name}</span></div>`);
        });
        $('.theme-preset-item').on('click', async function() {
            const presetKey = $(this).data('preset');
            await applyPreset(presetKey);
        });
    }

    async function applyPreset(presetKey) {
        const preset = PRESET_THEMES[presetKey];
        if (!preset) return;
        currentTheme = structuredClone(preset.theme);
        await saveTheme();
        applyTheme();
        toastr.success(`${preset.name} 테마 적용됨`);
        renderMainMenu();
    }

    function renderEditSection(section) {
        currentEditSection = section;
        const $screen = window.STPhone.UI.getContentElement();
        $screen.empty();
        const titles = { frame: '📱 폰 프레임 (케이스)', phone: '🏠 전체 UI', messages: '💬 메시지 앱', apps: '🎛️ 앱 공통', icons: '🖼️ 앱 아이콘' };
        const html = `<div class="st-theme-edit" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--pt-bg-color); color: var(--pt-text-color); overflow-y: auto; padding: 20px; box-sizing: border-box;"><div style="display: flex; align-items: center; margin-bottom: 20px;"><button id="edit-back-btn" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--pt-accent); padding: 0; margin-right: 10px;">←</button><h1 style="font-size: 24px; font-weight: 700; margin: 0;">${titles[section]}</h1></div><div id="edit-fields" class="st-section" style="background: var(--pt-card-bg); border-radius: 12px; margin-bottom: 100px; overflow: hidden;"></div></div>`;
        $screen.append(html);
        renderEditFields(section, $screen.find('#edit-fields'));
        $('#edit-back-btn').on('click', () => { saveTheme(); applyTheme(); renderMainMenu(); });
    }

    function renderEditFields(section, $container) {
        if (!currentTheme[section]) currentTheme[section] = {};
        const data = currentTheme[section];
        const fieldConfigs = {
            frame: [{key:'color',label:'프레임 색상',type:'color'},{key:'borderColor',label:'테두리 색상',type:'color'},{key:'thickness',label:'두께',type:'range',min:5,max:20},{key:'radius',label:'모서리 둥글기',type:'range',min:20,max:80},{key:'shadow',label:'그림자 스타일',type:'select',options:[{value:'default',label:'기본'},{value:'glow',label:'글로우'},{value:'none',label:'없음'}]},{key:'glowColor',label:'글로우 색상',type:'color'}],
            phone: [{key:'bgColor',label:'배경 색상',type:'color'},{key:'bgGradient',label:'배경 그라데이션',type:'text',placeholder:'linear-gradient(...)'},{key:'bgImage',label:'배경 이미지',type:'image'},{key:'notchColor',label:'노치 색상',type:'color'},{key:'homeBarColor',label:'홈바 색상',type:'text',placeholder:'rgba(255,255,255,0.4)'},{key:'accentColor',label:'강조 색상',type:'color'},{key:'iconSize',label:'아이콘 크기',type:'range',min:50,max:80},{key:'iconRadius',label:'아이콘 둥글기',type:'range',min:8,max:30}],
            messages: [{key:'bgColor',label:'채팅방 배경색',type:'color'},{key:'bgImage',label:'채팅방 배경이미지',type:'image'},{key:'myBubbleColor',label:'내 말풍선 색상',type:'color'},{key:'myBubbleTextColor',label:'내 말풍선 글자색',type:'color'},{key:'theirBubbleColor',label:'상대 말풍선 색상',type:'color'},{key:'theirBubbleTextColor',label:'상대 말풍선 글자색',type:'color'},{key:'bubbleMaxWidth',label:'말풍선 최대 너비 (%)',type:'range',min:50,max:95},{key:'bubbleRadius',label:'말풍선 둥글기',type:'range',min:8,max:30},{key:'fontSize',label:'글자 크기',type:'range',min:12,max:22},{key:'timestampColor',label:'타임스탬프 색상',type:'color'}],
            apps: [{key:'isDarkMode',label:'다크 모드',type:'toggle'},{key:'headerBg',label:'헤더 배경',type:'text',placeholder:'rgba(255,255,255,0.9)'},{key:'headerTextColor',label:'헤더 글자색',type:'color'},{key:'listBg',label:'목록 배경색',type:'color'},{key:'listTextColor',label:'목록 글자색',type:'color'},{key:'listSubTextColor',label:'보조 글자색',type:'color'},{key:'listBorderColor',label:'구분선 색상',type:'color'}],
            icons: [{key:'phone',label:'📞 전화',type:'image'},{key:'messages',label:'💬 메시지',type:'image'},{key:'contacts',label:'👤 연락처',type:'image'},{key:'camera',label:'📷 카메라',type:'image'},{key:'album',label:'🖼️ 앨범',type:'image'},{key:'settings',label:'⚙️ 설정',type:'image'},{key:'store',label:'🛒 App Store',type:'image'}]
        };
        const fields = fieldConfigs[section] || [];
        fields.forEach(field => {
            const value = data[field.key];
            let inputHtml = '';
            if(field.type === 'color') inputHtml = `<div style="display:flex;align-items:center;gap:10px;"><input type="color" class="theme-input" data-key="${field.key}" value="${value||'#000000'}" style="width:40px;height:30px;border:none;cursor:pointer;"><input type="text" class="theme-input-text" data-key="${field.key}" value="${value||''}" style="flex:1;background:transparent;border:1px solid var(--pt-border);border-radius:6px;padding:6px 10px;color:var(--pt-text-color);font-size:14px;"></div>`;
            else if(field.type === 'range') inputHtml = `<div style="display:flex;align-items:center;gap:10px;"><input type="range" class="theme-input" data-key="${field.key}" value="${value}" min="${field.min}" max="${field.max}" style="flex:1;cursor:pointer;"><span class="range-value" style="min-width:30px;text-align:right;color:var(--pt-accent);">${value}</span></div>`;
            else if(field.type === 'select') inputHtml = `<select class="theme-input" data-key="${field.key}" style="background:var(--pt-card-bg);border:1px solid var(--pt-border);border-radius:6px;padding:8px;color:var(--pt-text-color);cursor:pointer;">${field.options.map(opt => `<option value="${opt.value}" ${value===opt.value?'selected':''}>${opt.label}</option>`).join('')}</select>`;
            else if(field.type === 'toggle') inputHtml = `<input type="checkbox" class="st-switch theme-input" data-key="${field.key}" ${value?'checked':''}>`;
            else if(field.type === 'text') inputHtml = `<input type="text" class="theme-input" data-key="${field.key}" value="${value||''}" placeholder="${field.placeholder||''}" style="width:100%;background:transparent;border:1px solid var(--pt-border);border-radius:6px;padding:8px 10px;color:var(--pt-text-color);font-size:14px;margin-top:8px;">`;
            else if(field.type === 'image') inputHtml = `<div style="margin-top:8px;"><input type="file" class="theme-image-input" data-key="${field.key}" accept="image/*" style="display:none;"><button class="theme-image-btn" data-key="${field.key}" style="background:var(--pt-accent);color:white;border:none;border-radius:8px;padding:10px 16px;cursor:pointer;font-size:14px;">이미지 선택</button>${value?`<button class="theme-image-clear" data-key="${field.key}" style="background:#ff3b30;color:white;border:none;border-radius:8px;padding:10px 16px;cursor:pointer;font-size:14px;margin-left:8px;">삭제</button>`:''} ${value?`<div style="margin-top:10px;"><img src="${value}" style="max-width:100%;max-height:100px;border-radius:8px;"></div>`:''}</div>`;
            $container.append(`<div class="st-row" style="padding:16px;border-bottom:1px solid var(--pt-border);flex-direction:column;align-items:stretch;"><label style="font-size:15px;font-weight:500;margin-bottom:8px;">${field.label}</label>${inputHtml}</div>`);
        });
        bindEditEvents(section);
    }

    function bindEditEvents(section) {
        $('.theme-input').on('input change', function() {
            const key = $(this).data('key');
            let value = $(this).val();
            if ($(this).attr('type') === 'checkbox') value = $(this).is(':checked');
            else if ($(this).attr('type') === 'range') { $(this).siblings('.range-value').text(value); value = parseInt(value); }
            currentTheme[section][key] = value;
            saveTheme(); applyTheme();
        });
        $('.theme-input-text').on('input', function() {
            const key = $(this).data('key');
            const value = $(this).val();
            currentTheme[section][key] = value;
            $(this).siblings('input[type="color"]').val(value);
            saveTheme(); applyTheme();
        });
        $('input[type="color"].theme-input').on('input', function() {
            const key = $(this).data('key');
            const value = $(this).val();
            $(this).siblings('.theme-input-text').val(value);
        });
        $('.theme-image-btn').on('click', function() { $(`.theme-image-input[data-key="${$(this).data('key')}"]`).click(); });
        $('.theme-image-input').on('change', function(e) {
            const key = $(this).data('key');
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const maxSize = section === 'icons' ? 256 : 1920;
                    const compressed = await compressImage(ev.target.result, maxSize, 0.9);
                    currentTheme[section][key] = compressed;
                    await saveTheme();
                    applyTheme();
                    renderEditSection(section);
                    toastr.success('이미지 저장됨!');
                } catch (err) { console.error('Image error:', err); toastr.error('이미지 처리 실패'); }
            };
            reader.readAsDataURL(file);
        });
        $('.theme-image-clear').on('click', function() {
            const key = $(this).data('key');
            currentTheme[section][key] = '';
            saveTheme(); applyTheme(); renderEditSection(section);
        });
    }

    function exportTheme() {
        const json = JSON.stringify(currentTheme, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `st-phone-theme-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toastr.success('테마 파일 다운로드됨');
    }

    function importTheme(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const imported = JSON.parse(ev.target.result);
                currentTheme = deepMerge(structuredClone(DEFAULT_THEME), imported);
                await saveTheme();
                applyTheme();
                toastr.success('테마 불러오기 완료!');
                renderMainMenu();
            } catch (err) { toastr.error('잘못된 테마 파일입니다.'); console.error(err); }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    async function resetTheme() {
        if (!confirm('테마를 기본값으로 초기화할까요?')) return;
        currentTheme = structuredClone(DEFAULT_THEME);
        await saveTheme();
        applyTheme();
        toastr.info('테마가 초기화되었습니다.');
        renderMainMenu();
    }

    function getStoreInfo() {
        return { id: 'theme', name: '테마', icon: '🎨', description: '폰 전체 UI를 자유롭게 커스터마이징! 프레임, 배경, 말풍선 등을 꾸밀 수 있고 테마를 공유할 수도 있어요.', bg: 'linear-gradient(135deg, #667eea, #764ba2)' };
    }

    function getCurrentTheme() { return currentTheme; }

    async function clearTheme() {
        try {
            await getStorage().removeItem(THEME_STORAGE_KEY);
        } catch (e) { console.log('Storage clear failed:', e); }
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        currentTheme = null;
        const $container = $('#st-phone-container');
        if ($container.length) {
            const root = $container[0];
            const props = ['--frame-color', '--frame-border', '--frame-thickness', '--frame-radius', '--frame-shadow', '--pt-bg-color', '--pt-text-color', '--pt-sub-text', '--pt-card-bg', '--pt-border', '--pt-accent', '--pt-font', '--msg-my-bubble', '--msg-my-text', '--msg-their-bubble', '--msg-their-text', '--msg-bubble-width', '--msg-bubble-radius', '--msg-font-size', '--msg-timestamp', '--msg-bg-image', '--msg-bg-color'];
            props.forEach(p => root.style.removeProperty(p));
            $('.st-phone-frame').css({ 'background': '', 'border': '', 'border-radius': '', 'box-shadow': '' });
            $('.st-phone-screen').css({ 'background': '', 'background-image': '', 'background-size': '', 'background-position': '' });
        }
        console.log('🗑️ Theme cleared completely');
    }

    return { init, open, applyTheme, getStoreInfo, getCurrentTheme, clearTheme };
})();