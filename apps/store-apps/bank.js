window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Bank = (function() {
    'use strict';

    // ==========================================
    // [NEW] IndexedDB Helper
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
                    console.error('[Bank] DB Init Error', e);
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
        }
    };

    const css = `<style> .st-bank-app { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 999; display: flex; flex-direction: column; background: var(--pt-bg-color, #f5f5f7); color: var(--pt-text-color, #000); font-family: var(--pt-font, -apple-system, sans-serif); box-sizing: border-box; } .st-bank-header { padding: 20px 20px 15px; flex-shrink: 0; border-bottom: 1px solid var(--pt-border, #e5e5e5); background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; } .st-bank-title { font-size: 24px; font-weight: 700; margin-bottom: 3px; } .st-bank-subtitle { font-size: 13px; opacity: 0.8; } .st-bank-balance-card { margin: 20px; padding: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; color: white; box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3); } .st-bank-balance-label { font-size: 13px; opacity: 0.85; margin-bottom: 8px; } .st-bank-balance-amount { font-size: 32px; font-weight: 700; margin-bottom: 8px; } .st-bank-currency-select { background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 8px; font-size: 13px; cursor: pointer; } .st-bank-currency-select option { background: #333; color: white; } .st-bank-quick-menu { display: flex; justify-content: space-around; padding: 15px 20px; background: var(--pt-card-bg, #fff); margin: 0 20px; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); } .st-bank-quick-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; color: var(--pt-text-color, #000); } .st-bank-quick-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; } .st-bank-quick-icon.send { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; } .st-bank-quick-icon.receive { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; } .st-bank-quick-icon.history { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; } .st-bank-quick-label { font-size: 12px; font-weight: 500; } .st-bank-tabs { display: flex; padding: 0 20px; margin-top: 20px; gap: 0; border-bottom: 1px solid var(--pt-border, #e5e5e5); } .st-bank-tab { flex: 1; padding: 14px; text-align: center; font-size: 14px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; color: var(--pt-sub-text, #86868b); transition: all 0.2s; } .st-bank-tab.active { color: var(--pt-accent, #007aff); border-bottom-color: var(--pt-accent, #007aff); } .st-bank-content { flex: 1; overflow-y: auto; padding: 15px 20px; } .st-bank-section { margin-bottom: 20px; } .st-bank-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; } .st-bank-section-title { font-size: 16px; font-weight: 600; } .st-bank-add-btn { background: var(--pt-accent, #007aff); color: white; border: none; width: 28px; height: 28px; border-radius: 50%; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; } .st-bank-list { display: flex; flex-direction: column; gap: 10px; } .st-bank-item { background: var(--pt-card-bg, #fff); border-radius: 14px; padding: 14px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); } .st-bank-item-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; } .st-bank-item-icon.expense { background: #ffebee; color: #e53935; } .st-bank-item-icon.income { background: #e8f5e9; color: #43a047; } .st-bank-item-icon.transfer { background: #e3f2fd; color: #1e88e5; } .st-bank-item-info { flex: 1; min-width: 0; } .st-bank-item-title { font-size: 15px; font-weight: 600; margin-bottom: 2px; } .st-bank-item-desc { font-size: 12px; color: var(--pt-sub-text, #86868b); } .st-bank-item-amount { font-size: 15px; font-weight: 600; } .st-bank-item-amount.expense { color: #e53935; } .st-bank-item-amount.income { color: #43a047; } .st-bank-item-delete { background: none; border: none; color: #ff3b30; font-size: 14px; cursor: pointer; padding: 5px; opacity: 0.5; transition: opacity 0.2s; } .st-bank-item-delete:hover { opacity: 1; } .st-bank-toggle-section { padding: 14px; background: var(--pt-card-bg, #fff); border-radius: 14px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; } .st-bank-toggle-info { flex: 1; } .st-bank-toggle-label { font-size: 14px; font-weight: 500; } .st-bank-toggle-desc { font-size: 11px; color: var(--pt-sub-text, #86868b); margin-top: 2px; } .st-bank-toggle { position: relative; width: 51px; height: 31px; background: #e9e9eb; border-radius: 15.5px; cursor: pointer; transition: background 0.3s; flex-shrink: 0; } .st-bank-toggle.active { background: var(--pt-accent, #007aff); } .st-bank-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; background: white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.3s; } .st-bank-toggle.active::after { transform: translateX(20px); } .st-bank-empty { text-align: center; padding: 40px 20px; color: var(--pt-sub-text, #86868b); } .st-bank-empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.5; } .st-bank-modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1002; } .st-bank-modal-content { background: var(--pt-card-bg, #fff); border-radius: 20px; padding: 24px; width: 300px; max-width: 90%; max-height: 80%; overflow-y: auto; } .st-bank-modal-title { font-size: 18px; font-weight: 600; margin-bottom: 20px; text-align: center; } .st-bank-modal-input { width: 100%; padding: 14px; border: 1px solid var(--pt-border, #e5e5e5); border-radius: 12px; font-size: 15px; margin-bottom: 12px; box-sizing: border-box; background: var(--pt-bg-color, #f5f5f7); color: var(--pt-text-color, #000); } .st-bank-modal-select { width: 100%; padding: 14px; border: 1px solid var(--pt-border, #e5e5e5); border-radius: 12px; font-size: 15px; margin-bottom: 12px; box-sizing: border-box; background: var(--pt-bg-color, #f5f5f7); color: var(--pt-text-color, #000); } .st-bank-modal-row { display: flex; gap: 10px; margin-bottom: 12px; } .st-bank-modal-row .st-bank-modal-input, .st-bank-modal-row .st-bank-modal-select { flex: 1; margin-bottom: 0; } .st-bank-modal-buttons { display: flex; gap: 10px; margin-top: 20px; } .st-bank-modal-btn { flex: 1; padding: 14px; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; } .st-bank-modal-btn.cancel { background: var(--pt-border, #e5e5e5); color: var(--pt-text-color, #000); } .st-bank-modal-btn.confirm { background: var(--pt-accent, #007aff); color: white; } .st-bank-modal-btn.danger { background: #ff3b30; color: white; } .st-bank-history-item { background: var(--pt-card-bg, #fff); border-radius: 14px; padding: 14px; display: flex; align-items: center; gap: 12px; margin-bottom: 10px; } .st-bank-history-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; } .st-bank-history-icon.in { background: #e8f5e9; color: #43a047; } .st-bank-history-icon.out { background: #ffebee; color: #e53935; } .st-bank-history-info { flex: 1; } .st-bank-history-title { font-size: 14px; font-weight: 600; } .st-bank-history-date { font-size: 11px; color: var(--pt-sub-text, #86868b); } .st-bank-history-amount { font-size: 15px; font-weight: 600; } .st-bank-history-amount.in { color: #43a047; } .st-bank-history-amount.out { color: #e53935; } .st-bank-pending-item { background: linear-gradient(135deg, #fff9c4 0%, #fff59d 100%); border-radius: 14px; padding: 14px; margin-bottom: 10px; } .st-bank-pending-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; } .st-bank-pending-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; } .st-bank-pending-info { flex: 1; } .st-bank-pending-name { font-size: 14px; font-weight: 600; color: #333; } .st-bank-pending-desc { font-size: 12px; color: #666; } .st-bank-pending-amount { font-size: 18px; font-weight: 700; color: #43a047; } .st-bank-pending-actions { display: flex; gap: 8px; } .st-bank-pending-btn { flex: 1; padding: 10px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; } .st-bank-pending-btn.accept { background: #43a047; color: white; } .st-bank-pending-btn.decline { background: #e53935; color: white; } .st-bank-contact-list { max-height: 200px; overflow-y: auto; border: 1px solid var(--pt-border, #e5e5e5); border-radius: 12px; margin-bottom: 12px; } .st-bank-contact-item { display: flex; align-items: center; padding: 12px; border-bottom: 1px solid var(--pt-border, #e5e5e5); cursor: pointer; transition: background 0.2s; } .st-bank-contact-item:last-child { border-bottom: none; } .st-bank-contact-item:hover { background: rgba(0,0,0,0.03); } .st-bank-contact-item.selected { background: rgba(0, 122, 255, 0.1); } .st-bank-contact-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; margin-right: 10px; } .st-bank-contact-name { flex: 1; font-size: 15px; } .st-bank-contact-check { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--pt-border, #ccc); display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; } .st-bank-contact-item.selected .st-bank-contact-check { background: var(--pt-accent, #007aff); border-color: var(--pt-accent, #007aff); } </style>`;

    const CURRENCIES = {
        KRW: { symbol: '₩', name: '원 (KRW)', locale: 'ko-KR' },
        USD: { symbol: '$', name: '달러 (USD)', locale: 'en-US' },
        EUR: { symbol: '€', name: '유로 (EUR)', locale: 'de-DE' },
        JPY: { symbol: '¥', name: '엔 (JPY)', locale: 'ja-JP' },
        GBP: { symbol: '£', name: '파운드 (GBP)', locale: 'en-GB' },
        CNY: { symbol: '¥', name: '위안 (CNY)', locale: 'zh-CN' }
    };

    // 메모리 캐시 (동기적 getter 지원용)
    let balance = 0;
    let currency = 'KRW';
    let recurringExpenses = [];
    let recurringIncomes = [];
    let pendingTransfers = [];
    let transactionHistory = [];
    let recurringEnabled = true;
    let currentTab = 'home';

    function getStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        return 'st_phone_bank_' + context.chatId;
    }

    // [Async]
    async function loadData() {
        const key = getStorageKey();
        if (!key) { resetData(); return; }
        try {
            const data = await DB.get(key);
            if (data) {
                balance = data.balance || 0;
                currency = data.currency || 'KRW';
                recurringExpenses = data.recurringExpenses || [];
                recurringIncomes = data.recurringIncomes || [];
                pendingTransfers = data.pendingTransfers || [];
                transactionHistory = data.transactionHistory || [];
                recurringEnabled = data.recurringEnabled !== false;
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
            await DB.set(key, {
                balance,
                currency,
                recurringExpenses,
                recurringIncomes,
                pendingTransfers,
                transactionHistory,
                recurringEnabled
            });
        } catch (e) { console.error('[Bank] 저장 실패:', e); }
    }

    function resetData() {
        balance = 0;
        currency = 'KRW';
        recurringExpenses = [];
        recurringIncomes = [];
        pendingTransfers = [];
        transactionHistory = [];
        recurringEnabled = true;
    }

    function formatAmount(amount) {
        const curr = CURRENCIES[currency];
        return new Intl.NumberFormat(curr.locale).format(amount) + curr.symbol;
    }

    function formatAmountWithSign(amount, isExpense = false) {
        const formatted = formatAmount(Math.abs(amount));
        return isExpense ? `-${formatted}` : `+${formatted}`;
    }

    // [Async]
    async function addBalance(amount, description, fromCharacter = null) {
        await loadData();
        balance += amount;
        transactionHistory.unshift({ id: Date.now(), type: 'income', amount, description, fromCharacter, timestamp: Date.now() });
        await saveData();
    }

    // [Async]
    async function subtractBalance(amount, description, toCharacter = null) {
        await loadData();
        balance -= amount;
        transactionHistory.unshift({ id: Date.now(), type: 'expense', amount, description, toCharacter, timestamp: Date.now() });
        await saveData();
    }

    // [Sync] 메모리 캐시 반환
    function getBalance() {
        return balance;
    }

    // [Sync] 메모리 캐시 반환
    function getCurrency() {
        return currency;
    }

    // [Async]
    async function addPendingTransfer(fromCharacter, amount, message = '') {
        await loadData();
        pendingTransfers.push({ id: Date.now(), fromCharacter, amount, message, timestamp: Date.now() });
        await saveData();
        const curr = CURRENCIES[currency];
        toastr.success(`💸 ${fromCharacter}님이 ${formatAmount(amount)}을 보냈습니다!`, '송금 도착');
    }

    // [Async]
    async function acceptTransfer(transferId) {
        await loadData();
        const idx = pendingTransfers.findIndex(t => t.id === transferId);
        if (idx === -1) return false;
        const transfer = pendingTransfers[idx];
        balance += transfer.amount;
        transactionHistory.unshift({ id: Date.now(), type: 'income', amount: transfer.amount, description: `${transfer.fromCharacter}님으로부터 송금`, fromCharacter: transfer.fromCharacter, timestamp: Date.now() });
        pendingTransfers.splice(idx, 1);
        await saveData();
        toastr.success(`💰 ${formatAmount(transfer.amount)}이 입금되었습니다!`);
        return true;
    }

    // [Async]
    async function declineTransfer(transferId) {
        await loadData();
        const idx = pendingTransfers.findIndex(t => t.id === transferId);
        if (idx === -1) return false;
        pendingTransfers.splice(idx, 1);
        await saveData();
        toastr.info('송금을 거절했습니다.');
        return true;
    }

    // [Async]
    async function addRecurringExpense(name, amount, dayOfMonth) {
        await loadData();
        recurringExpenses.push({ id: Date.now(), name, amount, dayOfMonth });
        await saveData();
    }

    // [Async]
    async function removeRecurringExpense(id) {
        await loadData();
        recurringExpenses = recurringExpenses.filter(e => e.id !== id);
        await saveData();
    }

    // [Async]
    async function addRecurringIncome(name, amount, dayOfMonth) {
        await loadData();
        recurringIncomes.push({ id: Date.now(), name, amount, dayOfMonth });
        await saveData();
    }

    // [Async]
    async function removeRecurringIncome(id) {
        await loadData();
        recurringIncomes = recurringIncomes.filter(e => e.id !== id);
        await saveData();
    }

    // [Async]
    async function processRecurringOnDateChange(newDate) {
        if (!recurringEnabled) return;
        await loadData();
        const day = newDate.day;
        recurringExpenses.forEach(expense => {
            if (expense.dayOfMonth === day) {
                balance -= expense.amount;
                transactionHistory.unshift({ id: Date.now(), type: 'expense', amount: expense.amount, description: `[고정지출] ${expense.name}`, timestamp: Date.now(), isRecurring: true });
                toastr.info(`📤 고정지출: ${expense.name} (${formatAmount(expense.amount)})`);
            }
        });
        recurringIncomes.forEach(income => {
            if (income.dayOfMonth === day) {
                balance += income.amount;
                transactionHistory.unshift({ id: Date.now(), type: 'income', amount: income.amount, description: `[고정입금] ${income.name}`, timestamp: Date.now(), isRecurring: true });
                toastr.success(`📥 고정입금: ${income.name} (${formatAmount(income.amount)})`);
            }
        });
        await saveData();
    }

    function generateBalancePrompt() {
        // [Sync] 메모리 캐시 사용 (loadData 호출 안함)
        const curr = CURRENCIES[currency];
        const myName = getUserName();
        return `[💰 ${myName}'s Bank Info - SYSTEM ONLY, DO NOT DISPLAY IN RESPONSE]\nCurrent Balance: ${formatAmount(balance)}\nThis is for RP reference only. Do not directly mention the balance in your response.`;
    }

    function generateBankSystemPrompt() {
        // [Sync] 메모리 캐시 사용
        const curr = CURRENCIES[currency];
        const myName = getUserName();
        const contacts = window.STPhone?.Apps?.Contacts?.getAllContacts?.() || [];
        const contactNames = contacts.map(c => c.name).join(', ');
        let prompt = `[💰 Bank System - SYSTEM ONLY, DO NOT DISPLAY IN RESPONSE]\n${myName}'s current bank balance: ${formatAmount(balance)}\nCurrency: ${curr.name}\n\n### Important: Character Knowledge\nCharacters do NOT know ${myName}'s bank balance unless ${myName} tells them.\nThis balance info is for the SYSTEM to track purchases/transfers only.\nDo not mention specific balance amounts in RP unless ${myName} shares it.\n\n### Transfer Format (Use 💰 emoji)\nWhen a character sends money to ${myName}:\n[💰 캐릭터이름 송금 ${myName}: amount${curr.symbol}]\n\n### Purchase/Expense Format\nWhen ${myName} buys something or spends money:\n[💰 가게이름/항목 출금 ${myName}: amount${curr.symbol}]\nExamples:\n[💰 편의점 출금 ${myName}: 5000${curr.symbol}]\n[💰 택시비 출금 ${myName}: 15000${curr.symbol}]\n[💰 카페 출금 ${myName}: 4500${curr.symbol}]\n\n🚫 Insufficient Balance Rules (CRITICAL!)\n${myName}'s current balance is ${formatAmount(balance)}.\n- ${myName} CANNOT buy anything that costs more than their balance!\n- If insufficient funds, refuse in RP naturally (e.g., "I don't have enough money...", "My wallet is empty...")\n- Do NOT pretend to buy something without the withdrawal tag.\n- If balance is 0, ${myName} cannot purchase ANYTHING!\n\n⚠️ Important: Use contact names exactly as registered!\nRegistered contacts: ${contactNames || '(none)'}\n\n### Balance Display Rules\n⚠️ NEVER use [💰 ... 잔액: ...] format in responses! The system calculates balance automatically.\nOnly use the transfer/withdrawal formats above.`;
        if (recurringEnabled && (recurringExpenses.length > 0 || recurringIncomes.length > 0)) {
            prompt += `\n\n[${myName}'s Recurring Financial Info]`;
            if (recurringExpenses.length > 0) {
                prompt += `\nRecurring Expenses (Monthly):`;
                recurringExpenses.forEach(e => { prompt += `\n- Day ${e.dayOfMonth}: ${e.name} (${formatAmount(e.amount)})`; });
            }
            if (recurringIncomes.length > 0) {
                prompt += `\n\nRecurring Income (Monthly):`;
                recurringIncomes.forEach(i => { prompt += `\n- Day ${i.dayOfMonth}: ${i.name} (${formatAmount(i.amount)})`; });
            }
        }
        return prompt;
    }

    // [Async]
    async function parseTransferFromResponse(text, characterName) {
        if (!text) return null;
        await loadData();
        const curr = CURRENCIES[currency];
        const myName = getUserName();
        const transferPattern = /\[💰\s*([^송]+)\s*송금\s*([^:：]+)[:\s：]+\s*[\$₩€¥£]?\s*([\d,]+)\s*[\$₩€¥£원]?\s*\]/gi;
        let match;
        while ((match = transferPattern.exec(text)) !== null) {
            const senderRaw = match[1].trim();
            const receiverRaw = match[2].trim();
            const amount = parseInt(match[3].replace(/,/g, ''));
            if (isNaN(amount) || amount <= 0) continue;
            const receiverLower = receiverRaw.toLowerCase();
            const myNameLower = myName.toLowerCase();
            const isReceiverUser = receiverLower === myNameLower || receiverLower.includes(myNameLower) || myNameLower.includes(receiverLower) || receiverLower === '유저' || receiverLower === 'user';
            const senderLower = senderRaw.toLowerCase();
            const isSenderUser = senderLower === myNameLower || senderLower.includes(myNameLower) || myNameLower.includes(senderLower) || senderLower === '유저' || senderLower === 'user';
            if (isReceiverUser && !isSenderUser) {
                balance += amount;
                transactionHistory.unshift({ id: Date.now(), type: 'income', amount: amount, description: `${senderRaw}님으로부터 송금`, timestamp: Date.now() });
                await saveData();
                toastr.success(`💰 ${senderRaw}님이 ${formatAmount(amount)} 송금! (현재: ${formatAmount(balance)})`);
            } else if (isSenderUser && !isReceiverUser) {
                if (balance >= amount) {
                    await subtractBalance(amount, `${receiverRaw}에게 송금`);
                    toastr.info(`💰 ${receiverRaw}에게 ${formatAmount(amount)} 송금됨`);
                }
            }
        }
        const withdrawPattern = /\[💰\s*([^출]+)\s*출금\s*([^:：]+)[:\s：]+\s*[\$₩€¥£]?\s*([\d,]+)\s*[\$₩€¥£원]?\s*\]/gi;
        let withdrawMatch;
        while ((withdrawMatch = withdrawPattern.exec(text)) !== null) {
            const shopName = withdrawMatch[1].trim();
            const targetName = withdrawMatch[2].trim();
            const amount = parseInt(withdrawMatch[3].replace(/,/g, ''));
            if (isNaN(amount) || amount <= 0) continue;
            const targetLower = targetName.toLowerCase();
            const myNameLower = myName.toLowerCase();
            const isTargetUser = targetLower === myNameLower || targetLower.includes(myNameLower) || myNameLower.includes(targetLower) || targetLower === '유저' || targetLower === 'user';
            if (isTargetUser) {
                if (balance >= amount) {
                    balance -= amount;
                    transactionHistory.unshift({ id: Date.now(), type: 'expense', amount: amount, description: `${shopName}에서 결제`, timestamp: Date.now() });
                    await saveData();
                    toastr.info(`💰 ${shopName}에서 ${formatAmount(amount)} 결제 (현재: ${formatAmount(balance)})`);
                } else {
                    toastr.warning(`💰 잔액 부족! ${shopName}에서 ${formatAmount(amount)} 결제 실패`);
                }
            }
        }
    }

    // [Async]
    async function open() {
        await loadData();
        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen || !$screen.length) return;
        $screen.empty();
        const currencyOptions = Object.entries(CURRENCIES).map(([code, info]) => `<option value="${code}" ${code === currency ? 'selected' : ''}>${info.name}</option>`).join('');
        const html = `
            ${css}
            <div class="st-bank-app">
                <div class="st-bank-header">
                    <div class="st-bank-title">💰 은행</div>
                    <div class="st-bank-subtitle">나의 자산을 관리하세요</div>
                </div>
                <div class="st-bank-balance-card">
                    <div class="st-bank-balance-label">내 잔액</div>
                    <div class="st-bank-balance-amount" id="st-bank-balance">${formatAmount(balance)}</div>
                    <select class="st-bank-currency-select" id="st-bank-currency">${currencyOptions}</select>
                </div>
                <div class="st-bank-quick-menu">
                    <button class="st-bank-quick-btn" id="st-bank-send"><div class="st-bank-quick-icon send">📤</div><span class="st-bank-quick-label">송금</span></button>
                    <button class="st-bank-quick-btn" id="st-bank-receive"><div class="st-bank-quick-icon receive">📥</div><span class="st-bank-quick-label">수신함</span></button>
                    <button class="st-bank-quick-btn" id="st-bank-history"><div class="st-bank-quick-icon history">📋</div><span class="st-bank-quick-label">내역</span></button>
                </div>
                <div class="st-bank-tabs">
                    <div class="st-bank-tab ${currentTab === 'home' ? 'active' : ''}" data-tab="home">홈</div>
                    <div class="st-bank-tab ${currentTab === 'recurring' ? 'active' : ''}" data-tab="recurring">고정관리</div>
                    <div class="st-bank-tab ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">설정</div>
                </div>
                <div class="st-bank-content" id="st-bank-content"></div>
            </div>
        `;
        $screen.append(html);
        renderTab(currentTab);
        attachListeners();
    }

    function renderTab(tab) {
        currentTab = tab;
        const $content = $('#st-bank-content');
        $content.empty();
        switch (tab) {
            case 'home': renderHomeTab($content); break;
            case 'recurring': renderRecurringTab($content); break;
            case 'settings': renderSettingsTab($content); break;
        }
    }

    function renderHomeTab($content) {
        let pendingHtml = '';
        if (pendingTransfers.length > 0) {
            pendingHtml = `<div class="st-bank-section"><div class="st-bank-section-header"><span class="st-bank-section-title">📬 수신함 (${pendingTransfers.length})</span></div><div class="st-bank-list" id="st-bank-pending-list">${pendingTransfers.slice(0, 3).map(t => `<div class="st-bank-pending-item" data-id="${t.id}"><div class="st-bank-pending-header"><div class="st-bank-pending-info"><div class="st-bank-pending-name">${t.fromCharacter}</div><div class="st-bank-pending-desc">${t.message || '송금'}</div></div><div class="st-bank-pending-amount">+${formatAmount(t.amount)}</div></div><div class="st-bank-pending-actions"><button class="st-bank-pending-btn accept" data-id="${t.id}">받기</button><button class="st-bank-pending-btn decline" data-id="${t.id}">거절</button></div></div>`).join('')}</div></div>`;
        }
        let historyHtml = '';
        if (transactionHistory.length > 0) {
            historyHtml = `<div class="st-bank-section"><div class="st-bank-section-header"><span class="st-bank-section-title">📋 최근 거래</span></div><div class="st-bank-list">${transactionHistory.slice(0, 5).map(t => `<div class="st-bank-history-item" style="margin-bottom:8px;"><div class="st-bank-history-icon ${t.type === 'income' ? 'in' : 'out'}">${t.type === 'income' ? '📥' : '📤'}</div><div class="st-bank-history-info"><div class="st-bank-history-title">${t.description}</div><div class="st-bank-history-date">${new Date(t.timestamp).toLocaleString()}</div></div><div class="st-bank-history-amount ${t.type === 'income' ? 'in' : 'out'}">${t.type === 'income' ? '+' : '-'}${formatAmount(t.amount)}</div></div>`).join('')}</div></div>`;
        } else {
            historyHtml = `<div class="st-bank-empty"><div class="st-bank-empty-icon">📊</div><div>거래 내역이 없습니다</div></div>`;
        }
        $content.append(pendingHtml + historyHtml);
        attachPendingListeners();
    }

    function renderRecurringTab($content) {
        const calendarInstalled = window.STPhone?.Apps?.Store?.isInstalled?.('calendar');
        if (!calendarInstalled) {
            $content.append(`<div class="st-bank-empty"><div class="st-bank-empty-icon">📅</div><div>캘린더 앱이 필요합니다</div><div style="font-size:12px;margin-top:8px;opacity:0.7;">고정 지출/입금 기능을 사용하려면<br>스토어에서 캘린더 앱을 설치하세요</div></div>`);
            return;
        }
        let html = `<div class="st-bank-toggle-section"><div class="st-bank-toggle-info"><div class="st-bank-toggle-label">고정 지출/입금 자동 처리</div><div class="st-bank-toggle-desc">RP 날짜가 바뀌면 자동으로 처리됩니다</div></div><div class="st-bank-toggle ${recurringEnabled ? 'active' : ''}" id="st-bank-recurring-toggle"></div></div><div class="st-bank-section"><div class="st-bank-section-header"><span class="st-bank-section-title">📤 고정 지출</span><button class="st-bank-add-btn" id="st-bank-add-expense">+</button></div><div class="st-bank-list" id="st-bank-expense-list">${recurringExpenses.length === 0 ? '<div class="st-bank-empty" style="padding:20px;"><div>등록된 고정 지출이 없습니다</div></div>' : recurringExpenses.map(e => `<div class="st-bank-item"><div class="st-bank-item-icon expense">🏠</div><div class="st-bank-item-info"><div class="st-bank-item-title">${e.name}</div><div class="st-bank-item-desc">매월 ${e.dayOfMonth}일</div></div><div class="st-bank-item-amount expense">-${formatAmount(e.amount)}</div><button class="st-bank-item-delete" data-type="expense" data-id="${e.id}">✕</button></div>`).join('')}</div></div><div class="st-bank-section"><div class="st-bank-section-header"><span class="st-bank-section-title">📥 고정 입금</span><button class="st-bank-add-btn" id="st-bank-add-income">+</button></div><div class="st-bank-list" id="st-bank-income-list">${recurringIncomes.length === 0 ? '<div class="st-bank-empty" style="padding:20px;"><div>등록된 고정 입금이 없습니다</div></div>' : recurringIncomes.map(i => `<div class="st-bank-item"><div class="st-bank-item-icon income">💼</div><div class="st-bank-item-info"><div class="st-bank-item-title">${i.name}</div><div class="st-bank-item-desc">매월 ${i.dayOfMonth}일</div></div><div class="st-bank-item-amount income">+${formatAmount(i.amount)}</div><button class="st-bank-item-delete" data-type="income" data-id="${i.id}">✕</button></div>`).join('')}</div></div>`;
        $content.append(html);
        attachRecurringListeners();
    }

    function renderSettingsTab($content) {
        const html = `<div class="st-bank-section"><div class="st-bank-section-title" style="margin-bottom:15px;">잔액 직접 설정</div><div class="st-bank-item" style="flex-direction:column;align-items:stretch;gap:12px;"><input type="number" class="st-bank-modal-input" id="st-bank-set-balance" value="${balance}" placeholder="새 잔액 입력" style="margin:0;"><button class="st-bank-modal-btn confirm" id="st-bank-apply-balance">적용</button></div></div><div class="st-bank-section"><div class="st-bank-section-title" style="margin-bottom:15px;">데이터 관리</div><button class="st-bank-modal-btn danger" id="st-bank-reset" style="width:100%;">🗑️ 모든 데이터 초기화</button></div>`;
        $content.append(html);
        $('#st-bank-apply-balance').on('click', async () => {
            const newBalance = parseInt($('#st-bank-set-balance').val());
            if (!isNaN(newBalance)) {
                balance = newBalance;
                await saveData();
                updateBalanceDisplay();
                toastr.success('잔액이 변경되었습니다.');
            }
        });
        $('#st-bank-reset').on('click', async () => {
            if (confirm('정말로 모든 은행 데이터를 초기화하시겠습니까?')) {
                resetData();
                await saveData();
                open();
                toastr.info('은행 데이터가 초기화되었습니다.');
            }
        });
    }

    function updateBalanceDisplay() {
        $('#st-bank-balance').text(formatAmount(balance));
    }

    function attachListeners() {
        $('.st-bank-tab').on('click', function() {
            const tab = $(this).data('tab');
            $('.st-bank-tab').removeClass('active');
            $(this).addClass('active');
            renderTab(tab);
        });
        $('#st-bank-currency').on('change', async function() {
            currency = $(this).val();
            await saveData();
            updateBalanceDisplay();
        });
        $('#st-bank-send').on('click', showSendModal);
        $('#st-bank-receive').on('click', () => {
            currentTab = 'home';
            $('.st-bank-tab').removeClass('active');
            $('.st-bank-tab[data-tab="home"]').addClass('active');
            renderTab('home');
        });
        $('#st-bank-history').on('click', showHistoryModal);
    }

    function attachPendingListeners() {
        $('.st-bank-pending-btn.accept').on('click', async function() {
            const id = $(this).data('id');
            await acceptTransfer(id);
            renderTab('home');
            updateBalanceDisplay();
        });
        $('.st-bank-pending-btn.decline').on('click', async function() {
            const id = $(this).data('id');
            await declineTransfer(id);
            renderTab('home');
        });
    }

    function attachRecurringListeners() {
        $('#st-bank-recurring-toggle').on('click', async function() {
            recurringEnabled = !recurringEnabled;
            $(this).toggleClass('active', recurringEnabled);
            await saveData();
        });
        $('#st-bank-add-expense').on('click', () => showAddRecurringModal('expense'));
        $('#st-bank-add-income').on('click', () => showAddRecurringModal('income'));
        $('.st-bank-item-delete').on('click', async function() {
            const type = $(this).data('type');
            const id = $(this).data('id');
            if (type === 'expense') await removeRecurringExpense(id);
            else await removeRecurringIncome(id);
            renderTab('recurring');
        });
    }

    function showSendModal() {
        const contacts = window.STPhone.Apps?.Contacts?.getAllContacts() || [];
        if (contacts.length === 0) { toastr.warning('송금할 연락처가 없습니다. 먼저 연락처를 추가하세요.'); return; }
        const curr = CURRENCIES[currency];
        const modalHtml = `<div class="st-bank-modal" id="st-bank-modal"><div class="st-bank-modal-content"><div class="st-bank-modal-title">💰 송금하기</div><div style="margin-bottom:12px;font-size:13px;color:var(--pt-sub-text);">받는 사람</div><div class="st-bank-contact-list" id="st-bank-contact-list">${contacts.map(c => `<div class="st-bank-contact-item" data-id="${c.id}" data-name="${c.name}"><img class="st-bank-contact-avatar" src="${c.avatar || 'https://via.placeholder.com/36'}" onerror="this.src='https://via.placeholder.com/36'"><span class="st-bank-contact-name">${c.name}</span><div class="st-bank-contact-check">✓</div></div>`).join('')}</div><input type="number" class="st-bank-modal-input" id="st-bank-send-amount" placeholder="금액 입력"><input type="text" class="st-bank-modal-input" id="st-bank-send-memo" placeholder="메모 (선택)"><div class="st-bank-checkbox-row" style="margin:12px 0;display:flex;align-items:center;gap:8px;"><input type="checkbox" id="st-bank-request-reply" checked><label for="st-bank-request-reply" style="font-size:13px;color:var(--pt-sub-text);cursor:pointer;">문자로 반응 요청</label></div><div class="st-bank-modal-buttons"><button class="st-bank-modal-btn cancel" id="st-bank-modal-cancel">취소</button><button class="st-bank-modal-btn confirm" id="st-bank-modal-confirm">송금</button></div></div></div>`;
        $('.st-bank-app').append(modalHtml);
        let selectedContactId = null;
        let selectedContactName = null;
        $('.st-bank-contact-item').on('click', function() {
            $('.st-bank-contact-item').removeClass('selected');
            $(this).addClass('selected');
            selectedContactId = $(this).data('id');
            selectedContactName = $(this).data('name');
        });
        $('#st-bank-modal-cancel').on('click', () => $('#st-bank-modal').remove());
        $('#st-bank-modal').on('click', function(e) { if (e.target === this) $(this).remove(); });
        $('#st-bank-modal-confirm').on('click', async () => {
            if (!selectedContactId) { toastr.warning('받는 사람을 선택하세요.'); return; }
            const amount = parseInt($('#st-bank-send-amount').val());
            const memo = $('#st-bank-send-memo').val().trim();
            const requestReply = $('#st-bank-request-reply').is(':checked');
            if (!amount || amount <= 0) { toastr.warning('올바른 금액을 입력하세요.'); return; }
            if (amount > balance) { toastr.error('잔액이 부족합니다.'); return; }
            await subtractBalance(amount, `${selectedContactName}에게 송금${memo ? ': ' + memo : ''}`);
            updateBalanceDisplay();
            $('#st-bank-modal').remove();
            toastr.success(`💰 ${selectedContactName}에게 ${formatAmount(amount)} 송금 완료!`);
            const myName = getUserName();
            const transferMsg = `[💰 ${myName} 송금 ${selectedContactName}: ${amount}${curr.symbol}]${memo ? ' 메모: ' + memo : ''}`;
            addHiddenLog(myName, transferMsg);
            const Messages = window.STPhone?.Apps?.Messages;
            if (Messages) {
                const sysMsg = `💰 ${formatAmount(amount)} 송금했습니다.${memo ? '\n메모: ' + memo : ''}`;
                Messages.addMessage(selectedContactId, 'me', sysMsg);
                if (typeof Messages.updateMessagesBadge === 'function') Messages.updateMessagesBadge();
                if (requestReply && typeof Messages.generateTransferReply === 'function') {
                    setTimeout(() => { Messages.generateTransferReply(selectedContactId, selectedContactName, amount, memo); }, 500);
                }
            }
        });
    }

    function showHistoryModal() {
        const modalHtml = `<div class="st-bank-modal" id="st-bank-modal"><div class="st-bank-modal-content" style="width:340px;"><div class="st-bank-modal-title">📋 거래 내역</div><div style="max-height:400px;overflow-y:auto;">${transactionHistory.length === 0 ? '<div class="st-bank-empty"><div>거래 내역이 없습니다</div></div>' : transactionHistory.map(t => `<div class="st-bank-history-item" style="margin-bottom:8px;"><div class="st-bank-history-icon ${t.type === 'income' ? 'in' : 'out'}">${t.type === 'income' ? '📥' : '📤'}</div><div class="st-bank-history-info"><div class="st-bank-history-title">${t.description}</div><div class="st-bank-history-date">${new Date(t.timestamp).toLocaleString()}</div></div><div class="st-bank-history-amount ${t.type === 'income' ? 'in' : 'out'}">${t.type === 'income' ? '+' : '-'}${formatAmount(t.amount)}</div></div>`).join('')}</div><div class="st-bank-modal-buttons"><button class="st-bank-modal-btn confirm" id="st-bank-modal-close" style="flex:1;">닫기</button></div></div></div>`;
        $('.st-bank-app').append(modalHtml);
        $('#st-bank-modal-close').on('click', () => $('#st-bank-modal').remove());
        $('#st-bank-modal').on('click', function(e) { if (e.target === this) $(this).remove(); });
    }

    function showAddRecurringModal(type) {
        const isExpense = type === 'expense';
        const title = isExpense ? '📤 고정 지출 추가' : '📥 고정 입금 추가';
        const placeholder = isExpense ? '예: 월세, 통신비' : '예: 월급, 용돈';
        const dayOptions = Array.from({length: 28}, (_, i) => `<option value="${i + 1}">${i + 1}일</option>`).join('');
        const modalHtml = `<div class="st-bank-modal" id="st-bank-modal"><div class="st-bank-modal-content"><div class="st-bank-modal-title">${title}</div><input type="text" class="st-bank-modal-input" id="st-bank-recurring-name" placeholder="${placeholder}"><div class="st-bank-modal-row"><input type="number" class="st-bank-modal-input" id="st-bank-recurring-amount" placeholder="금액"><select class="st-bank-modal-select" id="st-bank-recurring-day">${dayOptions}</select></div><div class="st-bank-modal-buttons"><button class="st-bank-modal-btn cancel" id="st-bank-modal-cancel">취소</button><button class="st-bank-modal-btn confirm" id="st-bank-modal-confirm">추가</button></div></div></div>`;
        $('.st-bank-app').append(modalHtml);
        $('#st-bank-modal-cancel').on('click', () => $('#st-bank-modal').remove());
        $('#st-bank-modal').on('click', function(e) { if (e.target === this) $(this).remove(); });
        $('#st-bank-modal-confirm').on('click', async () => {
            const name = $('#st-bank-recurring-name').val().trim();
            const amount = parseInt($('#st-bank-recurring-amount').val());
            const day = parseInt($('#st-bank-recurring-day').val());
            if (!name) { toastr.warning('이름을 입력하세요.'); return; }
            if (!amount || amount <= 0) { toastr.warning('올바른 금액을 입력하세요.'); return; }
            if (isExpense) {
                await addRecurringExpense(name, amount, day);
                toastr.success(`📤 고정 지출 "${name}" 추가됨`);
            } else {
                await addRecurringIncome(name, amount, day);
                toastr.success(`📥 고정 입금 "${name}" 추가됨`);
            }
            $('#st-bank-modal').remove();
            renderTab('recurring');
        });
    }

    function getUserName() {
        const settings = window.STPhone?.Apps?.Settings?.getSettings?.() || {};
        if (settings.userName) return settings.userName;
        const ctx = window.SillyTavern?.getContext?.();
        return ctx?.name1 || '유저';
    }

    function addHiddenLog(sender, text) {
        if (!window.SillyTavern) return;
        const context = window.SillyTavern.getContext();
        if (!context || !context.chat) return;
        context.chat.push({ name: sender, is_user: true, mes: text, extra: { isSmallSys: true, is_phone_log: true } });
        if (window.SlashCommandParser && window.SlashCommandParser.commands['savechat']) {
            window.SlashCommandParser.commands['savechat'].callback({});
        }
    }

    async function init() {
        await loadData();
    }

    return {
        open,
        init,
        getBalance,
        getCurrency,
        formatAmount,
        addBalance,
        subtractBalance,
        addPendingTransfer,
        acceptTransfer,
        declineTransfer,
        generateBalancePrompt,
        generateBankSystemPrompt,
        parseTransferFromResponse,
        processRecurringOnDateChange,
        isInstalled: () => window.STPhone?.Apps?.Store?.isInstalled?.('bank')
    };
})();