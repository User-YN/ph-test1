window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Calendar = (function() {
    'use strict';

    // ==========================================
    // [수정됨] 내부 DB 코드 삭제 -> 통합 저장소 사용
    // ==========================================
    
    // [Helper] 저장소 인스턴스 가져오기
    function getStorage() {
        if (window.STPhoneStorage) return window.STPhoneStorage;
        console.error('[Calendar] window.STPhoneStorage가 초기화되지 않았습니다.');
        return localforage; 
    }

    const css = `<style> .st-calendar-app { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 999; display: flex; flex-direction: column; background: var(--pt-bg-color, #f5f5f7); color: var(--pt-text-color, #000); font-family: var(--pt-font, -apple-system, sans-serif); box-sizing: border-box; } .st-calendar-header { padding: 20px 20px 15px; flex-shrink: 0; border-bottom: 1px solid var(--pt-border, #e5e5e5); } .st-calendar-title { font-size: 24px; font-weight: 700; margin-bottom: 3px; } .st-calendar-rp-date-display { font-size: 14px; color: var(--pt-accent, #007aff); font-weight: 500; } .st-calendar-rp-date-display.no-date { color: var(--pt-sub-text, #86868b); font-style: italic; } .st-calendar-toggle-section { padding: 14px 20px; border-bottom: 1px solid var(--pt-border, #e5e5e5); display: flex; align-items: center; justify-content: space-between; background: var(--pt-card-bg, #fff); } .st-calendar-toggle-info { flex: 1; } .st-calendar-toggle-label { font-size: 14px; font-weight: 500; } .st-calendar-toggle-desc { font-size: 11px; color: var(--pt-sub-text, #86868b); margin-top: 2px; } .st-calendar-toggle { position: relative; width: 51px; height: 31px; background: #e9e9eb; border-radius: 15.5px; cursor: pointer; transition: background 0.3s; flex-shrink: 0; } .st-calendar-toggle.active { background: var(--pt-accent, #007aff); } .st-calendar-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; background: white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.3s; } .st-calendar-toggle.active::after { transform: translateX(20px); } .st-calendar-nav { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: var(--pt-card-bg, #fff); } .st-calendar-nav-btn { background: none; border: none; font-size: 20px; color: var(--pt-accent, #007aff); cursor: pointer; padding: 5px 10px; } .st-calendar-nav-title { font-size: 17px; font-weight: 600; } .st-calendar-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); padding: 8px 10px; background: var(--pt-card-bg, #fff); border-bottom: 1px solid var(--pt-border, #e5e5e5); } .st-calendar-weekday { text-align: center; font-size: 11px; font-weight: 600; color: var(--pt-sub-text, #86868b); } .st-calendar-weekday:first-child { color: #ff3b30; } .st-calendar-weekday:last-child { color: #007aff; } .st-calendar-days { display: grid; grid-template-columns: repeat(7, 1fr); padding: 5px 10px 10px; background: var(--pt-card-bg, #fff); gap: 2px; } .st-calendar-day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; border-radius: 50%; position: relative; transition: background 0.2s; } .st-calendar-day:hover { background: rgba(0,0,0,0.05); } .st-calendar-day.empty { cursor: default; } .st-calendar-day.empty:hover { background: transparent; } .st-calendar-day.sunday { color: #ff3b30; } .st-calendar-day.saturday { color: #007aff; } .st-calendar-day.today { background: var(--pt-accent, #007aff); color: white !important; font-weight: 600; } .st-calendar-day.has-event::after { content: ''; position: absolute; bottom: 4px; width: 5px; height: 5px; background: #ff3b30; border-radius: 50%; } .st-calendar-day.today.has-event::after { background: white; } .st-calendar-day.other-month { color: var(--pt-sub-text, #ccc); opacity: 0.4; } .st-calendar-events-section { flex: 1; overflow-y: auto; padding: 15px; } .st-calendar-section-title { font-size: 16px; font-weight: 600; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; } .st-calendar-add-btn { background: var(--pt-accent, #007aff); color: white; border: none; width: 26px; height: 26px; border-radius: 50%; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; } .st-calendar-events-list { display: flex; flex-direction: column; gap: 8px; } .st-calendar-event-item { background: var(--pt-card-bg, #fff); border-radius: 10px; padding: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); display: flex; align-items: center; gap: 10px; } .st-calendar-event-date-box { width: 44px; height: 44px; border-radius: 10px; background: #e74c3c; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; flex-shrink: 0; } .st-calendar-event-date-box .month { font-size: 10px; font-weight: 500; opacity: 0.9; } .st-calendar-event-date-box .day { font-size: 18px; font-weight: 700; line-height: 1; } .st-calendar-event-info { flex: 1; min-width: 0; } .st-calendar-event-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .st-calendar-event-meta { font-size: 12px; color: var(--pt-sub-text, #86868b); } .st-calendar-event-dday { font-size: 13px; font-weight: 600; color: var(--pt-accent, #007aff); } .st-calendar-event-dday.today { color: #ff3b30; } .st-calendar-event-dday.past { color: var(--pt-sub-text, #86868b); } .st-calendar-event-delete { background: none; border: none; color: #ff3b30; font-size: 16px; cursor: pointer; padding: 5px; opacity: 0.5; transition: opacity 0.2s; } .st-calendar-event-delete:hover { opacity: 1; } .st-calendar-empty { text-align: center; padding: 30px 20px; color: var(--pt-sub-text, #86868b); } .st-calendar-empty-icon { font-size: 36px; margin-bottom: 8px; opacity: 0.5; } .st-calendar-modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1002; } .st-calendar-modal-content { background: var(--pt-card-bg, #fff); border-radius: 14px; padding: 20px; width: 280px; max-width: 90%; } .st-calendar-modal-title { font-size: 17px; font-weight: 600; margin-bottom: 15px; text-align: center; } .st-calendar-modal-input { width: 100%; padding: 12px; border: 1px solid var(--pt-border, #e5e5e5); border-radius: 10px; font-size: 15px; margin-bottom: 10px; box-sizing: border-box; background: var(--pt-bg-color, #f5f5f7); color: var(--pt-text-color, #000); } .st-calendar-modal-row { display: flex; gap: 8px; margin-bottom: 10px; } .st-calendar-modal-select { flex: 1; padding: 12px 8px; border: 1px solid var(--pt-border, #e5e5e5); border-radius: 10px; font-size: 14px; background: var(--pt-bg-color, #f5f5f7); color: var(--pt-text-color, #000); } .st-calendar-modal-checkbox { display: flex; align-items: center; gap: 8px; margin-bottom: 15px; font-size: 14px; } .st-calendar-modal-checkbox input { width: 18px; height: 18px; } .st-calendar-modal-buttons { display: flex; gap: 10px; } .st-calendar-modal-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; } .st-calendar-modal-btn.cancel { background: var(--pt-border, #e5e5e5); color: var(--pt-text-color, #000); } .st-calendar-modal-btn.confirm { background: var(--pt-accent, #007aff); color: white; } .st-calendar-selected-date { background: var(--pt-card-bg, #fff); padding: 10px 15px; border-bottom: 1px solid var(--pt-border, #e5e5e5); font-size: 13px; color: var(--pt-sub-text, #86868b); } </style>`;

    const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

    // 메모리 캐시 (동기적 Getter 지원용)
    let events = [];
    let isEnabled = true;
    let rpDate = null;
    let viewYear = null;
    let viewMonth = null;

    // ========== 저장/불러오기 ==========
    function getStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        return 'st_phone_calendar_' + context.chatId;
    }

    // [Async]
    async function loadData() {
        const key = getStorageKey();
        if (!key) {
            events = []; isEnabled = true; rpDate = null;
            initViewDate();
            return;
        }
        try {
            // [수정] 통합 저장소 사용
            const data = await getStorage().getItem(key);
            if (data) {
                events = data.events || [];
                isEnabled = data.isEnabled !== false;
                rpDate = data.rpDate || null;
            } else {
                events = []; isEnabled = true; rpDate = null;
            }
        } catch (e) {
            events = []; isEnabled = true; rpDate = null;
        }
        initViewDate();
    }

    function initViewDate() {
        if (viewYear === null || viewMonth === null) {
            if (rpDate) {
                viewYear = rpDate.year;
                viewMonth = rpDate.month;
            } else {
                const today = new Date();
                viewYear = today.getFullYear();
                viewMonth = today.getMonth() + 1;
            }
        }
    }

    // [Async]
    async function saveData() {
        const key = getStorageKey();
        if (!key) return;
        try {
            // [수정] 통합 저장소 사용
            await getStorage().setItem(key, { events, isEnabled, rpDate });
        } catch (e) { console.error('[Calendar] 저장 실패:', e); }
    }

    // ========== 날짜 유틸 함수 ==========
    function getDaysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
    function getFirstDayOfMonth(year, month) { return new Date(year, month - 1, 1).getDay(); }
    
    function getDDay(event) {
        if (!rpDate) return { text: '-', class: '' };
        const rpDateObj = new Date(rpDate.year, rpDate.month - 1, rpDate.day);
        let eventDateObj;
        if (event.year) {
            eventDateObj = new Date(event.year, event.month - 1, event.day);
        } else {
            eventDateObj = new Date(rpDate.year, event.month - 1, event.day);
            if (eventDateObj < rpDateObj) eventDateObj = new Date(rpDate.year + 1, event.month - 1, event.day);
        }
        const diffTime = eventDateObj - rpDateObj;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return { text: 'D-Day', class: 'today' };
        if (diffDays < 0) return { text: `D+${Math.abs(diffDays)}`, class: 'past' };
        return { text: `D-${diffDays}`, class: '' };
    }

    function sortEventsByDDay(eventsList) {
        if (!rpDate) return eventsList;
        const rpDateObj = new Date(rpDate.year, rpDate.month - 1, rpDate.day);
        return eventsList.slice().sort((a, b) => {
            let dateA, dateB;
            if (a.year) dateA = new Date(a.year, a.month - 1, a.day);
            else {
                dateA = new Date(rpDate.year, a.month - 1, a.day);
                if (dateA < rpDateObj) dateA = new Date(rpDate.year + 1, a.month - 1, a.day);
            }
            if (b.year) dateB = new Date(b.year, b.month - 1, b.day);
            else {
                dateB = new Date(rpDate.year, b.month - 1, b.day);
                if (dateB < rpDateObj) dateB = new Date(rpDate.year + 1, b.month - 1, b.day);
            }
            return dateA - dateB;
        });
    }

    function hasEventOnDay(year, month, day) {
        return events.some(ev => {
            if (ev.year) return ev.year === year && ev.month === month && ev.day === day;
            else return ev.month === month && ev.day === day;
        });
    }

    function isRpToday(year, month, day) {
        if (!rpDate) return false;
        return rpDate.year === year && rpDate.month === month && rpDate.day === day;
    }

    // ========== 프롬프트 생성 (동기) ==========
    function generatePrompt() {
        if (!isEnabled) return null;
        let prompt = `[System: 날짜/시간 표시 지시]\n캐릭터의 다음 응답 맨 처음에 반드시 현재 RP상 날짜와 요일을 아래 형식으로 작성하세요:\n[YYYY년 M월 D일 요일]\n\n예시:\n[2024년 3월 15일 금요일]\n\n중요:\n- 날짜는 이전 대화의 맥락과 흐름에 맞게 설정하세요\n- 이전에 언급된 날짜가 있다면 그것을 기준으로 시간 경과를 반영하세요\n- 대괄호 [] 형식을 반드시 지켜주세요\n- 날짜 출력 후 바로 캐릭터 답변을 이어서 작성하세요`;
        if (events.length > 0 && rpDate) {
            const sortedEvents = sortEventsByDDay(events);
            const upcomingEvents = sortedEvents.filter(ev => {
                const dday = getDDay(ev);
                return dday.class !== 'past';
            }).slice(0, 5);

            if (upcomingEvents.length > 0) {
                prompt += `\n\n[참고: 다가오는 기념일/이벤트]`;
                upcomingEvents.forEach(ev => {
                    const dday = getDDay(ev);
                    const yearStr = ev.year ? `${ev.year}년 ` : '매년 ';
                    prompt += `\n- ${yearStr}${ev.month}월 ${ev.day}일: ${ev.title} (${dday.text})`;
                });
                prompt += `\n\n위 기념일들은 캐릭터의 성격에 따라 캐릭터가 기억할수도, 하지 못할수도 있습니다.`;
            }
        }
        return prompt;
    }

    function getEventsOnlyPrompt() {
        if (!isEnabled) return null;
        if (events.length === 0 || !rpDate) return null;
        const sortedEvents = sortEventsByDDay(events);
        const upcomingEvents = sortedEvents.filter(ev => {
            const dday = getDDay(ev);
            return dday.class !== 'past';
        }).slice(0, 5);
        if (upcomingEvents.length === 0) return null;
        let prompt = `[참고: 다가오는 기념일/이벤트]`;
        upcomingEvents.forEach(ev => {
            const dday = getDDay(ev);
            const yearStr = ev.year ? `${ev.year}년 ` : '매년 ';
            prompt += `\n- ${yearStr}${ev.month}월 ${ev.day}일: ${ev.title} (${dday.text})`;
        });
        prompt += `\n\n위 기념일들은 캐릭터의 성격에 따라 캐릭터가 기억할수도, 하지 못할수도 있습니다. (또한 날짜 형식 출력 하지 마세요)`;
        return prompt;
    }

    function extractDateFromResponse(text) {
        const dateRegex = /\[(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)\]/;
        const match = text.match(dateRegex);
        if (match) {
            return { year: parseInt(match[1]), month: parseInt(match[2]), day: parseInt(match[3]), dayOfWeek: match[4], fullMatch: match[0] };
        }
        return null;
    }

    function renderCalendarGrid() {
        const daysInMonth = getDaysInMonth(viewYear, viewMonth);
        const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
        const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
        const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
        const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
        let daysHtml = '';
        for (let i = 0; i < firstDay; i++) {
            const day = daysInPrevMonth - firstDay + 1 + i;
            daysHtml += `<div class="st-calendar-day empty other-month">${day}</div>`;
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = isRpToday(viewYear, viewMonth, day);
            const hasEvent = hasEventOnDay(viewYear, viewMonth, day);
            const dayOfWeek = new Date(viewYear, viewMonth - 1, day).getDay();
            let classes = 'st-calendar-day';
            if (isToday) classes += ' today';
            if (hasEvent) classes += ' has-event';
            if (dayOfWeek === 0) classes += ' sunday';
            if (dayOfWeek === 6) classes += ' saturday';
            daysHtml += `<div class="${classes}" data-year="${viewYear}" data-month="${viewMonth}" data-day="${day}">${day}</div>`;
        }
        const totalCells = firstDay + daysInMonth;
        const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let i = 1; i <= remainingCells; i++) {
            daysHtml += `<div class="st-calendar-day empty other-month">${i}</div>`;
        }
        return daysHtml;
    }

    // [Async]
    async function open() {
        await loadData();
        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen || !$screen.length) return;
        $screen.empty();

        let rpDateStr = '';
        let rpDateClass = '';
        if (rpDate) rpDateStr = `📖 ${rpDate.year}년 ${rpDate.month}월 ${rpDate.day}일 ${rpDate.dayOfWeek}`;
        else { rpDateStr = '📖 채팅하면 날짜가 동기화됩니다'; rpDateClass = 'no-date'; }

        let eventsHtml = '';
        if (events.length === 0) {
            eventsHtml = `<div class="st-calendar-empty"><div class="st-calendar-empty-icon">🎉</div><div>등록된 기념일이 없습니다</div><div style="font-size:11px;margin-top:3px;">날짜를 클릭하거나 + 버튼으로 추가</div></div>`;
        } else {
            const sortedEvents = sortEventsByDDay(events);
            eventsHtml = sortedEvents.map(ev => {
                const dday = getDDay(ev);
                const yearStr = ev.year ? `${ev.year}년` : '매년';
                return `<div class="st-calendar-event-item"><div class="st-calendar-event-date-box"><span class="month">${ev.month}월</span><span class="day">${ev.day}</span></div><div class="st-calendar-event-info"><div class="st-calendar-event-title">${ev.title}</div><div class="st-calendar-event-meta">${yearStr}</div></div><div class="st-calendar-event-dday ${dday.class}">${dday.text}</div><button class="st-calendar-event-delete" data-id="${ev.id}">×</button></div>`;
            }).join('');
        }

        const html = `
            ${css}
            <div class="st-calendar-app">
                <div class="st-calendar-header">
                    <div class="st-calendar-title">📅 캘린더</div>
                    <div class="st-calendar-rp-date-display ${rpDateClass}">${rpDateStr}</div>
                </div>
                <div class="st-calendar-toggle-section">
                    <div class="st-calendar-toggle-info">
                        <div class="st-calendar-toggle-label">날짜 프롬프트 활성화</div>
                        <div class="st-calendar-toggle-desc">AI 응답에 날짜 표시 요청</div>
                    </div>
                    <div class="st-calendar-toggle ${isEnabled ? 'active' : ''}" id="st-calendar-toggle"></div>
                </div>
                <div class="st-calendar-nav">
                    <button class="st-calendar-nav-btn" id="st-cal-prev">‹</button>
                    <div class="st-calendar-nav-title" id="st-cal-nav-title">${viewYear}년 ${viewMonth}월</div>
                    <button class="st-calendar-nav-btn" id="st-cal-next">›</button>
                </div>
                <div class="st-calendar-weekdays">
                    ${WEEKDAY_NAMES.map((d, i) => `<div class="st-calendar-weekday">${d}</div>`).join('')}
                </div>
                <div class="st-calendar-days" id="st-calendar-days">
                    ${renderCalendarGrid()}
                </div>
                <div class="st-calendar-events-section">
                    <div class="st-calendar-section-title">
                        <span>🎉 기념일</span>
                        <button class="st-calendar-add-btn" id="st-calendar-add">+</button>
                    </div>
                    <div class="st-calendar-events-list" id="st-calendar-events-list">
                        ${eventsHtml}
                    </div>
                </div>
            </div>
        `;
        $screen.append(html);
        attachListeners();
    }

    function attachListeners() {
        $('#st-calendar-toggle').on('click', async function() {
            isEnabled = !isEnabled;
            $(this).toggleClass('active', isEnabled);
            await saveData();
            toastr.info(isEnabled ? '📅 날짜 프롬프트 ON' : '📅 날짜 프롬프트 OFF');
        });
        $('#st-cal-prev').on('click', function() {
            viewMonth--;
            if (viewMonth < 1) { viewMonth = 12; viewYear--; }
            updateCalendarView();
        });
        $('#st-cal-next').on('click', function() {
            viewMonth++;
            if (viewMonth > 12) { viewMonth = 1; viewYear++; }
            updateCalendarView();
        });
        $(document).off('click', '.st-calendar-day:not(.empty)').on('click', '.st-calendar-day:not(.empty)', function() {
            const year = $(this).data('year');
            const month = $(this).data('month');
            const day = $(this).data('day');
            showAddModal(year, month, day);
        });
        $('#st-calendar-add').on('click', function() { showAddModal(viewYear, viewMonth, 1); });
        $('.st-calendar-event-delete').on('click', async function(e) {
            e.stopPropagation();
            const id = $(this).data('id');
            await deleteEvent(id);
        });
    }

    function updateCalendarView() {
        $('#st-cal-nav-title').text(`${viewYear}년 ${viewMonth}월`);
        $('#st-calendar-days').html(renderCalendarGrid());
    }

    function showAddModal(year, month, day) {
        const currentViewYear = year || viewYear;
        const yearOptions = [];
        for (let y = currentViewYear - 10; y <= currentViewYear + 10; y++) {
            yearOptions.push(`<option value="${y}" ${y === currentViewYear ? 'selected' : ''}>${y}년</option>`);
        }
        const monthOptions = Array.from({length: 12}, (_, i) => `<option value="${i + 1}" ${(i + 1) === month ? 'selected' : ''}>${i + 1}월</option>`).join('');
        const dayOptions = Array.from({length: 31}, (_, i) => `<option value="${i + 1}" ${(i + 1) === day ? 'selected' : ''}>${i + 1}일</option>`).join('');

        const modalHtml = `
            <div class="st-calendar-modal" id="st-calendar-modal">
                <div class="st-calendar-modal-content">
                    <div class="st-calendar-modal-title">🎉 기념일 추가</div>
                    <input type="text" class="st-calendar-modal-input" id="st-event-title" placeholder="기념일 이름 (예: 결혼기념일)">
                    <div class="st-calendar-modal-checkbox">
                        <input type="checkbox" id="st-event-has-year">
                        <label for="st-event-has-year">특정 년도 지정 (체크 해제 시 매년 반복)</label>
                    </div>
                    <div class="st-calendar-modal-row">
                        <select class="st-calendar-modal-select" id="st-event-year" disabled style="opacity:0.5;">${yearOptions.join('')}</select>
                        <select class="st-calendar-modal-select" id="st-event-month">${monthOptions}</select>
                        <select class="st-calendar-modal-select" id="st-event-day">${dayOptions}</select>
                    </div>
                    <div class="st-calendar-modal-buttons">
                        <button class="st-calendar-modal-btn cancel" id="st-event-cancel">취소</button>
                        <button class="st-calendar-modal-btn confirm" id="st-event-confirm">추가</button>
                    </div>
                </div>
            </div>`;
        $('.st-calendar-app').append(modalHtml);
        $('#st-event-has-year').on('change', function() {
            const checked = $(this).is(':checked');
            $('#st-event-year').prop('disabled', !checked).css('opacity', checked ? 1 : 0.5);
        });
        $('#st-event-cancel').on('click', () => { $('#st-calendar-modal').remove(); });
        $('#st-calendar-modal').on('click', function(e) { if (e.target === this) $(this).remove(); });
        $('#st-event-confirm').on('click', async () => {
            const title = $('#st-event-title').val().trim();
            const hasYear = $('#st-event-has-year').is(':checked');
            const eventYear = hasYear ? parseInt($('#st-event-year').val()) : null;
            const eventMonth = parseInt($('#st-event-month').val());
            const eventDay = parseInt($('#st-event-day').val());
            if (!title) { toastr.warning('기념일 이름을 입력하세요'); return; }
            await addEvent(title, eventYear, eventMonth, eventDay);
            $('#st-calendar-modal').remove();
            open();
        });
        setTimeout(() => $('#st-event-title').focus(), 100);
    }

    // [Async]
    async function addEvent(title, year, month, day) {
        await loadData();
        events.push({ id: Date.now(), title, year, month, day });
        await saveData();
        toastr.success(`🎉 "${title}" 추가됨`);
    }

    // [Async]
    async function deleteEvent(id) {
        await loadData();
        const idx = events.findIndex(e => e.id === id);
        if (idx > -1) {
            const deleted = events.splice(idx, 1)[0];
            await saveData();
            toastr.info(`🗑️ "${deleted.title}" 삭제됨`);
            open();
        }
    }

    // [Async]
    async function updateRpDate(dateInfo) {
        await loadData();
        const oldDate = rpDate;
        rpDate = dateInfo;
        if (rpDate) { viewYear = rpDate.year; viewMonth = rpDate.month; }
        await saveData();

        if (dateInfo && (!oldDate || oldDate.day !== dateInfo.day || oldDate.month !== dateInfo.month || oldDate.year !== dateInfo.year)) {
            try {
                const Store = window.STPhone?.Apps?.Store;
                if (Store && Store.isInstalled('bank')) {
                    const Bank = window.STPhone?.Apps?.Bank;
                    if (Bank && typeof Bank.processRecurringOnDateChange === 'function') {
                        Bank.processRecurringOnDateChange(dateInfo);
                    }
                }
            } catch (e) { console.warn('[Calendar] Bank recurring processing failed:', e); }
        }
    }

    function isCalendarEnabled() { return isEnabled; }
    function getPrompt() { return generatePrompt(); }

    function processAiResponse(text) {
        try {
            if (!text || typeof text !== 'string') return text;
            const dateInfo = extractDateFromResponse(text);
            if (dateInfo) {
                // updateRpDate는 async이지만, 응답 처리 파이프라인에서는 비동기를 기다리지 않고 텍스트만 먼저 정리해서 반환
                // 데이터 저장은 백그라운드에서 실행됨
                updateRpDate(dateInfo);
                return text.replace(dateInfo.fullMatch, '').trim();
            }
            return text;
        } catch (e) {
            console.error('[Calendar] processAiResponse 에러:', e);
            return text;
        }
    }

    function getRpDate() { return rpDate; }

    // 초기화: 스크립트 로드 시 데이터 한 번 로드
    loadData();

    return {
        open,
        isCalendarEnabled,
        getPrompt,
        getEventsOnlyPrompt,
        processAiResponse,
        getRpDate,
        updateRpDate
    };
})();