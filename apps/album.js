window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Album = (function () {
    'use strict';

    // ==========================================
    // [수정됨] 내부 DB 코드 삭제 -> 통합 저장소 사용
    // ==========================================

    // [Helper] 저장소 인스턴스 가져오기
    function getStorage() {
        if (window.STPhoneStorage) return window.STPhoneStorage;
        console.error('[Album] window.STPhoneStorage가 초기화되지 않았습니다.');
        return localforage; 
    }

    // ─────────────────────────────────────────────────────────
    // CSS/상수/상태
    // ─────────────────────────────────────────────────────────
    const css = `
        <style>
            .st-album-app {
                position: absolute; top: 0; left: 0;
                width: 100%; height: 100%; z-index: 999;
                display: flex; flex-direction: column;
                background: var(--pt-bg-color, #f5f5f7);
                color: var(--pt-text-color, #000);
                font-family: var(--pt-font, -apple-system, sans-serif);
                box-sizing: border-box;
            }
            
            .st-album-header {
                padding: 20px 20px 15px;
                font-size: 28px;
                font-weight: 700;
                flex-shrink: 0;
            }
            
            .st-album-grid {
                flex: 1;
                overflow-y: auto;
                padding: 0 8px 20px;
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                grid-auto-rows: min-content;
                gap: 3px;
                align-content: start;
            }
            
            .st-album-empty {
                grid-column: 1 / -1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 80px 20px;
                color: var(--pt-sub-text, #86868b);
            }
            .st-album-empty-icon {
                font-size: 36px;
                margin-bottom: 15px;
                opacity: 0.5;
            }
            
            .st-album-thumb {
                width: 100%;
                padding-bottom: 100%;
                background-size: cover;
                background-position: center;
                cursor: pointer;
                transition: opacity 0.2s;
                position: relative;
            }
            .st-album-thumb:hover {
                opacity: 0.8;
            }
            
            .st-album-viewer {
                position: absolute; top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.95);
                display: flex; flex-direction: column;
                z-index: 1000;
            }
            
            .st-album-viewer-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                color: white;
                flex-shrink: 0;
            }
            
            .st-album-viewer-close {
                font-size: 24px;
                cursor: pointer;
                padding: 5px 10px;
            }
            
            .st-album-viewer-actions {
                display: flex;
                gap: 10px;
            }
            
            .st-album-viewer-btn {
                background: rgba(255,255,255,0.15);
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 12px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .st-album-viewer-btn:hover {
                background: rgba(255,255,255,0.25);
            }
            .st-album-viewer-btn.delete {
                background: rgba(255,59,48,0.8);
            }
            .st-album-viewer-btn.delete:hover {
                background: rgba(255,59,48,1);
            }
            
            .st-album-viewer-image {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 10px;
                overflow: hidden;
            }
            .st-album-viewer-image img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border-radius: 10px;
            }
            
            .st-album-viewer-info {
                padding: 15px;
                color: #aaa;
                font-size: 12px;
                text-align: center;
                flex-shrink: 0;
            }
            .st-album-viewer-prompt {
                color: white;
                font-size: 14px;
                margin-bottom: 5px;
            }
        </style>
    `;

    let photos = []; // 메모리 캐시
    let loadedKey = null; // 현재 로드된 채팅방 키

    function getStorageKey() {
        const context = window.SillyTavern && window.SillyTavern.getContext
            ? window.SillyTavern.getContext()
            : null;

        if (!context || !context.chatId) {
            return null;
        }
        return 'st_phone_album_' + context.chatId;
    }

    // 현재 chatId의 앨범을 저장소에서 읽어와 메모리에 병합
    async function loadForCurrentChat() {
        const key = getStorageKey();
        if (!key) {
            photos = [];
            loadedKey = null;
            return;
        }
        if (loadedKey === key) return; // 이미 로드됨

        try {
            // [수정] 통합 저장소 사용
            let loaded = await getStorage().getItem(key);
            
            // 기존 데이터가 문자열(JSON)로 저장되어 있을 경우 호환성 처리
            if (typeof loaded === 'string') {
                try { loaded = JSON.parse(loaded); } catch(e) {}
            }
            
            const loadedArr = Array.isArray(loaded) ? loaded : [];

            // 메모리에 이미 추가된 항목과 병합 (중복 URL 제거)
            const map = new Map();
            for (const p of photos) map.set(p.url, p);
            for (const p of loadedArr) {
                if (!map.has(p.url)) map.set(p.url, p);
            }
            
            photos = Array.from(map.values());
            // 상한(50) 유지
            if (photos.length > 50) photos = photos.slice(0, 50);
            
            loadedKey = key;
        } catch (e) {
            console.warn('[Album] Failed to load from Storage:', e);
            photos = [];
            loadedKey = key;
        }
    }

    async function saveToStorage() {
        const key = getStorageKey();
        if (!key) return;
        try {
            // [수정] 통합 저장소 사용 (JSON.stringify 불필요)
            await getStorage().setItem(key, photos);
        } catch (e) {
            console.warn('[Album] Failed to save to Storage:', e);
        }
    }

    // ─────────────────────────────────────────────────────────
    // 앨범 UI/동작
    // ─────────────────────────────────────────────────────────

    async function open() {
        // 현재 채팅의 앨범 로드를 보장
        await loadForCurrentChat();

        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen || !$screen.length) return;
        $screen.empty();

        let gridContent = '';
        if (photos.length === 0) {
            gridContent = `
                <div class="st-album-empty">
                    <div class="st-album-empty-icon"><i class="fa-regular fa-image"></i></div>
                    <div>앨범이 비어있습니다</div>
                    <div style="font-size:12px;margin-top:5px;">카메라로 사진을 찍어보세요</div>
                </div>
            `;
        } else {
            photos.forEach((photo, index) => {
                gridContent += `
                    <div class="st-album-thumb" 
                         data-index="${index}" 
                         style="background-image: url('${photo.url}');"
                         title="${photo.prompt || ''}">
                    </div>
                `;
            });
        }

        const html = `
            ${css}
            <div class="st-album-app">
                <div class="st-album-header">앨범</div>
                <div class="st-album-grid">
                    ${gridContent}
                </div>
            </div>
        `;

        $screen.append(html);
        attachListeners();
    }

    function attachListeners() {
        $('.st-album-thumb').off('click').on('click', function () {
            const index = parseInt($(this).data('index'));
            openViewer(index);
        });
    }

    function openViewer(index) {
        const photo = photos[index];
        if (!photo) return;

        const date = new Date(photo.timestamp);
        const dateStr =
            `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.` +
            `${String(date.getDate()).padStart(2, '0')} ` +
            `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

        const viewerHtml = `
            <div class="st-album-viewer" id="st-album-viewer">
                <div class="st-album-viewer-header">
                    <div class="st-album-viewer-close" id="st-viewer-close">✕</div>
                    <div class="st-album-viewer-actions">
                        <button class="st-album-viewer-btn" id="st-viewer-phone-bg">
                            <i class="fa-solid fa-mobile-screen"></i> 폰 배경
                        </button>
                        <button class="st-album-viewer-btn delete" id="st-viewer-delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="st-album-viewer-image">
                    ${photo.url.startsWith('<img') ? photo.url : `<img src="${photo.url}">`}
                </div>
                <div class="st-album-viewer-info">
                    <div class="st-album-viewer-prompt">${photo.prompt || '(설명 없음)'}</div>
                    <div>${dateStr}</div>
                </div>
            </div>
        `;

        $('.st-album-app').append(viewerHtml);

        $('#st-viewer-close').on('click', function () {
            $('#st-album-viewer').remove();
        });

        $('#st-viewer-phone-bg').on('click', function () {
            const bgUrl = photo.url.startsWith('<img') ? $(photo.url).attr('src') : photo.url;
            $('.st-phone-screen').css({
                background: `url("${bgUrl}")`,
                'background-size': 'cover',
                'background-position': 'center',
            });
            // 설정에도 저장하려면 Settings.updateSetting 호출 필요 (선택사항)
            toastr.success('📱 폰 배경화면으로 설정되었습니다!');
        });

        $('#st-viewer-delete').on('click', function () {
            if (confirm('이 사진을 삭제하시겠습니까?')) {
                deletePhoto(index);
                $('#st-album-viewer').remove();
                // 현재 화면 갱신
                open();
                toastr.info('사진이 삭제되었습니다.');
            }
        });
    }

    // ─────────────────────────────────────────────────────────
    // 데이터 조작 API
    // ─────────────────────────────────────────────────────────
    function addPhoto(photoData) {
        const key = getStorageKey();

        // 채팅이 바뀐 직후 호출되는 경우를 대비
        if (loadedKey !== key) {
            loadedKey = key;
            photos = [];
            // 백그라운드에서 로드 시도
            loadForCurrentChat().catch(() => {});
        }

        // 중복 URL 방지
        const exists = photos.some((p) => p.url === photoData.url);
        if (exists) return false;

        photos.unshift(photoData);

        // 상한 유지
        if (photos.length > 50) {
            photos = photos.slice(0, 50);
        }

        // 백그라운드 저장
        saveToStorage();
        return true;
    }

    function deletePhoto(index) {
        if (index >= 0 && index < photos.length) {
            photos.splice(index, 1);
            saveToStorage(); // 백그라운드 저장
            return true;
        }
        return false;
    }

    function getPhotoCount() {
        return photos.length;
    }

    // 모듈 초기화: 현재 컨텍스트 키 기반 로드 시도(비동기)
    (async () => {
        try {
            await loadForCurrentChat();
        } catch (e) {
            console.warn('[Album] initial load failed:', e);
        }
    })();

    return {
        open,
        addPhoto,
        deletePhoto,
        getPhotoCount,
    };
})();