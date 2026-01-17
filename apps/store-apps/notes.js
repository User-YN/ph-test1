window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Notes = (function() {
    'use strict';

    // ==========================================
    // [수정됨] 내부 DB 코드 삭제 -> 통합 저장소 사용
    // ==========================================
    
    // [Helper] 저장소 인스턴스 가져오기
    function getStorage() {
        if (window.STPhoneStorage) return window.STPhoneStorage;
        console.error('[Notes] window.STPhoneStorage가 초기화되지 않았습니다.');
        return localforage; 
    }

    const css = `<style> .st-notes-app { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 999; display: flex; flex-direction: column; background: var(--pt-bg-color, #f5f5f7); color: var(--pt-text-color, #000); font-family: var(--pt-font, -apple-system, sans-serif); } .st-notes-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 15px; flex-shrink: 0; } .st-notes-title { font-size: 28px; font-weight: 700; } .st-notes-add { background: var(--pt-accent, #007aff); color: white; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; } .st-notes-list { flex: 1; overflow-y: auto; padding: 10px 20px 80px; } .st-note-item { background: var(--pt-card-bg, #fff); border-radius: 12px; padding: 15px; margin-bottom: 10px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.04); } .st-note-item-title { font-weight: 600; font-size: 16px; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .st-note-item-preview { font-size: 14px; color: var(--pt-sub-text, #86868b); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .st-note-item-date { font-size: 12px; color: var(--pt-sub-text, #86868b); margin-top: 8px; } .st-notes-empty { text-align: center; padding: 80px 24px; color: var(--pt-sub-text, #86868b); } .st-note-edit { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--pt-bg-color, #f5f5f7); display: flex; flex-direction: column; z-index: 1001; } .st-note-edit-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid var(--pt-border, #e5e5e5); flex-shrink: 0; } .st-note-edit-btn { background: none; border: none; color: var(--pt-accent, #007aff); font-size: 16px; cursor: pointer; } .st-note-edit-btn.delete { color: #ff3b30; } .st-note-edit-content { flex: 1; display: flex; flex-direction: column; padding: 15px; overflow: hidden; } .st-note-edit-title { border: none; background: transparent; font-size: 24px; font-weight: 600; color: var(--pt-text-color, #000); margin-bottom: 15px; outline: none; } .st-note-edit-body { flex: 1; border: 1px solid var(--pt-border, #e5e5e5); background: var(--pt-card-bg, #f5f5f7); font-size: 14px; color: var(--pt-text-color, #000); resize: none; outline: none; line-height: 1.6; border-radius: 12px; padding: 14px 16px; } </style>`;

    let notes = [];

    function getStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        return 'st_phone_notes_' + context.chatId;
    }

    // [Async]
    async function loadNotes() {
        const key = getStorageKey();
        if (!key) { notes = []; return; }
        try {
            // [수정됨] 통합 저장소 사용
            notes = (await getStorage().getItem(key)) || [];
        } catch (e) { notes = []; }
    }

    // [Async]
    async function saveNotes() {
        const key = getStorageKey();
        if (!key) return;
        // [수정됨] 통합 저장소 사용
        await getStorage().setItem(key, notes);
    }

    // [Async]
    async function open() {
        await loadNotes();
        
        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen || !$screen.length) return;
        $screen.empty();

        let listHtml = '';
        if (notes.length === 0) {
            listHtml = `<div class="st-notes-empty"><div style="font-size:36px;opacity:0.5;margin-bottom:15px;"><i class="fa-regular fa-note-sticky"></i></div><div>메모가 없습니다</div><div style="font-size:13px;margin-top:5px;">+ 버튼을 눌러 새 메모를 작성하세요</div></div>`;
        } else {
            notes.forEach((note, index) => {
                const date = new Date(note.updatedAt);
                const dateStr = `${date.getMonth()+1}월 ${date.getDate()}일`;
                listHtml += `<div class="st-note-item" data-index="${index}"><div class="st-note-item-title">${note.title || '새 메모'}</div><div class="st-note-item-preview">${note.body || '내용 없음'}</div><div class="st-note-item-date">${dateStr}</div></div>`;
            });
        }

        const html = `
            ${css}
            <div class="st-notes-app">
                <div class="st-notes-header">
                    <div class="st-notes-title">메모</div>
                    <button class="st-notes-add" id="st-notes-add">+</button>
                </div>
                <div class="st-notes-list">${listHtml}</div>
            </div>
        `;

        $screen.append(html);

        $('#st-notes-add').on('click', () => openEditor(null));
        $('.st-note-item').on('click', function() {
            openEditor($(this).data('index'));
        });
    }

    function openEditor(index) {
        const note = index !== null ? notes[index] : { title: '', body: '', createdAt: Date.now(), updatedAt: Date.now() };
        const isNew = index === null;

        const html = `
            <div class="st-note-edit" id="st-note-edit">
                <div class="st-note-edit-header">
                    <button class="st-note-edit-btn" id="st-note-back">‹ 완료</button>
                    ${!isNew ? '<button class="st-note-edit-btn delete" id="st-note-delete">삭제</button>' : '<span></span>'}
                </div>
                <div class="st-note-edit-content">
                    <input type="text" class="st-note-edit-title" id="st-note-title" placeholder="제목" value="${note.title || ''}">
                    <textarea class="st-note-edit-body" id="st-note-body" placeholder="메모를 입력하세요...">${note.body || ''}</textarea>
                </div>
            </div>
        `;

        $('.st-notes-app').append(html);

        $('#st-note-back').on('click', async () => {
            const title = $('#st-note-title').val().trim();
            const body = $('#st-note-body').val().trim();

            if (title || body) {
                if (isNew) {
                    notes.unshift({ title, body, createdAt: Date.now(), updatedAt: Date.now() });
                } else {
                    notes[index] = { ...notes[index], title, body, updatedAt: Date.now() };
                }
                await saveNotes();
            }
            $('#st-note-edit').remove();
            open();
        });

        $('#st-note-delete').on('click', async () => {
            if (confirm('이 메모를 삭제하시겠습니까?')) {
                notes.splice(index, 1);
                await saveNotes();
                $('#st-note-edit').remove();
                open();
            }
        });
    }

    return { open };
})();