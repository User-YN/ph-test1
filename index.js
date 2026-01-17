(function () {
  'use strict';

  const EXTENSION_NAME = 'ST Phone System';
  const EXTENSION_FOLDER = 'st-phone-system';
  const BASE_PATH = `/scripts/extensions/third-party/${EXTENSION_FOLDER}`;

  // ─────────────────────────────────────────────────────────────────────────────
  // IndexedDB(idb) 로더 + 간단 KV 래퍼 + 마이그레이션
  // ─────────────────────────────────────────────────────────────────────────────

  // 외부 스크립트 로더 (UMD)
  function loadExternalScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
  }

  // idb 기반 KV 스토리지
  const IDB = {
    db: null,
    async init() {
      if (!window.idb) {
        // idb UMD 로드(전역 idb로 노출)  [1](https://github.com/jakearchibald/idb)
        await loadExternalScript('https://cdn.jsdelivr.net/npm/idb@8/build/umd.js');
      }
      this.db = await window.idb.openDB('stPhoneDB', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('kv')) {
            db.createObjectStore('kv', { keyPath: 'k' }); // { k, v } 형태
          }
        },
      });
    },
    async get(k) {
      const row = await this.db.get('kv', k);
      return row ? row.v ?? null : null;
    },
    async set(k, v) {
      return this.db.put('kv', { k, v });
    },
    async del(k) {
      return this.db.delete('kv', k);
    },
    async has(k) {
      return (await this.get(k)) !== null;
    },
  };

  // 최초 1회: localStorage → IndexedDB 마이그레이션
  async function migrateLocalStorageToIDB(prefix = 'st_phone_') {
    try {
      const flagKey = '__migrated_localstorage__';
      const done = await IDB.get(flagKey);
      if (done === '1') return;

      // localStorage의 st_phone_* 키 모두 스캔하여 IDB로 복사  [2](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        const val = localStorage.getItem(key);
        if (val != null && !(await IDB.has(key))) {
          await IDB.set(key, val);
        }
      }
      await IDB.set(flagKey, '1');
      console.log(`[${EXTENSION_NAME}] Migrated st_phone_* keys from localStorage to IndexedDB`);
    } catch (e) {
      console.warn(`[${EXTENSION_NAME}] localStorage→IDB migration failed:`, e);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 기존 코드
  // ─────────────────────────────────────────────────────────────────────────────

  // 타임스탬프 기능용 상태 추적
  let lastMessageWasHiddenLog = false; // 마지막 메시지가 히든로그였는지
  let needsTimestampOnNextPhoneMsg = false; // 다음 폰 메시지에 타임스탬프 필요한지

  function loadModule(fileName) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${BASE_PATH}/${fileName}`;
      script.onload = () => {
        console.log(`[${EXTENSION_NAME}] Loaded: ${fileName}`);
        resolve();
      };
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  }

  async function initialize() {
    console.log(`🚀 [${EXTENSION_NAME}] Starting initialization...`);

    try {
      // [0] IndexedDB 초기화 + 1회 마이그레이션 (모듈 로드보다 먼저)
      await IDB.init();
      await migrateLocalStorageToIDB('st_phone_');

      // 1. Core 모듈 로드
      await loadModule('utils.js');

      // 2. Feature 모듈 로드
      await loadModule('ui.js');
      await loadModule('inputs.js');

      // 3. 기본 Apps 모듈 로드 (apps 폴더 내 파일들)
      await loadModule('apps/settings.js');
      await loadModule('apps/camera.js');
      await loadModule('apps/album.js');
      await loadModule('apps/contacts.js');
      await loadModule('apps/messages.js');
      await loadModule('apps/phone.js');

      // 4. 스토어 앱 로드
      await loadModule('apps/store.js');

      // 5. 스토어에서 설치 가능한 앱들 로드
      await loadModule('apps/store-apps/notes.js');
      await loadModule('apps/store-apps/weather.js');
      await loadModule('apps/store-apps/games.js');
      await loadModule('apps/store-apps/calendar.js');
      await loadModule('apps/store-apps/theme.js');
      await loadModule('apps/store-apps/bank.js');
      await loadModule('apps/store-apps/streaming.js');

      // 6. 모듈별 Init 실행
      if (window.STPhone.UI) {
        window.STPhone.UI.init({
          utils: window.STPhone.Utils,
        });
      }

      if (window.STPhone.Inputs) {
        window.STPhone.Inputs.init({
          utils: window.STPhone.Utils,
          ui: window.STPhone.UI,
        });
      }

      // 6.5. 테마 앱 자동 초기화 (저장된 테마 불러오기)
      if (window.STPhone.Apps && window.STPhone.Apps.Theme) {
        window.STPhone.Apps.Theme.init();
      }

      // 7. 실리태번 옵션 메뉴에 폰 토글 버튼 추가
      addPhoneToggleButton();

      // 8. 브랜치 기록 복사 핸들러 설정 (IDB 기반)
      setupBranchCopyHandler();

      console.log(`✅ [${EXTENSION_NAME}] All modules initialized! Press 'X' to toggle phone.`);
    } catch (error) {
      console.error(`❌ [${EXTENSION_NAME}] Initialization failed:`, error);
    }
  }

  // [NEW] 실리태번 옵션 메뉴에 폰 토글 버튼 추가
  function addPhoneToggleButton() {
    // 이미 추가되어 있으면 스킵
    if ($('#option_toggle_phone').length > 0) return;

    // 옵션 메뉴 (#options .options-content)에 폰 버튼 추가
    const $optionsContent = $('#options .options-content');
    if ($optionsContent.length > 0) {
      // Author's Note 항목 뒤에 추가
      const phoneOption = `
        <a id="option_toggle_phone">
          <i class="fa-lg fa-solid fa-mobile-screen"></i>
          <span>📱 Phone</span>
        </a>
      `;

      // option_toggle_AN 뒤에 삽입
      const $anOption = $('#option_toggle_AN');
      if ($anOption.length > 0) {
        $anOption.after(phoneOption);
      } else {
        // 못 찾으면 그냥 맨 앞에 추가
        $optionsContent.prepend(phoneOption);
      }

      // 클릭 이벤트 연결
      $('#option_toggle_phone').on('click', function () {
        // 옵션 메뉴 닫기
        $('#options').hide();

        // 폰 토글
        if (window.STPhone && window.STPhone.UI) {
          window.STPhone.UI.togglePhone();
        }
      });

      console.log(`📱 [${EXTENSION_NAME}] Phone toggle button added to options menu.`);
    }
  }

  $(document).ready(function () {
    setTimeout(initialize, 500);

    // 메인 채팅 감시자 실행
    setupChatObserver();

    // 캘린더 프롬프트 주입 이벤트 리스너
    setupCalendarPromptInjector();
  });

  // [중요] 페이지 로드 시 기존 메시지도 검사하기 위해 Observer 시작 전 스캔 실행
  function applyHideLogicToAll() {
    const messages = document.querySelectorAll('.mes');
    messages.forEach((node) => {
      hideSystemLogs(node); // 이미 있는 메시지 숨기기
    });
  }

  // 감시자 함수 정의 (Observer)
  function setupChatObserver() {
    // 채팅창(#chat)이 존재할 때까지 대기
    const target = document.querySelector('#chat');
    if (!target) {
      setTimeout(setupChatObserver, 1000);
      return;
    }

    // 1. 챗 로드 직후 현재 화면에 있는 로그들 검사/숨김
    applyHideLogicToAll();

    // 2. 새 메시지 추가 감시
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // 노드가 추가될 때 (새 메시지, 혹은 채팅 로드)
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList.contains('mes')) {
            // 순서: 먼저 숨김 판단 -> 그 다음 폰과 동기화
            hideSystemLogs(node);
            processSync(node);
          }
        });
      });
    });

    observer.observe(target, { childList: true, subtree: true });
    console.log(`[${EXTENSION_NAME}] Chat Observer & Auto-Hider Started.`);
  }

  // [신규 기능] 폰 로그인지 검사하고 숨겨주는 함수
  function hideSystemLogs(node) {
    // 이미 처리된 건 스킵
    if (node.classList.contains('st-phone-hidden-log')) return;
    if (node.classList.contains('st-phone-log-processed')) return;

    const textDiv = node.querySelector('.mes_text');
    if (!textDiv) return;

    const text = textDiv.innerText;
    const html = textDiv.innerHTML;

    // [NEW] 은행 로그 패턴 (텍스트에서 제거용)
    const bankLogPatterns = [
      /\[💰[^\]]*\]/gi, // [💰 ...] 형식
      /\(거래\s*내역:[^)]*\)/gi, // (거래 내역: ...) 형식
    ];

    // 은행 로그가 포함되어 있으면 해당 부분만 제거
    let hasBankLog = bankLogPatterns.some((p) => p.test(text));
    if (hasBankLog) {
      let cleanedHtml = html;
      bankLogPatterns.forEach((pattern) => {
        cleanedHtml = cleanedHtml.replace(pattern, '');
      });
      // 빈 줄 정리
      cleanedHtml = cleanedHtml.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
      cleanedHtml = cleanedHtml.replace(/^\s*<br\s*\/?>\s*/gi, '');
      textDiv.innerHTML = cleanedHtml;
      node.classList.add('st-phone-log-processed');
    }

    const hiddenPatterns = [
      /^\s*\[📞/i, // 통화 시작/진행 로그
      /^\s*\[❌/i, // 통화 종료 로그
      /^\s*\[📩/i, // 문자 수신 로그 (사진 포함)
      /^\s*\[📵/i, // 거절/부재중 로그 숨기기
      /^\s*\[⛔/i, // 차단됨 로그 숨기기
      /^\s*\[🚫/i, // 읽씹(IGNORE) 로그 숨기기
      /^\s*\[📲/i, // 에어드롭 거절 로그 숨기기
      /^\s*\[ts:/i, // 타임스탬프 로그 숨기기
      /^\s*\[⏰/i, // 타임스킵 로그 숨기기
      /^\s*\[💰/i, // 은행 송금/잔액 로그 숨기기 (시작 부분)
      /^\s*\[📺/i, // 스트리밍 로그 숨기기
    ];

    const shouldHide = hiddenPatterns.some((regex) => regex.test(text));
    if (shouldHide) {
      node.classList.add('st-phone-hidden-log');
      node.style.display = 'none';
    }
  }

  // 메시지 분석 및 폰으로 전송 (동기화)
  function processSync(node) {
    if (window.STPhone.Apps.Settings && window.STPhone.Apps.Settings.getSettings) {
      const s = window.STPhone.Apps.Settings.getSettings();
      // chatToSms 값이 false라면 중단
      if (s.chatToSms === false) {
        return;
      }
    }

    // 히든로그인지 확인
    const isHiddenLog = node.classList.contains('st-phone-hidden-log') || node.style.display === 'none';

    // 타임스탬프 로직: 히든로그 -> 일반채팅 -> 히든로그 전환 감지
    if (isHiddenLog) {
      if (!lastMessageWasHiddenLog && needsTimestampOnNextPhoneMsg) {
        // 일반채팅 후 첫 히든로그 = 타임스탬프 필요 플래그 유지
      }
      lastMessageWasHiddenLog = true;
      return; // 히든로그는 동기화 안 함
    } else {
      // 일반 채팅
      if (lastMessageWasHiddenLog) {
        // 히든로그에서 일반채팅으로 전환
        needsTimestampOnNextPhoneMsg = true;
      }
      lastMessageWasHiddenLog = false;
    }

    const textDiv = node.querySelector('.mes_text');
    if (!textDiv) return;

    const rawText = textDiv.innerText;

    // 외부 문자 인식: (SMS|Text|MMS|Message|문자) 패턴
    const smsRegex = /^[\(\[]\s*(?:SMS|Text|MMS|Message|문자)\s*[\)\]][:：]?\s*(.*)/i;
    const match = rawText.match(smsRegex);

    if (match) {
      const cleanText = match[1].trim();
      const isUser = node.getAttribute('is_user') === 'true';

      if (window.STPhone && window.STPhone.Apps && window.STPhone.Apps.Messages) {
        const sender = isUser ? 'me' : 'them';
        // 폰 앱 내부로 전송
        window.STPhone.Apps.Messages.syncExternalMessage(sender, cleanText);
      }
    }
  }

  // 타임스탬프 플래그 공개
  window.STPhoneTimestamp = {
    needsTimestamp: function () {
      const needs = needsTimestampOnNextPhoneMsg;
      needsTimestampOnNextPhoneMsg = false; // 사용 후 리셋
      return needs;
    },
  };

  let lastKnownChatId = null;
  let lastKnownCharacterId = null;

  function setupBranchCopyHandler() {
    const checkInterval = setInterval(() => {
      const ctx = window.SillyTavern?.getContext?.();
      if (!ctx?.eventSource || !ctx?.eventTypes) return;

      clearInterval(checkInterval);

      lastKnownChatId = ctx.chatId;
      lastKnownCharacterId = ctx.characterId;

      ctx.eventSource.on(ctx.eventTypes.CHAT_CHANGED, () => {
        setTimeout(() => handleChatChanged(), 500);
      });
    }, 1000);
  }

  // async로 변경(IDB 사용)
  async function handleChatChanged() {
    const ctx = window.SillyTavern?.getContext?.();
    if (!ctx) return;

    const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
    if (!settings.branchCopyRecords) return;

    const newChatId = ctx.chatId;
    const newCharacterId = ctx.characterId;
    const mainChat = ctx.chatMetadata?.main_chat;

    if (!newChatId) {
      lastKnownChatId = newChatId;
      lastKnownCharacterId = newCharacterId;
      return;
    }

    const isSameCharacter = lastKnownCharacterId === newCharacterId;
    const isDifferentChat = lastKnownChatId !== newChatId;

    if (isSameCharacter && isDifferentChat && mainChat) {
      try {
        await copyRecordsToNewChat(mainChat, newChatId); // ▼ IDB 버전
      } catch (e) {
        console.warn(`[${EXTENSION_NAME}] copyRecordsToNewChat failed:`, e);
      }
    }

    lastKnownChatId = newChatId;
    lastKnownCharacterId = newCharacterId;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // (변경됨) 브랜치 기록 복사: localStorage → IndexedDB 사용
  // ─────────────────────────────────────────────────────────────────────────────
  async function copyRecordsToNewChat(sourceChatId, targetChatId) {
    const keySuffixes = [
      'messages',
      'groups',
      'translations',
      'timestamps',
      'custom_timestamps',
      'calls',
    ];
    let copied = false;

    for (const suffix of keySuffixes) {
      const sourceKey = `st_phone_${suffix}_${sourceChatId}`;
      const targetKey = `st_phone_${suffix}_${targetChatId}`;

      const sourceData = await IDB.get(sourceKey);
      const targetData = await IDB.get(targetKey);

      if (sourceData && !targetData) {
        await IDB.set(targetKey, sourceData);
        copied = true;
      }
    }

    if (copied) {
      toastr.info('브랜치에 문자/전화 기록이 복사되었습니다');
    }
  }

  function setupCalendarPromptInjector() {
    const checkInterval = setInterval(() => {
      const ctx = window.SillyTavern?.getContext?.();
      if (!ctx) return;

      clearInterval(checkInterval);

      const eventSource = ctx.eventSource;
      const eventTypes = ctx.eventTypes;

      if (eventSource && eventTypes) {
        eventSource.on(eventTypes.CHAT_COMPLETION_PROMPT_READY, (data) => {
          injectCalendarPrompt(data);
        });

        eventSource.on(eventTypes.MESSAGE_RECEIVED, (messageId) => {
          setTimeout(() => processCalendarResponse(), 300);
        });
      } else {
        setupCalendarResponseObserver();
      }
    }, 1000);
  }

  function injectCalendarPrompt(data) {
    // [1] 폰 앱(문자/전화)에서 AI 생성 중이면 주입 안 함
    if (window.STPhone?.isPhoneGenerating) {
      console.log(`📅 [${EXTENSION_NAME}] Calendar prompt skipped (phone app is generating)`);
      return;
    }

    // [2] 방송(Streaming) 중이면 주입 안 함
    if (window.STPhone?.Apps?.Streaming?.isLive?.()) {
      console.log('📅 [ST Phone] Streaming is active - Skipping Calendar prompt injection');
      return;
    }

    // 캘린더 앱 설치 여부
    const Store = window.STPhone?.Apps?.Store;
    if (!Store || !Store.isInstalled('calendar')) {
      return;
    }

    const Calendar = window.STPhone?.Apps?.Calendar;
    if (!Calendar || !Calendar.isCalendarEnabled()) {
      return;
    }

    const calendarPrompt = Calendar.getPrompt();
    if (!calendarPrompt) return;

    // data.chat 또는 data.messages에 프롬프트 주입
    if (data && data.chat && Array.isArray(data.chat)) {
      data.chat.push({
        role: 'system',
        content: calendarPrompt,
      });
      console.log(`📅 [${EXTENSION_NAME}] Calendar prompt injected`);
    }

    // [NEW] 은행 앱 프롬프트도 주입
    injectBankPrompt(data);
  }

  // [NEW] 은행 프롬프트 주입 함수
  function injectBankPrompt(data) {
    // 폰 앱에서 생성 중이면 스킵
    if (window.STPhone?.isPhoneGenerating) {
      return;
    }

    // 방송(Streaming) 중이면 스킵
    if (window.STPhone?.Apps?.Streaming?.isLive?.()) {
      console.log('📺 [ST Phone] Streaming is active - Skipping Bank prompt injection');
      return;
    }

    const Store = window.STPhone?.Apps?.Store;
    if (!Store || !Store.isInstalled('bank')) {
      return;
    }

    const Bank = window.STPhone?.Apps?.Bank;
    if (!Bank) {
      return;
    }

    try {
      // 전체 은행 시스템 프롬프트 주입
      const bankPrompt = Bank.generateBankSystemPrompt();
      if (bankPrompt && data && data.chat && Array.isArray(data.chat)) {
        data.chat.push({
          role: 'system',
          content: bankPrompt,
        });
        console.log(`💰 [${EXTENSION_NAME}] Bank system prompt injected`);
      }
    } catch (e) {
      console.warn(`[${EXTENSION_NAME}] Bank prompt injection failed:`, e);
    }
  }

  function processCalendarResponse() {
    try {
      const ctx = window.SillyTavern?.getContext?.();
      if (!ctx || !ctx.chat || ctx.chat.length === 0) return;

      const lastMsg = ctx.chat[ctx.chat.length - 1];
      if (!lastMsg || lastMsg.is_user) return;

      const msgText = lastMsg.mes || '';
      if (!msgText) return;

      const Store = window.STPhone?.Apps?.Store;

      // 캘린더 처리
      if (Store && Store.isInstalled('calendar')) {
        const Calendar = window.STPhone?.Apps?.Calendar;
        if (Calendar) {
          // 날짜 추출 및 처리
          const processed = Calendar.processAiResponse(msgText);

          // 날짜가 추출되었으면 메시지에서 날짜 부분 숨기기
          if (processed !== msgText) {
            setTimeout(() => hideCalendarDateInChat(), 100);
          }
        }
      }

      // [NEW] 은행 송금 패턴 처리
      if (Store && Store.isInstalled('bank')) {
        const Bank = window.STPhone?.Apps?.Bank;
        if (Bank && typeof Bank.parseTransferFromResponse === 'function') {
          try {
            const characterName = lastMsg.name || ctx.characterName || 'Unknown';
            Bank.parseTransferFromResponse(msgText, characterName);
          } catch (bankErr) {
            console.warn(`[${EXTENSION_NAME}] Bank transfer parsing failed:`, bankErr);
          }
        }
      }
    } catch (e) {
      console.error(`[${EXTENSION_NAME}] processCalendarResponse 에러:`, e);
    }
  }

  function hideCalendarDateInChat() {
    try {
      // 마지막 AI 메시지에서 날짜 형식 숨기기
      const messages = document.querySelectorAll('.mes:not([is_user="true"]) .mes_text');
      if (!messages || messages.length === 0) return;

      const lastMsgEl = messages[messages.length - 1];
      if (!lastMsgEl) return;

      const html = lastMsgEl.innerHTML;
      if (!html) return;

      // [2024년 3월 15일 금요일] 형식 숨김
      const dateRegex = /\[(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)\]/g;

      // 이미 숨김 처리된 경우 스킵
      if (lastMsgEl.querySelector('.st-calendar-date-hidden')) return;

      if (dateRegex.test(html)) {
        const replaceRegex =
          /\[(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)\]/g;
        lastMsgEl.innerHTML = html.replace(
          replaceRegex,
          '<span class="st-calendar-date-hidden" style="display:none;">$&</span>',
        );
      }
    } catch (e) {
      console.error(`[${EXTENSION_NAME}] hideCalendarDateInChat 에러:`, e);
    }
  }

  function setupCalendarResponseObserver() {
    // 폴백: MutationObserver로 새 메시지 감시
    const checkChat = setInterval(() => {
      const chatEl = document.querySelector('#chat');
      if (!chatEl) return;

      clearInterval(checkChat);

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.classList.contains('mes')) {
              // AI 메시지인 경우에만 처리
              if (node.getAttribute('is_user') !== 'true') {
                setTimeout(() => processCalendarResponse(), 300);
              }
            }
          });
        });
      });

      observer.observe(chatEl, { childList: true, subtree: true });
    }, 1000);
  }
})();
