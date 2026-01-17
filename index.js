(function () {
  'use strict';

  const EXTENSION_NAME = 'ST Phone System';
  const EXTENSION_FOLDER = 'ph-test1';
  const BASE_PATH = `/scripts/extensions/third-party/${EXTENSION_FOLDER}`;

  // ─────────────────────────────────────────────────────────────────────────────
  // [수정됨] localforage 인스턴스 생성 (IndexedDB를 쉽게 사용)
  // ─────────────────────────────────────────────────────────────────────────────
  
  // 폰 시스템 전용 저장소 생성
  const phoneDB = localforage.createInstance({
    name: "ST-Phone-System",
    storeName: "kv_store"
  });

  // 전역에서 접근 가능하도록 설정 (다른 앱 파일들에서 사용)
  window.STPhoneStorage = phoneDB;

  // ─────────────────────────────────────────────────────────────────────────────
  // [수정됨] localStorage → IndexedDB(localforage) 마이그레이션
  // ─────────────────────────────────────────────────────────────────────────────
  async function migrateLocalStorageToIDB(prefix = 'st_phone_') {
    try {
      const flagKey = '__migrated_localstorage__';
      const done = await phoneDB.getItem(flagKey);
      if (done === '1') return;

      console.log(`[${EXTENSION_NAME}] Starting migration from localStorage...`);

      // localStorage 스캔
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // st_phone_ 으로 시작하는 키만 찾음
        if (!key || !key.startsWith(prefix)) continue;

        const val = localStorage.getItem(key);
        // DB에 없는 경우에만 복사
        if (val != null) {
          const exists = await phoneDB.getItem(key);
          if (exists === null) {
             await phoneDB.setItem(key, val);
          }
        }
      }

      await phoneDB.setItem(flagKey, '1');
      console.log(`✅ [${EXTENSION_NAME}] Migration complete.`);
    } catch (e) {
      console.warn(`[${EXTENSION_NAME}] Migration failed:`, e);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 기존 코드 + 로직 수정
  // ─────────────────────────────────────────────────────────────────────────────

  let lastMessageWasHiddenLog = false;
  let needsTimestampOnNextPhoneMsg = false;

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
      // 1. DB 준비 및 마이그레이션 확인
      await phoneDB.ready();
      await migrateLocalStorageToIDB('st_phone_');

      // 2. 모듈 로드 순서
      await loadModule('utils.js');
      await loadModule('ui.js');
      await loadModule('inputs.js');

      await loadModule('apps/settings.js');
      await loadModule('apps/camera.js');
      await loadModule('apps/album.js');
      await loadModule('apps/contacts.js');
      await loadModule('apps/messages.js');
      await loadModule('apps/phone.js');
      
      await loadModule('apps/store.js');
      
      await loadModule('apps/store-apps/notes.js');
      await loadModule('apps/store-apps/weather.js');
      await loadModule('apps/store-apps/games.js');
      await loadModule('apps/store-apps/calendar.js');
      await loadModule('apps/store-apps/theme.js');
      await loadModule('apps/store-apps/bank.js');
      await loadModule('apps/store-apps/streaming.js');

      // 3. 모듈 Init 실행
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

      // [중요] 테마 앱은 저장된 설정을 불러와야 하므로 비동기 처리 가능성 있음
      if (window.STPhone.Apps && window.STPhone.Apps.Theme) {
        // Theme.init이 async라면 await를 붙여주는 것이 좋음
        await window.STPhone.Apps.Theme.init();
      }

      addPhoneToggleButton();
      setupBranchCopyHandler();

      console.log(`✅ [${EXTENSION_NAME}] All modules initialized! Press 'X' to toggle phone.`);
    } catch (error) {
      console.error(`❌ [${EXTENSION_NAME}] Initialization failed:`, error);
    }
  }

  // ... (addPhoneToggleButton 함수는 그대로 사용) ...
  function addPhoneToggleButton() {
    if ($('#option_toggle_phone').length > 0) return;
    const $optionsContent = $('#options .options-content');
    if ($optionsContent.length > 0) {
      const phoneOption = `
        <a id="option_toggle_phone">
          <i class="fa-lg fa-solid fa-mobile-screen"></i>
          <span>📱 Phone</span>
        </a>
      `;
      const $anOption = $('#option_toggle_AN');
      if ($anOption.length > 0) {
        $anOption.after(phoneOption);
      } else {
        $optionsContent.prepend(phoneOption);
      }
      $('#option_toggle_phone').on('click', function () {
        $('#options').hide();
        if (window.STPhone && window.STPhone.UI) {
          window.STPhone.UI.togglePhone();
        }
      });
      console.log(`📱 [${EXTENSION_NAME}] Phone toggle button added to options menu.`);
    }
  }

  $(document).ready(function () {
    setTimeout(initialize, 500);
    setupChatObserver();
    setupCalendarPromptInjector();
  });

  function applyHideLogicToAll() {
    const messages = document.querySelectorAll('.mes');
    messages.forEach((node) => {
      hideSystemLogs(node);
    });
  }

  function setupChatObserver() {
    const target = document.querySelector('#chat');
    if (!target) {
      setTimeout(setupChatObserver, 1000);
      return;
    }
    applyHideLogicToAll();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList.contains('mes')) {
            hideSystemLogs(node);
            processSync(node);
          }
        });
      });
    });
    observer.observe(target, { childList: true, subtree: true });
    console.log(`[${EXTENSION_NAME}] Chat Observer & Auto-Hider Started.`);
  }

  // ... (hideSystemLogs 함수는 그대로 사용) ...
  function hideSystemLogs(node) {
    if (node.classList.contains('st-phone-hidden-log')) return;
    if (node.classList.contains('st-phone-log-processed')) return;
    const textDiv = node.querySelector('.mes_text');
    if (!textDiv) return;
    const text = textDiv.innerText;
    const html = textDiv.innerHTML;
    const bankLogPatterns = [
      /\[💰[^\]]*\]/gi,
      /\(거래\s*내역:[^)]*\)/gi,
    ];
    let hasBankLog = bankLogPatterns.some((p) => p.test(text));
    if (hasBankLog) {
      let cleanedHtml = html;
      bankLogPatterns.forEach((pattern) => {
        cleanedHtml = cleanedHtml.replace(pattern, '');
      });
      cleanedHtml = cleanedHtml.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
      cleanedHtml = cleanedHtml.replace(/^\s*<br\s*\/?>\s*/gi, '');
      textDiv.innerHTML = cleanedHtml;
      node.classList.add('st-phone-log-processed');
    }
    const hiddenPatterns = [
      /^\s*\[📞/i, /^\s*\[❌/i, /^\s*\[📩/i, /^\s*\[📵/i,
      /^\s*\[⛔/i, /^\s*\[🚫/i, /^\s*\[📲/i, /^\s*\[ts:/i,
      /^\s*\[⏰/i, /^\s*\[💰/i, /^\s*\[📺/i,
    ];
    const shouldHide = hiddenPatterns.some((regex) => regex.test(text));
    if (shouldHide) {
      node.classList.add('st-phone-hidden-log');
      node.style.display = 'none';
    }
  }

  // ... (processSync 함수 수정 없음, 단 주의사항 있음) ...
  function processSync(node) {
    // [주의] Settings.getSettings()는 반드시 동기(Synchronous) 값을 반환해야 합니다.
    // IndexedDB를 쓰더라도 Settings 앱 내부 변수에 값을 로드해두고 그것을 리턴해야 합니다.
    if (window.STPhone.Apps.Settings && window.STPhone.Apps.Settings.getSettings) {
      const s = window.STPhone.Apps.Settings.getSettings();
      if (s && s.chatToSms === false) {
        return;
      }
    }
    
    // 이하 로직 그대로
    const isHiddenLog = node.classList.contains('st-phone-hidden-log') || node.style.display === 'none';
    if (isHiddenLog) {
      if (!lastMessageWasHiddenLog && needsTimestampOnNextPhoneMsg) {
      }
      lastMessageWasHiddenLog = true;
      return; 
    } else {
      if (lastMessageWasHiddenLog) {
        needsTimestampOnNextPhoneMsg = true;
      }
      lastMessageWasHiddenLog = false;
    }
    const textDiv = node.querySelector('.mes_text');
    if (!textDiv) return;
    const rawText = textDiv.innerText;
    const smsRegex = /^[\(\[]\s*(?:SMS|Text|MMS|Message|문자)\s*[\)\]][:：]?\s*(.*)/i;
    const match = rawText.match(smsRegex);
    if (match) {
      const cleanText = match[1].trim();
      const isUser = node.getAttribute('is_user') === 'true';
      if (window.STPhone && window.STPhone.Apps && window.STPhone.Apps.Messages) {
        const sender = isUser ? 'me' : 'them';
        window.STPhone.Apps.Messages.syncExternalMessage(sender, cleanText);
      }
    }
  }

  window.STPhoneTimestamp = {
    needsTimestamp: function () {
      const needs = needsTimestampOnNextPhoneMsg;
      needsTimestampOnNextPhoneMsg = false;
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
        await copyRecordsToNewChat(mainChat, newChatId);
      } catch (e) {
        console.warn(`[${EXTENSION_NAME}] copyRecordsToNewChat failed:`, e);
      }
    }
    lastKnownChatId = newChatId;
    lastKnownCharacterId = newCharacterId;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // [수정됨] 브랜치 복사 로직 (localforage 사용)
  // ─────────────────────────────────────────────────────────────────────────────
  async function copyRecordsToNewChat(sourceChatId, targetChatId) {
    const keySuffixes = [
      'messages', 'groups', 'translations', 'timestamps',
      'custom_timestamps', 'calls',
    ];
    let copied = false;

    for (const suffix of keySuffixes) {
      const sourceKey = `st_phone_${suffix}_${sourceChatId}`;
      const targetKey = `st_phone_${suffix}_${targetChatId}`;

      // IDB.get 대신 phoneDB.getItem 사용
      const sourceData = await phoneDB.getItem(sourceKey);
      const targetData = await phoneDB.getItem(targetKey);

      if (sourceData && !targetData) {
        await phoneDB.setItem(targetKey, sourceData);
        copied = true;
      }
    }

    if (copied) {
      toastr.info('브랜치에 문자/전화 기록이 복사되었습니다');
    }
  }

  // ... (setupCalendarPromptInjector, injectCalendarPrompt 등은 수정 없이 그대로 사용 가능) ...
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
    if (window.STPhone?.isPhoneGenerating) return;
    if (window.STPhone?.Apps?.Streaming?.isLive?.()) return;
    const Store = window.STPhone?.Apps?.Store;
    if (!Store || !Store.isInstalled('calendar')) return;
    const Calendar = window.STPhone?.Apps?.Calendar;
    if (!Calendar || !Calendar.isCalendarEnabled()) return;
    const calendarPrompt = Calendar.getPrompt();
    if (!calendarPrompt) return;
    if (data && data.chat && Array.isArray(data.chat)) {
      data.chat.push({
        role: 'system',
        content: calendarPrompt,
      });
      console.log(`📅 [${EXTENSION_NAME}] Calendar prompt injected`);
    }
    injectBankPrompt(data);
  }

  function injectBankPrompt(data) {
    if (window.STPhone?.isPhoneGenerating) return;
    if (window.STPhone?.Apps?.Streaming?.isLive?.()) return;
    const Store = window.STPhone?.Apps?.Store;
    if (!Store || !Store.isInstalled('bank')) return;
    const Bank = window.STPhone?.Apps?.Bank;
    if (!Bank) return;
    try {
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
      if (Store && Store.isInstalled('calendar')) {
        const Calendar = window.STPhone?.Apps?.Calendar;
        if (Calendar) {
          const processed = Calendar.processAiResponse(msgText);
          if (processed !== msgText) {
            setTimeout(() => hideCalendarDateInChat(), 100);
          }
        }
      }
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
      const messages = document.querySelectorAll('.mes:not([is_user="true"]) .mes_text');
      if (!messages || messages.length === 0) return;
      const lastMsgEl = messages[messages.length - 1];
      if (!lastMsgEl) return;
      const html = lastMsgEl.innerHTML;
      if (!html) return;
      const dateRegex = /\[(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)\]/g;
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
    const checkChat = setInterval(() => {
      const chatEl = document.querySelector('#chat');
      if (!chatEl) return;
      clearInterval(checkChat);
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.classList.contains('mes')) {
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