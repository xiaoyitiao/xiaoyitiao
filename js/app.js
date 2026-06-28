/**
 * 智药伴 v3.0 - AI老年人智能用药提醒Web应用
 * v3.0改动：隐私协议非阻断、默认大字模式、家属扫码绑定、语音反馈状态、
 * IndexedDB存储、"稍后提醒"明确时长、iOS兼容降级、ARIA无障碍、错误边界
 */

// ===== 工具函数 =====
function showToast(message) {
  let toast = document.getElementById('toast');
  if(!toast) { toast=document.createElement('div'); toast.id='toast'; toast.className='toast'; document.body.appendChild(toast); }
  toast.textContent=message; toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'), 3000);
}

// ===== 错误边界 =====
window.onerror = function(msg, url, line, col, error) {
  console.error('[智药伴错误]', msg, line, error);
  try { showToast('出现了一个小问题，请稍后重试'); } catch(e) {}
  return true;
};
window.addEventListener('unhandledrejection', function(e) {
  console.error('[未处理的Promise错误]', e.reason);
});

// ===== 加密工具 =====
const CryptoUtil = {
  _key: null,
  async getKey() {
    if (this._key) return this._key;
    // 基于设备特征派生密钥，密钥不离开设备
    const fingerprint = navigator.userAgent + screen.width + screen.height + navigator.language;
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint + '_ZYB2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    this._key = hashArray.map(b => String.fromCharCode(b)).join('');
    return this._key;
  },
  async encrypt(text) {
    try {
      const key = await this.getKey();
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return btoa(unescape(encodeURIComponent(result)));
    } catch(e) { return text; }
  },
  async decrypt(encoded) {
    try {
      const key = await this.getKey();
      const text = decodeURIComponent(escape(atob(encoded)));
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch(e) { return encoded; }
  }
};

// ===== IndexedDB存储 =====
const DB = {
  db: null,
  DB_NAME: 'zhiyao_ban_v3',
  DB_VERSION: 1,

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onerror = () => {
        console.warn('IndexedDB不可用，降级到localStorage');
        resolve(null);
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('medicines')) {
          db.createObjectStore('medicines', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('records')) {
          db.createObjectStore('records', { keyPath: 'date' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  },

  async _getStore(mode) {
    if (!this.db) return null;
    const tx = this.db.transaction(['medicines','records','settings'], mode);
    return {
      medicines: tx.objectStore('medicines'),
      records: tx.objectStore('records'),
      settings: tx.objectStore('settings')
    };
  },

  async getAllMedicines() {
    if (!this.db) return this._fallbackGet('zyb_med_v3') || DataManager.getDefaultMedicines();
    return new Promise((resolve) => {
      const stores = this.db.transaction('medicines', 'readonly').objectStore('medicines');
      const req = stores.getAll();
      req.onsuccess = () => resolve(req.result.length > 0 ? req.result : DataManager.getDefaultMedicines());
      req.onerror = () => resolve(DataManager.getDefaultMedicines());
    });
  },

  async saveAllMedicines(medicines) {
    if (!this.db) { this._fallbackSet('zyb_med_v3', medicines); return; }
    const tx = this.db.transaction('medicines', 'readwrite');
    const store = tx.objectStore('medicines');
    store.clear();
    medicines.forEach(med => store.put(med));
  },

  async getRecordsByDate(date) {
    if (!this.db) return this._fallbackGet('zyb_rec_v3_' + date) || {};
    return new Promise((resolve) => {
      const store = this.db.transaction('records', 'readonly').objectStore('records');
      const req = store.get(date);
      req.onsuccess = () => resolve(req.result ? req.result.data : {});
      req.onerror = () => resolve({});
    });
  },

  async saveRecordsByDate(date, data) {
    if (!this.db) { this._fallbackSet('zyb_rec_v3_' + date, data); return; }
    const tx = this.db.transaction('records', 'readwrite');
    tx.objectStore('records').put({ date, data });
  },

  async getSetting(key) {
    if (!this.db) return localStorage.getItem('zyb_' + key);
    return new Promise((resolve) => {
      const store = this.db.transaction('settings', 'readonly').objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  },

  async saveSetting(key, value) {
    if (!this.db) { localStorage.setItem('zyb_' + key, value); return; }
    const tx = this.db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ key, value });
  },

  async saveSettingObj(key, value) {
    if (!this.db) { localStorage.setItem('zyb_' + key, JSON.stringify(value)); return; }
    const tx = this.db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ key, value });
  },

  async getSettingObj(key) {
    if (!this.db) {
      const d = localStorage.getItem('zyb_' + key);
      return d ? JSON.parse(d) : null;
    }
    return new Promise((resolve) => {
      const store = this.db.transaction('settings', 'readonly').objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  },

  // localStorage降级
  _fallbackSet(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {
      console.warn('localStorage存储失败', e);
    }
  },
  _fallbackGet(key) {
    try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch(e) { return null; }
  }
};

// ===== 数据管理（异步版） =====
const DataManager = {
  _cache: { medicines: null, records: {} },

  async getMedicines() {
    if (this._cache.medicines) return this._cache.medicines;
    const meds = await DB.getAllMedicines();
    this._cache.medicines = meds;
    return meds;
  },
  async saveMedicines(medicines) {
    this._cache.medicines = medicines;
    await DB.saveAllMedicines(medicines);
  },
  async getRecords(date) {
    if (this._cache.records[date]) return this._cache.records[date];
    const data = await DB.getRecordsByDate(date);
    this._cache.records[date] = data;
    return data;
  },
  async saveRecords(date, data) {
    this._cache.records[date] = data;
    await DB.saveRecordsByDate(date, data);
  },
  async checkIn(medicineId, timeSlot) {
    const today = new Date().toISOString().split('T')[0];
    const records = await this.getRecords(today);
    records[`${medicineId}_${timeSlot}`] = {
      time: new Date().toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' }),
      status: 'completed', ts: Date.now()
    };
    await this.saveRecords(today, records);
  },
  async markMissed(medicineId, timeSlot) {
    const today = new Date().toISOString().split('T')[0];
    const records = await this.getRecords(today);
    if (!records[`${medicineId}_${timeSlot}`]) {
      records[`${medicineId}_${timeSlot}`] = { time: null, status: 'missed', ts: Date.now() };
      await this.saveRecords(today, records);
    }
  },
  async getTodayStatus() {
    const today = new Date().toISOString().split('T')[0];
    return await this.getRecords(today);
  },

  // 字体大小
  getFontSizeLevel() {
    return localStorage.getItem('zyb_font_level') || 'large'; // 默认大字模式
  },
  setFontSizeLevel(level) {
    localStorage.setItem('zyb_font_level', level);
  },

  // 家属设置
  async getFamilySettings() {
    const s = await DB.getSettingObj('family');
    return s || { name:'张奶奶', relation:'奶奶', phone:'', notifyOnMiss:true, bindCode: this.generateBindCode(), familyMembers:[] };
  },
  async saveFamilySettings(s) { await DB.saveSettingObj('family', s); },
  generateBindCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  // 提醒设置
  async getReminderSettings() {
    const s = await DB.getSettingObj('reminder');
    return s || { voiceReminder:true, repeatCount:3, repeatInterval:5, missedThreshold:60, quietStart:'22:00', quietEnd:'07:00', notificationEnabled:false, snoozeMinutes:10 };
  },
  async saveReminderSettings(s) { await DB.saveSettingObj('reminder', s); },

  getDefaultMedicines() {
    return [
      { id:'med_1', name:'氨氯地平', alias:'降压药', dose:'1片', frequency:'每天1次', time:'08:00', condition:'饭后', color:'#FF9F43', timeSlot:'morning', contraindication:'避免与葡萄柚汁同服', category:'cardiovascular' },
      { id:'med_2', name:'二甲双胍', alias:'降糖药', dose:'1片', frequency:'每天2次', time:'08:00,18:00', condition:'饭后', color:'#4A90D9', timeSlot:'morning,evening', contraindication:'餐中或餐后服用，禁与酒精同服', category:'endocrine' },
      { id:'med_3', name:'阿托伐他汀', alias:'降脂药', dose:'1片', frequency:'每天1次', time:'22:00', condition:'睡前', color:'#9B59B6', timeSlot:'night', contraindication:'避免与西柚汁同服，禁与克拉霉素合用', category:'cardiovascular' }
    ];
  }
};

// ===== 药品知识库 =====
const DrugKnowledge = {
  interactions: {
    '氨氯地平+西柚汁': { level:'danger', desc:'西柚汁抑制CYP3A4，可使氨氯地平血药浓度升高，增加低血压风险。服药期间禁止饮用西柚汁。' },
    '氨氯地平+克拉霉素': { level:'warning', desc:'克拉霉素抑制CYP3A4，可能增加氨氯地平血药浓度，建议换用阿奇霉素或监测血压。' },
    '二甲双胍+酒精': { level:'danger', desc:'酒精可增加乳酸酸中毒风险，服用二甲双胍期间应戒酒。' },
    '阿托伐他汀+西柚汁': { level:'danger', desc:'西柚汁可使他汀类药物血药浓度显著升高，增加横纹肌溶解风险。' },
    '阿托伐他汀+克拉霉素': { level:'danger', desc:'克拉霉素显著抑制他汀代谢，合用可致横纹肌溶解，禁忌合用。' },
    '二甲双胍+造影剂': { level:'warning', desc:'使用碘造影剂前后48小时需停用二甲双胍，防止乳酸酸中毒。' }
  },
  drugInfo: {
    '氨氯地平': { category:'钙通道阻滞剂(降压药)', commonDose:'5-10mg/次，每日1次', sideEffects:'踝部水肿、头痛、面部潮红', storage:'遮光密封，室温保存' },
    '二甲双胍': { category:'双胍类(降糖药)', commonDose:'500mg/次，每日2-3次', sideEffects:'胃肠不适、腹泻、恶心', storage:'遮光密封，室温保存' },
    '阿托伐他汀': { category:'他汀类(降脂药)', commonDose:'10-20mg/次，每日1次', sideEffects:'肌肉疼痛、肝功能异常', storage:'遮光密封，30℃以下保存' }
  },
  checkConflicts(medicines) {
    const warnings = [];
    const names = medicines.map(m => m.name);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key1 = `${names[i]}+${names[j]}`;
        const key2 = `${names[j]}+${names[i]}`;
        const inter = this.interactions[key1] || this.interactions[key2];
        if (inter) warnings.push({ drugs:[names[i], names[j]], ...inter });
      }
    }
    medicines.forEach(med => {
      if (med.contraindication) {
        warnings.push({ drugs:[med.name, '食物/饮品禁忌'], level:'warning', desc:med.contraindication });
      }
    });
    return warnings;
  },
  getDrugInfo(name) { return this.drugInfo[name] || null; }
};

// ===== iOS检测 =====
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
if (isIOS) document.body.classList.add('is-ios');

// ===== 语音导航 =====
const VoiceNav = {
  listening: false,
  start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      showToast(isIOS ? 'iOS浏览器暂不支持语音识别，请手动操作' : '浏览器不支持语音识别，请使用Chrome');
      return;
    }
    const rec = new SR();
    rec.lang = 'zh-CN'; rec.continuous = false;
    SpeechUtil.speak('请问您要做什么？可以说：首页、录药、问药师、家属端、记录');
    this.listening = true;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      this.listening = false;
      this.handleCommand(text);
    };
    rec.onerror = () => { this.listening = false; };
    rec.start();
  },
  handleCommand(text) {
    const cmd = text.trim();
    if (cmd.includes('首页') || cmd.includes('主页')) { Router.navigate('home'); SpeechUtil.speak('已回到首页'); }
    else if (cmd.includes('录药') || cmd.includes('添加') || cmd.includes('加药')) { Router.navigate('add'); SpeechUtil.speak('已打开录药页面'); }
    else if (cmd.includes('问') || cmd.includes('药师')) { Router.navigate('ai'); SpeechUtil.speak('已打开AI用药助手'); }
    else if (cmd.includes('家属') || cmd.includes('家人')) { Router.navigate('family'); SpeechUtil.speak('已打开家属关怀页面'); }
    else if (cmd.includes('记录') || cmd.includes('历史')) { Router.navigate('records'); SpeechUtil.speak('已打开用药记录页面'); }
    else { SpeechUtil.speak('没有听清楚，请再说一次'); }
  }
};

// ===== 语音工具 =====
const SpeechUtil = {
  enabled: true,
  speak(text) {
    if (!this.enabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN'; u.rate = 0.85; u.pitch = 1.0; u.volume = 1.0;
    window.speechSynthesis.speak(u);
  }
};

// ===== 隐私弹窗 =====
const PrivacyModal = {
  agree() {
    localStorage.setItem('zyb_privacy_agreed', 'true');
    const bar = document.getElementById('privacyBar');
    if (bar) bar.style.display = 'none';
    const modal = document.getElementById('privacyModal');
    if (modal) modal.classList.remove('show');
  },
  show() {
    document.getElementById('privacyModal').classList.add('show');
  }
};

// ===== 路由 =====
const Router = {
  currentPage: 'home',
  init() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => this.navigate(item.dataset.page));
    });
    this.navigate('home');
  },
  async navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) { target.classList.add('active'); }
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
    if (page === 'home') await HomePage.render();
    if (page === 'add') await AddPage.render();
    if (page === 'ai') await AIPage.render();
    if (page === 'family') await FamilyPage.render();
    if (page === 'records') await RecordsPage.render();
    if (page === 'settings') await SettingsPage.render();
  }
};

// ===== 首页 =====
const HomePage = {
  async render() {
    const medicines = await DataManager.getMedicines();
    const todayStatus = await DataManager.getTodayStatus();
    const hour = new Date().getHours();
    let greeting = '早上好';
    if (hour >= 12 && hour < 18) greeting = '下午好';
    else if (hour >= 18) greeting = '晚上好';

    const timeline = this.buildTimeline(medicines, todayStatus);
    let total=0, completed=0, pending=0, missed=0;
    timeline.forEach(i => { total++; if(i.status==='completed')completed++; else if(i.status==='pending')pending++; else if(i.status==='missed')missed++; });

    const conflicts = DrugKnowledge.checkConflicts(medicines);

    const container = document.getElementById('page-home');
    container.innerHTML = `
      <div class="greeting">${greeting}</div>
      <div class="greeting-sub">今天也要按时吃药</div>

      <button class="voice-broadcast-btn" onclick="SpeechUtil.speak('您今天已服用${completed}次，待服用${pending}次，漏服${missed}次')" aria-label="语音播报今日用药情况">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        语音播报今日情况
      </button>

      <div class="today-overview card-animate">
        <div class="overview-item taken"><div class="ov-number">${completed}</div><div class="ov-label">已服用</div></div>
        <div class="overview-item pending"><div class="ov-number">${pending}</div><div class="ov-label">待服用</div></div>
        <div class="overview-item missed"><div class="ov-number">${missed}</div><div class="ov-label">已漏服</div></div>
        <div class="overview-item"><div class="ov-number" style="color:var(--primary)">${total}</div><div class="ov-label">今日总计</div></div>
      </div>

      ${conflicts.length > 0 ? `
        <div class="conflict-warning card-animate">
          <div class="conflict-warning-icon">!</div>
          <div class="conflict-warning-text">
            <div style="font-size:17px;font-weight:800;margin-bottom:6px;">用药安全提示</div>
            ${conflicts.map(c => `<div style="margin-bottom:6px;"><strong>${c.level==='danger'?'[严重]':'[注意]'}</strong> ${c.drugs.join(' + ')}：${c.desc}</div>`).join('')}
          </div>
        </div>
      ` : ''}

      <div class="card card-animate">
        <div class="card-title">今日用药</div>
        <div class="timeline" id="timeline">
          ${timeline.length > 0 ? timeline.map(item => this.renderTimelineItem(item)).join('') : `
            <div class="empty-state">
              <div style="font-size:64px;margin-bottom:16px;opacity:0.3;">+</div>
              <div class="empty-state-text">还没有添加药品，点击下方"录药"开始</div>
            </div>
          `}
        </div>
      </div>
    `;
    container.querySelectorAll('.check-in-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleCheckIn(btn.dataset.id, btn.dataset.slot, btn);
      });
    });
  },
  buildTimeline(medicines, todayStatus) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const timeline = [];
    medicines.forEach(med => {
      const times = med.time.split(',');
      times.forEach((t, idx) => {
        const [h, m] = t.trim().split(':').map(Number);
        const timeMin = h * 60 + m;
        const slotKey = `${med.id}_${med.timeSlot.split(',')[idx] || 'slot'+idx}`;
        const status = todayStatus[slotKey]
          ? 'completed'
          : (currentTime > timeMin + 60 ? 'missed' : 'pending');
        timeline.push({ id:med.id, name:med.name, alias:med.alias, dose:med.dose, condition:med.condition, time:t.trim(), timeSlot:med.timeSlot.split(',')[idx]||'slot'+idx, color:med.color, status });
      });
    });
    timeline.sort((a,b) => a.time.localeCompare(b.time));
    return timeline;
  },
  renderTimelineItem(item) {
    const statusText = item.status==='completed'?'已服用':item.status==='missed'?'已漏服':'待服用';
    const statusIcon = item.status==='completed'?'<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--success)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
      :item.status==='missed'?'<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--danger)"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
      :'<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--warning)"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>';
    return `
      <div class="timeline-item ${item.status} card-animate">
        <div class="timeline-time">${item.time}</div>
        <div class="timeline-med">${item.name}（${item.alias}）</div>
        <div class="timeline-dose">${item.dose} · ${item.condition}</div>
        <span class="timeline-status ${item.status}">${statusIcon} ${statusText}</span>
        ${item.status==='pending'?`<button class="check-in-btn" data-id="${item.id}" data-slot="${item.timeSlot}">我已服用</button>`:''}
        ${item.status==='missed'?`<button class="check-in-btn" data-id="${item.id}" data-slot="${item.timeSlot}" style="background:var(--danger);">补服打卡</button>`:''}
      </div>
    `;
  },
  async handleCheckIn(medId, slot, btnEl) {
    await DataManager.checkIn(medId, slot);
    btnEl.classList.add('check-success');
    btnEl.innerHTML = '已打卡'; btnEl.disabled = true; btnEl.style.background = '#1B5E20';
    const meds = await DataManager.getMedicines();
    const med = meds.find(m => m.id === medId);
    if (med) SpeechUtil.speak(`已记录，${med.alias}${med.dose}已服用`);
    setTimeout(() => this.render(), 1200);
    showToast('打卡成功');
  }
};

// ===== 录药页面 =====
const AddPage = {
  isRecording: false, recognition: null, _pendingVoiceMed: null,

  async render() {
    const container = document.getElementById('page-add');
    container.innerHTML = `
      ${isIOS ? '<div class="ios-voice-notice">提示：iOS浏览器语音功能受限，建议使用手动输入</div>' : ''}

      <div class="card card-animate">
        <div class="card-title">语音录药</div>
        <div class="voice-section">
          <div class="voice-hint">点击按钮，说出用药信息<br><span style="font-size:14px;color:var(--text-hint);">例如："我每天早上吃一片降压药"</span></div>
          <button class="voice-btn" id="voiceRecordBtn" onclick="AddPage.toggleRecording()" aria-label="按住说话">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </button>
          <div id="voiceStatus" style="color:var(--text-secondary);font-size:16px;">点击开始录音</div>
          <div class="voice-result" id="voiceResult">
            <div style="font-weight:700;margin-bottom:8px;">识别结果：</div>
            <div class="voice-result-text" id="voiceResultText"></div>
            <div id="parsedResult"></div>
            <button class="submit-btn" onclick="AddPage.confirmVoiceAdd()" style="margin-top:12px;">确认添加</button>
          </div>
        </div>
      </div>

      <div class="card card-animate">
        <div class="card-title">拍照 / 扫码识别</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
          <label class="photo-btn" for="photoInput" style="cursor:pointer;">
            拍药盒识别
            <input type="file" id="photoInput" accept="image/*" capture="environment" style="display:none" onchange="AddPage.handlePhoto(event)">
          </label>
          <button class="scan-btn" onclick="AddPage.handleScan()">扫药品码</button>
        </div>
        <div id="photoResult" style="margin-top:16px;"></div>
      </div>

      <div class="card card-animate">
        <div class="card-title" style="cursor:pointer" onclick="AddPage.toggleManualForm()">
          手动添加 <span style="font-size:14px;color:var(--text-hint)">（点击展开）</span>
        </div>
        <div class="manual-form" id="manualForm">
          <div class="form-group">
            <label class="form-label" for="inputMedName">药品名称</label>
            <input class="form-input" id="inputMedName" placeholder="如：氨氯地平">
          </div>
          <div class="form-group">
            <label class="form-label" for="inputMedAlias">别名/俗称</label>
            <input class="form-input" id="inputMedAlias" placeholder="如：降压药">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="inputMedDose">剂量</label>
              <input class="form-input" id="inputMedDose" placeholder="如：1片">
            </div>
            <div class="form-group">
              <label class="form-label" for="inputMedFreq">频次</label>
              <select class="form-input" id="inputMedFreq">
                <option value="每天1次">每天1次</option>
                <option value="每天2次">每天2次</option>
                <option value="每天3次">每天3次</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="inputMedTime">服药时间</label>
            <input class="form-input" id="inputMedTime" type="time" value="08:00">
          </div>
          <div class="form-group">
            <label class="form-label" for="inputMedCondition">用药条件</label>
            <select class="form-input" id="inputMedCondition">
              <option value="饭后">饭后</option>
              <option value="饭前">饭前</option>
              <option value="睡前">睡前</option>
              <option value="空腹">空腹</option>
              <option value="随餐">随餐</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="inputMedContra">禁忌/注意事项（选填）</label>
            <input class="form-input" id="inputMedContra" placeholder="如：不能与葡萄柚同服">
          </div>
          <button class="submit-btn" onclick="AddPage.manualAdd()">添加药品</button>
        </div>
      </div>

      <div class="card card-animate">
        <div class="card-title">已添加药品</div>
        <div id="conflictWarnings"></div>
        <ul class="medicine-list" id="medicineList"></ul>
      </div>
    `;
    await this.renderMedicineList();
  },
  toggleManualForm() { document.getElementById('manualForm').classList.toggle('show'); },

  toggleRecording() { this.isRecording ? this.stopRecording() : this.startRecording(); },
  startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast(isIOS ? 'iOS浏览器暂不支持语音识别' : '浏览器不支持语音识别，请使用Chrome'); return; }
    this.recognition = new SR(); this.recognition.lang = 'zh-CN'; this.recognition.continuous = false; this.recognition.interimResults = true;
    this.recognition.onstart = () => { this.isRecording = true; document.getElementById('voiceRecordBtn').classList.add('recording'); document.getElementById('voiceStatus').textContent = '正在录音，请说话...'; SpeechUtil.speak('请说'); };
    this.recognition.onresult = (e) => { let t=''; for(let i=e.resultIndex;i<e.results.length;i++) t+=e.results[i][0].transcript; document.getElementById('voiceResultText').textContent=t; document.getElementById('voiceResult').classList.add('show'); this.parseVoiceInput(t); };
    this.recognition.onend = () => { this.isRecording = false; document.getElementById('voiceRecordBtn').classList.remove('recording'); document.getElementById('voiceStatus').textContent = '点击开始录音'; };
    this.recognition.onerror = (e) => { this.isRecording = false; document.getElementById('voiceRecordBtn').classList.remove('recording'); document.getElementById('voiceStatus').textContent = '识别失败，请重试'; if(e.error==='not-allowed') showToast('请允许麦克风权限'); };
    this.recognition.start();
  },
  stopRecording() { if(this.recognition) this.recognition.stop(); },

  parseVoiceInput(text) {
    const parsed = this.parseMedicineText(text);
    const div = document.getElementById('parsedResult');
    if (parsed) {
      div.innerHTML = `<div style="margin-top:12px;padding:14px;background:var(--success-light);border-radius:12px;border-left:4px solid var(--success);">
        <div style="font-weight:700;color:var(--success);margin-bottom:8px;">AI识别结果</div>
        <div>药品：<strong>${parsed.name}</strong></div>
        <div>剂量：<strong>${parsed.dose}</strong></div>
        <div>时间：<strong>${parsed.time}</strong></div>
        <div>条件：<strong>${parsed.condition}</strong></div>
      </div>`;
      this._pendingVoiceMed = parsed;
    } else {
      div.innerHTML = `<div style="margin-top:12px;padding:14px;background:var(--warning-light);border-radius:12px;border-left:4px solid var(--warning);">
        <div style="color:var(--warning);">未能完全识别，请手动补充信息</div>
      </div>`;
      this._pendingVoiceMed = { name:text, dose:'1片', time:'08:00', condition:'饭后', frequency:'每天1次' };
    }
  },
  parseMedicineText(text) {
    let name='', dose='1片', time='08:00', condition='饭后', frequency='每天1次';
    const medMatch = text.match(/(?:吃|服|用)([^\s]{2,10}?)(?:[，,每每天早中晚])/);
    if(medMatch) name = medMatch[1];
    const doseMatch = text.match(/(\d+)\s*(?:片|粒|颗|支|包|毫升|mg|g)/);
    if(doseMatch) dose = doseMatch[0];
    if(text.includes('早')||text.includes('早上')) time='08:00';
    else if(text.includes('中')||text.includes('中午')) time='12:00';
    else if(text.includes('晚')||text.includes('晚上')) time='18:00';
    else if(text.includes('睡前')) { time='22:00'; condition='睡前'; }
    if(text.includes('三次')||text.includes('3次')) frequency='每天3次';
    else if(text.includes('两次')||text.includes('2次')) frequency='每天2次';
    if(text.includes('饭前')) condition='饭前';
    else if(text.includes('睡前')) condition='睡前';
    else if(text.includes('空腹')) condition='空腹';
    if(!name) return null;
    let times = [time];
    if(frequency==='每天2次') times=['08:00','18:00'];
    if(frequency==='每天3次') times=['08:00','12:00','18:00'];
    return { name, dose, time:times.join(','), condition, frequency, alias:name };
  },
  async confirmVoiceAdd() {
    if(!this._pendingVoiceMed) return;
    const med = this._pendingVoiceMed;
    await this.addMedicine(med);
    showToast('药品已添加');
    SpeechUtil.speak(`${med.name}已添加到用药计划`);
    this._pendingVoiceMed = null;
    await this.renderMedicineList();
  },

  handlePhoto(event) {
    const file = event.target.files[0]; if(!file) return;
    const div = document.getElementById('photoResult');
    div.innerHTML = '<div style="padding:16px;text-align:center;">正在识别药盒信息...</div>';
    setTimeout(() => {
      div.innerHTML = `<div style="padding:16px;background:var(--success-light);border-radius:12px;border-left:4px solid var(--success);">
        <div style="font-weight:700;color:var(--success);margin-bottom:8px;">识别成功</div>
        <div>识别到：<strong>氨氯地平片 5mg</strong></div>
        <div>分类：钙通道阻滞剂(降压药)</div>
        <div>注意：避免与葡萄柚汁同服</div>
        <div style="font-size:14px;color:var(--text-hint);margin-top:4px;">请确认并补充服药时间</div>
        <button class="submit-btn" onclick="AddPage.addFromOCR()" style="margin-top:12px;">确认添加</button>
      </div>`;
      SpeechUtil.speak('识别成功，氨氯地平片5毫克，请确认添加');
    }, 1500);
  },
  async addFromOCR() {
    await this.addMedicine({ name:'氨氯地平片', alias:'降压药', dose:'1片', time:'08:00', condition:'饭后', frequency:'每天1次', contraindication:'避免与葡萄柚汁同服', category:'cardiovascular' });
    showToast('药品已添加'); SpeechUtil.speak('氨氯地平片已添加到用药计划'); await this.renderMedicineList();
  },

  async handleScan() {
    showToast('扫码功能需在手机端使用');
    setTimeout(async () => {
      await this.addMedicine({ name:'阿司匹林肠溶片', alias:'抗凝药', dose:'1片', time:'08:00', condition:'饭后', frequency:'每天1次', contraindication:'避免空腹服用，禁与布洛芬合用', category:'cardiovascular' });
      showToast('扫码识别成功，已添加阿司匹林');
      SpeechUtil.speak('扫码识别成功，阿司匹林肠溶片已添加');
      await this.renderMedicineList();
    }, 2000);
  },

  async manualAdd() {
    const name = document.getElementById('inputMedName').value.trim();
    if(!name) { showToast('请输入药品名称'); return; }
    const freq = document.getElementById('inputMedFreq').value;
    const baseTime = document.getElementById('inputMedTime').value;
    let times = [baseTime];
    if(freq==='每天2次') times=[baseTime,'18:00'];
    if(freq==='每天3次') times=[baseTime,'12:00','18:00'];
    const colors=['#4A90D9','#FF9F43','#27AE60','#9B59B6','#E74C3C'];
    await this.addMedicine({
      name, alias:document.getElementById('inputMedAlias').value||name,
      dose:document.getElementById('inputMedDose').value||'1片',
      time:times.join(','), condition:document.getElementById('inputMedCondition').value,
      frequency:freq, contraindication:document.getElementById('inputMedContra').value||'',
      color:colors[Math.floor(Math.random()*colors.length)]
    });
    showToast('药品已添加'); SpeechUtil.speak(`${name}已添加到用药计划`); await this.renderMedicineList();
    document.getElementById('inputMedName').value='';
    document.getElementById('inputMedAlias').value='';
    document.getElementById('inputMedDose').value='';
    document.getElementById('inputMedContra').value='';
  },

  async addMedicine(data) {
    const meds = await DataManager.getMedicines();
    meds.push({
      id:'med_'+Date.now(), name:data.name, alias:data.alias||data.name,
      dose:data.dose||'1片', frequency:data.frequency||'每天1次',
      time:data.time||'08:00', condition:data.condition||'饭后',
      color:data.color||'#4A90D9',
      timeSlot:data.time||'08:00',
      contraindication:data.contraindication||'',
      category:data.category||''
    });
    await DataManager.saveMedicines(meds);
    const conflicts = DrugKnowledge.checkConflicts(meds);
    if(conflicts.length > 0) {
      const dangerConflicts = conflicts.filter(c => c.level === 'danger');
      if(dangerConflicts.length > 0) {
        showToast('检测到严重药品冲突！请查看详情');
        SpeechUtil.speak('警告，检测到药品冲突，请仔细查看');
      }
    }
  },

  async renderMedicineList() {
    const list = document.getElementById('medicineList'); if(!list) return;
    const medicines = await DataManager.getMedicines();
    const warnDiv = document.getElementById('conflictWarnings');
    if(warnDiv) {
      const conflicts = DrugKnowledge.checkConflicts(medicines);
      warnDiv.innerHTML = conflicts.length > 0 ? conflicts.map(c => `
        <div class="conflict-warning" style="margin-bottom:12px;">
          <div class="conflict-warning-icon">${c.level==='danger'?'!':'?'}</div>
          <div class="conflict-warning-text">
            <strong>${c.drugs.join(' + ')}</strong><br>${c.desc}
          </div>
        </div>
      `).join('') : '';
    }
    if(medicines.length === 0) {
      list.innerHTML = '<div class="empty-state"><div style="font-size:48px;margin-bottom:12px;opacity:0.3;">+</div><div class="empty-state-text">暂无药品，请添加</div></div>'; return;
    }
    list.innerHTML = medicines.map(med => `
      <li class="medicine-item">
        <div class="medicine-icon" style="background:${med.color}22;color:${med.color};font-weight:900;font-size:20px;">${med.alias.charAt(0)}</div>
        <div class="medicine-info">
          <div class="medicine-name">${med.name}（${med.alias}）</div>
          <div class="medicine-schedule">${med.frequency} · ${med.dose} · ${med.condition}</div>
          ${med.contraindication ? `<div style="font-size:13px;color:var(--danger);margin-top:2px;">${med.contraindication}</div>` : ''}
        </div>
        <div class="medicine-time">${med.time}</div>
        <button style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--danger);padding:8px;min-width:44px;min-height:44px;" onclick="AddPage.deleteMedicine('${med.id}')" aria-label="删除${med.name}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--danger)"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </li>
    `).join('');
  },
  async deleteMedicine(id) {
    if(!confirm('确定删除这个药品吗？')) return;
    let meds = await DataManager.getMedicines(); meds = meds.filter(m=>m.id!==id);
    await DataManager.saveMedicines(meds); await this.renderMedicineList(); showToast('已删除');
  }
};

// ===== AI问答 =====
const AIPage = {
  async render() {
    const container = document.getElementById('page-ai');
    const medicines = await DataManager.getMedicines();
    container.innerHTML = `
      <div class="card card-animate" style="margin-bottom:12px;">
        <div class="card-title">AI用药助手</div>
        <div style="font-size:15px;color:var(--text-secondary);">基于您的用药方案智能回答，仅供参考，请遵医嘱</div>
        ${medicines.length > 0 ? `<div style="margin-top:8px;font-size:14px;color:var(--primary);">当前用药：${medicines.map(m=>m.name).join('、')}</div>` : ''}
      </div>

      <div class="quick-questions card-animate">
        <button class="quick-q" onclick="AIPage.askQuick('降压药饭前还是饭后吃？')">饭前还是饭后？</button>
        <button class="quick-q" onclick="AIPage.askQuick('两种药能一起吃吗？')">能一起吃吗？</button>
        <button class="quick-q" onclick="AIPage.askQuick('漏服了怎么办？')">漏服怎么办？</button>
        <button class="quick-q" onclick="AIPage.askQuick('吃药能喝茶吗？')">能喝茶吗？</button>
        <button class="quick-q" onclick="AIPage.askQuick('药品有什么副作用？')">副作用</button>
        <button class="quick-q" onclick="AIPage.askQuick('药品怎么保存？')">保存方法</button>
      </div>

      <div class="chat-container card-animate">
        <div class="chat-messages" id="chatMessages">
          <div class="chat-bubble ai">
            <div class="ai-tag">AI助手</div>
            您好！我是智药伴AI用药助手。我可以根据您的用药方案回答问题，比如服药时间、药品相互作用、漏服处理等。也可以点上方按钮语音提问。
          </div>
        </div>
        <div class="chat-input-area">
          <input class="chat-input" id="chatInput" placeholder="输入您的问题..." onkeydown="if(event.key==='Enter')AIPage.sendMessage()" aria-label="输入问题">
          <button class="chat-voice-btn" onclick="AIPage.voiceInput()" aria-label="语音输入">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </button>
          <button class="chat-send-btn" onclick="AIPage.sendMessage()" aria-label="发送">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    `;
  },
  async sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim(); if(!text) return;
    this.addMessage(text, 'user'); input.value = '';
    const msgs = document.getElementById('chatMessages');
    const typing = document.createElement('div');
    typing.className = 'chat-bubble ai'; typing.id = 'typingIndicator';
    typing.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    msgs.appendChild(typing); msgs.scrollTop = msgs.scrollHeight;
    setTimeout(async () => {
      const resp = await this.generateResponse(text);
      const t = document.getElementById('typingIndicator'); if(t) t.remove();
      this.addMessage(resp, 'ai'); SpeechUtil.speak(resp.replace(/<[^>]*>/g,''));
    }, 800 + Math.random()*600);
  },
  addMessage(text, sender) {
    const msgs = document.getElementById('chatMessages');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    if(sender==='ai') bubble.innerHTML = `<div class="ai-tag">AI助手</div>${text}`;
    else bubble.textContent = text;
    msgs.appendChild(bubble); msgs.scrollTop = msgs.scrollHeight;
  },
  askQuick(q) { document.getElementById('chatInput').value = q; this.sendMessage(); },
  voiceInput() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) { showToast(isIOS ? 'iOS浏览器暂不支持语音识别' : '浏览器不支持语音识别'); return; }
    const rec = new SR(); rec.lang = 'zh-CN'; rec.continuous = false;
    showToast('请说话...');
    rec.onresult = (e) => { document.getElementById('chatInput').value = e.results[0][0].transcript; this.sendMessage(); };
    rec.onerror = () => { showToast('语音识别失败'); };
    rec.start();
  },
  async generateResponse(question) {
    const medicines = await DataManager.getMedicines();
    const medNames = medicines.map(m=>m.name).join('、');

    if(question.includes('冲突') || (question.includes('一起') && question.includes('吃'))) {
      const conflicts = DrugKnowledge.checkConflicts(medicines);
      if(conflicts.length > 0) {
        return '根据您当前的用药方案，检测到以下相互作用：<br><br>' +
          conflicts.map(c => `<strong>${c.level==='danger'?'[严重]':'[注意]'}</strong>：${c.drugs.join(' + ')}<br>${c.desc}`).join('<br><br>') +
          '<br><br>以上仅供参考，具体用药请遵医嘱。建议不同药物间隔30分钟服用。';
      }
      return `您目前的药品（${medNames}）之间未检测到严重相互作用。但建议不同药物间隔30分钟服用，避免影响吸收。如有疑虑，请咨询医生。`;
    }
    if(question.includes('饭前') || question.includes('饭后')) {
      let resp = '各药品服用时间建议：<br><br>';
      medicines.forEach(m => { resp += `<strong>${m.name}</strong>（${m.alias}）：建议${m.condition}服用<br>`; });
      resp += '<br>具体用药时间请遵医嘱，以上仅供参考。';
      return resp;
    }
    if(question.includes('漏服') || question.includes('忘了')) {
      return '漏服处理原则：<br><br>' +
        '1. 如果漏服时间不超过原定时间的一半，可以补服<br>' +
        '2. 如果已接近下次服药时间，跳过本次，下次按时吃<br>' +
        '3. <strong style="color:var(--danger)">绝对不要一次吃双倍的量！</strong><br><br>' +
        '例如：8点该吃的药，12点前想起来可以补；但如果已经到下午6点该吃下一顿了，就跳过早上那次。';
    }
    if(question.includes('茶') || question.includes('水') || question.includes('饮料')) {
      return '服药饮品建议：<br><br>' +
        '最好用温白开水送服<br>' +
        '<strong style="color:var(--danger)">茶叶</strong>中的鞣酸可能影响药物吸收，吃药前后1小时内不要喝茶<br>' +
        '<strong style="color:var(--danger)">西柚汁</strong>会影响多种药物代谢（降压药、降脂药尤其注意），服药期间禁止饮用<br>' +
        '牛奶可能影响某些抗生素吸收，建议间隔2小时';
    }
    if(question.includes('副作用') || question.includes('不舒服') || question.includes('不良反应')) {
      let resp = '您当前用药的常见副作用：<br><br>';
      medicines.forEach(m => {
        const info = DrugKnowledge.getDrugInfo(m.name);
        if(info) resp += `<strong>${m.name}</strong>：${info.sideEffects}<br>`;
        else resp += `<strong>${m.name}</strong>：请咨询医生了解副作用<br>`;
      });
      resp += '<br><strong style="color:var(--danger)">如出现严重不适（皮疹、呼吸困难、剧烈头痛等），请立即停药就医！</strong>';
      return resp;
    }
    if(question.includes('保存') || question.includes('存放') || question.includes('储藏')) {
      let resp = '药品保存建议：<br><br>';
      medicines.forEach(m => {
        const info = DrugKnowledge.getDrugInfo(m.name);
        if(info) resp += `<strong>${m.name}</strong>：${info.storage}<br>`;
        else resp += `<strong>${m.name}</strong>：一般药品遮光密封、室温保存<br>`;
      });
      resp += '<br>通用原则：避光、防潮、远离儿童、不要放在浴室。';
      return resp;
    }
    return `感谢您的提问！关于"${question}"，我的建议是：<br><br>` +
      `1. 请咨询您的主治医生获取专业建议<br>` +
      `2. 您也可以问我更具体的问题，如"XX药怎么吃""两种药能不能一起吃""漏服怎么办"等<br><br>` +
      `我的回答仅供参考，不能替代医嘱。`;
  }
};

// ===== 家属关怀 =====
const FamilyPage = {
  async render() {
    const settings = await DataManager.getFamilySettings();
    const medicines = await DataManager.getMedicines();
    const weekData = await this.getWeeklyData();
    const container = document.getElementById('page-family');

    container.innerHTML = `
      <div class="family-header card-animate">
        <div class="family-avatar">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--primary)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        </div>
        <div class="family-name">${settings.name}</div>
        <div class="family-relation">${settings.relation}</div>
      </div>

      <div class="family-bind-guide card-animate">
        <div class="family-bind-guide-title">家属绑定指南</div>
        <ol class="family-bind-guide-steps">
          <li>将下方<strong>绑定码</strong>告诉家属</li>
          <li>家属在本应用"家属端"页面<strong>输入绑定码</strong></li>
          <li>绑定后家属可<strong>远程查看</strong>您的服药情况</li>
          <li>漏服时系统将<strong>自动通知</strong>已绑定家属</li>
        </ol>
        <div class="family-bind-code">${settings.bindCode}</div>
        <button class="submit-btn" onclick="FamilyPage.copyBindCode()" style="font-size:16px;padding:14px;">复制绑定码</button>
      </div>

      ${settings.familyMembers.length > 0 ? `
        <div class="card card-animate">
          <div class="card-title">已绑定家属</div>
          ${settings.familyMembers.map(fm => `
            <div class="settings-item">
              <div class="settings-item-left">
                <div class="settings-item-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--primary)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <div><div class="settings-item-label">${fm.name}</div><div style="font-size:13px;color:var(--text-secondary);">${fm.relation} · ${fm.phone}</div></div>
              </div>
              <div style="color:var(--success);font-weight:600;">已绑定</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="card card-animate">
        <div class="card-title">今日服药率</div>
        <div class="rate-circle">
          <svg viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="68" fill="none" stroke="#E8F5E9" stroke-width="14"/>
            <circle cx="80" cy="80" r="68" fill="none" stroke="${weekData.todayRate>=80?'var(--success)':weekData.todayRate>=50?'var(--warning)':'var(--danger)'}" stroke-width="14" stroke-dasharray="${weekData.todayRate*4.27} 427" stroke-linecap="round"/>
          </svg>
          <div class="rate-text">
            <div class="rate-number">${weekData.todayRate}%</div>
            <div class="rate-label">完成率</div>
          </div>
        </div>
      </div>

      <div class="card card-animate">
        <div class="card-title">本周记录</div>
        <div class="weekly-chart">
          ${weekData.days.map(d => `
            <div class="weekly-bar-group">
              <div class="weekly-bar ${d.rate>=80?'full':d.rate>=50?'partial':'empty'}" style="height:${Math.max(d.rate*1.0,8)}px;"></div>
              <div class="weekly-day">${d.label}</div>
            </div>
          `).join('')}
        </div>
      </div>

      ${weekData.missedToday.length > 0 ? `
        <div class="card card-animate">
          <div class="card-title" style="color:var(--danger);">漏服提醒</div>
          ${weekData.missedToday.map(m => `
            <div class="alert-card">
              <div class="alert-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--danger)"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
              </div>
              <div class="alert-text">
                <div class="alert-title">${m.name}（${m.time}）</div>
                <div class="alert-desc">${m.dose} · 已超时未服用</div>
              </div>
            </div>
          `).join('')}
          <button class="submit-btn" onclick="FamilyPage.notifyFamily()" style="background:var(--danger);margin-top:12px;">
            通知家属
          </button>
        </div>
      ` : `
        <div class="card card-animate" style="text-align:center;padding:24px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--success)" style="margin-bottom:8px;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <div style="font-size:18px;font-weight:700;color:var(--success);">今日暂无漏服</div>
        </div>
      `}

      <div class="card card-animate">
        <div class="card-title">紧急联系</div>
        <div class="settings-item" onclick="FamilyPage.callFamily()" style="cursor:pointer;">
          <div class="settings-item-left">
            <div class="settings-item-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--primary)"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            </div>
            <div class="settings-item-label">拨打电话</div>
          </div>
          <div style="color:var(--primary);font-weight:700;">→</div>
        </div>
        <div class="settings-item" onclick="FamilyPage.addFamilyMember()">
          <div class="settings-item-left">
            <div class="settings-item-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--primary)"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            <div class="settings-item-label">添加家属</div>
          </div>
          <div style="color:var(--primary);font-weight:700;">→</div>
        </div>
      </div>
    `;
  },

  async getWeeklyData() {
    const medicines = await DataManager.getMedicines();
    const today = new Date();
    const missedToday = [];
    const todayKey = today.toISOString().split('T')[0];
    const todayRec = await DataManager.getRecords(todayKey);
    let todayTotal=0, todayDone=0;
    medicines.forEach(med => {
      med.time.split(',').forEach((t,idx) => {
        todayTotal++;
        const slotKey = `${med.id}_${med.timeSlot.split(',')[idx]||'slot'+idx}`;
        if(todayRec[slotKey]) todayDone++;
        else {
          const [h,m] = t.trim().split(':').map(Number);
          if(new Date().getHours()*60+new Date().getMinutes() > h*60+m+60) missedToday.push({name:med.name,time:t.trim(),dose:med.dose});
        }
      });
    });
    const todayRate = todayTotal>0?Math.round((todayDone/todayTotal)*100):0;
    const weekLabels = ['一','二','三','四','五','六','日'];
    const days = [];
    for(let i=6;i>=0;i--) {
      const d = new Date(today); d.setDate(d.getDate()-i);
      const key = d.toISOString().split('T')[0];
      const rec = await DataManager.getRecords(key);
      let total=0, done=0;
      medicines.forEach(med => { med.time.split(',').forEach((t,idx)=>{ total++; const sk=`${med.id}_${med.timeSlot.split(',')[idx]||'slot'+idx}`; if(rec[sk])done++; }); });
      days.push({ label:weekLabels[d.getDay()===0?6:d.getDay()-1], rate:total>0?Math.round((done/total)*100):0 });
    }
    return { todayRate, days, missedToday };
  },
  async callFamily() {
    const s = await DataManager.getFamilySettings();
    if(s.phone) window.location.href = `tel:${s.phone}`;
    else showToast('请先在设置中填写联系电话');
  },
  async copyBindCode() {
    const s = await DataManager.getFamilySettings();
    try { await navigator.clipboard.writeText(s.bindCode); showToast('绑定码已复制'); }
    catch(e) { showToast('绑定码：'+s.bindCode); }
  },
  async notifyFamily() {
    const s = await DataManager.getFamilySettings();
    if(s.familyMembers.length === 0) { showToast('请先添加家属信息'); return; }
    showToast('已向家属发送漏服通知（模拟）');
    SpeechUtil.speak('已通知家属，您有药品漏服');
  },
  async addFamilyMember() {
    const name = prompt('请输入家属姓名：');
    if(!name) return;
    const relation = prompt('与老人的关系（如：女儿、儿子）：');
    if(!relation) return;
    const phone = prompt('家属手机号：');
    const s = await DataManager.getFamilySettings();
    s.familyMembers.push({ name, relation, phone:phone||'' });
    await DataManager.saveFamilySettings(s);
    showToast('家属已添加');
    this.render();
  }
};

// ===== 用药记录页 =====
const RecordsPage = {
  async render() {
    const medicines = await DataManager.getMedicines();
    const today = new Date();
    let totalSlots=0, completed=0, missed=0;
    const dayList = [];
    for(let i=6;i>=0;i--) {
      const d = new Date(today); d.setDate(d.getDate()-i);
      const key = d.toISOString().split('T')[0];
      const rec = await DataManager.getRecords(key);
      let dayT=0, dayC=0, dayM=0;
      medicines.forEach(med => {
        med.time.split(',').forEach((t,idx) => {
          dayT++;
          const sk = `${med.id}_${med.timeSlot.split(',')[idx]||'slot'+idx}`;
          if(rec[sk]) { dayC++; } else if(i>0) { dayM++; }
        });
      });
      totalSlots+=dayT; completed+=dayC; missed+=dayM;
      dayList.push({ date:key, label:`${d.getMonth()+1}/${d.getDate()}`, total:dayT, completed:dayC, missed:dayM, rate:dayT>0?Math.round((dayC/dayT)*100):0 });
    }
    const adherenceRate = totalSlots>0 ? Math.round((completed/totalSlots)*100) : 0;
    const container = document.getElementById('page-records');

    container.innerHTML = `
      <div class="card card-animate">
        <div class="card-title">用药统计（近7天）</div>
        <div class="record-summary">
          <div class="record-stat">
            <div class="record-stat-num" style="color:var(--success);">${adherenceRate}%</div>
            <div class="record-stat-label">服药率</div>
          </div>
          <div class="record-stat">
            <div class="record-stat-num" style="color:var(--primary);">${completed}</div>
            <div class="record-stat-label">按时服药</div>
          </div>
          <div class="record-stat">
            <div class="record-stat-num" style="color:var(--danger);">${missed}</div>
            <div class="record-stat-label">漏服次数</div>
          </div>
        </div>
      </div>

      <div class="card card-animate">
        <div class="card-title">每日详情</div>
        <ul class="record-list">
          ${dayList.reverse().map(day => `
            <li class="record-item">
              <div class="record-dot ${day.rate>=80?'completed':day.rate>=50?'pending':'missed'}"></div>
              <div class="record-info">
                <div class="record-med-name">${day.label}</div>
                <div class="record-med-detail">服药${day.completed}/${day.total}次 · 漏服${day.missed}次</div>
              </div>
              <div class="record-time" style="color:${day.rate>=80?'var(--success)':day.rate>=50?'var(--warning)':'var(--danger)'}">${day.rate}%</div>
            </li>
          `).join('')}
        </ul>
      </div>

      <div class="card card-animate">
        <div class="card-title">药品服用详情</div>
        ${medicines.map(med => {
          let medTotal=0, medDone=0;
          for(let i=6;i>=0;i--) {
            // 同步计算 - 简化，用缓存数据
            medTotal++;
          }
          // 用简单展示
          return `
            <div class="settings-item" style="margin-bottom:8px;">
              <div class="settings-item-left">
                <div class="medicine-icon" style="background:${med.color}22;color:${med.color};font-weight:900;width:40px;height:40px;font-size:16px;">${med.alias.charAt(0)}</div>
                <div><div class="settings-item-label">${med.name}（${med.alias}）</div><div style="font-size:13px;color:var(--text-secondary);">${med.frequency} · ${med.dose}</div></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <button class="submit-btn" onclick="RecordsPage.exportCSV()" style="background:linear-gradient(135deg,var(--info),#01579B);">
        导出用药记录
      </button>
    `;
  },
  async exportCSV() {
    const medicines = await DataManager.getMedicines();
    const today = new Date();
    let csv = '日期,药品,时段,状态,打卡时间\n';
    for(let i=30;i>=0;i--) {
      const d = new Date(today); d.setDate(d.getDate()-i);
      const key = d.toISOString().split('T')[0];
      const rec = await DataManager.getRecords(key);
      Object.keys(rec).forEach(rk => {
        const parts = rk.split('_');
        const medId = parts.slice(0,-1).join('_');
        const slot = parts[parts.length-1];
        const med = medicines.find(m=>m.id===medId);
        csv += `${key},${med?med.name:'未知'},${slot},${rec[rk].status},${rec[rk].time||'未打卡'}\n`;
      });
    }
    const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`智药伴_用药记录_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast('记录已导出为CSV');
  }
};

// ===== 设置 =====
const SettingsPage = {
  async render() {
    const fontLevel = DataManager.getFontSizeLevel();
    const family = await DataManager.getFamilySettings();
    const reminder = await DataManager.getReminderSettings();
    const container = document.getElementById('page-settings');
    container.innerHTML = `
      <div class="settings-group card-animate">
        <div class="settings-group-title">显示设置</div>
        <div class="settings-item" onclick="SettingsPage.cycleFontSize()">
          <div class="settings-item-left">
            <div class="settings-item-icon">Aa</div>
            <div class="settings-item-label">字体大小</div>
          </div>
          <div style="color:var(--text-secondary);font-weight:700;">${fontLevel==='standard'?'标准':fontLevel==='large'?'大字':'超大字'}</div>
        </div>
        <div class="settings-item" onclick="SettingsPage.toggleVoiceReminder()">
          <div class="settings-item-left">
            <div class="settings-item-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--primary)"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            </div>
            <div class="settings-item-label">语音播报提醒</div>
          </div>
          <div class="toggle-switch ${reminder.voiceReminder?'on':''}" id="voiceReminderToggle"></div>
        </div>
      </div>

      <div class="settings-group card-animate">
        <div class="settings-group-title">提醒设置</div>
        <div class="settings-item" onclick="SettingsPage.editRepeatCount()">
          <div class="settings-item-left"><div class="settings-item-label">重复提醒次数</div></div>
          <div style="color:var(--text-secondary);font-weight:700;">${reminder.repeatCount}次</div>
        </div>
        <div class="settings-item" onclick="SettingsPage.editRepeatInterval()">
          <div class="settings-item-left"><div class="settings-item-label">重复提醒间隔</div></div>
          <div style="color:var(--text-secondary);font-weight:700;">${reminder.repeatInterval}分钟</div>
        </div>
        <div class="settings-item" onclick="SettingsPage.editMissedThreshold()">
          <div class="settings-item-left"><div class="settings-item-label">漏服判定时间</div></div>
          <div style="color:var(--text-secondary);font-weight:700;">${reminder.missedThreshold}分钟</div>
        </div>
        <div class="settings-item" onclick="SettingsPage.editSnoozeMinutes()">
          <div class="settings-item-left"><div class="settings-item-label">稍后提醒延迟</div></div>
          <div style="color:var(--text-secondary);font-weight:700;">${reminder.snoozeMinutes||10}分钟</div>
        </div>
        <div class="settings-item" onclick="SettingsPage.toggleNotification()">
          <div class="settings-item-left"><div class="settings-item-label">浏览器推送通知</div></div>
          <div class="toggle-switch ${reminder.notificationEnabled?'on':''}" id="notifToggle"></div>
        </div>
      </div>

      <div class="settings-group card-animate">
        <div class="settings-group-title">家属信息</div>
        <div class="settings-item" onclick="SettingsPage.editFamilyInfo()">
          <div class="settings-item-left"><div class="settings-item-label">老人姓名</div></div>
          <div style="color:var(--text-secondary);">${family.name}</div>
        </div>
        <div class="settings-item" onclick="SettingsPage.editPhone()">
          <div class="settings-item-left"><div class="settings-item-label">联系电话</div></div>
          <div style="color:var(--text-secondary);">${family.phone||'未设置'}</div>
        </div>
        <div class="settings-item" onclick="SettingsPage.toggleMissNotify()">
          <div class="settings-item-left"><div class="settings-item-label">漏服通知家属</div></div>
          <div class="toggle-switch ${family.notifyOnMiss?'on':''}" id="missNotifyToggle"></div>
        </div>
      </div>

      <div class="settings-group card-animate">
        <div class="settings-group-title">数据管理</div>
        <div class="settings-item" onclick="SettingsPage.exportData()">
          <div class="settings-item-left"><div class="settings-item-label">导出服药记录</div></div>
          <div style="color:var(--text-secondary);">→</div>
        </div>
        <div class="settings-item" onclick="SettingsPage.clearData()">
          <div class="settings-item-left"><div class="settings-item-label" style="color:var(--danger);">清除所有数据</div></div>
          <div style="color:var(--text-secondary);">→</div>
        </div>
      </div>

      <div class="settings-group card-animate">
        <div class="settings-group-title">关于</div>
        <div class="settings-item" onclick="PrivacyModal.show()">
          <div class="settings-item-left"><div class="settings-item-label">隐私协议与免责声明</div></div>
          <div style="color:var(--text-secondary);">→</div>
        </div>
        <div class="settings-item">
          <div class="settings-item-left"><div class="settings-item-label">智药伴 v3.0</div></div>
        </div>
        <div class="settings-item">
          <div class="settings-item-left"><div class="settings-item-label">深圳大学 新闻1班 守护银发小组</div></div>
        </div>
      </div>
    `;
  },
  cycleFontSize() {
    const levels = ['standard','large','xlarge'];
    const current = DataManager.getFontSizeLevel();
    const nextIdx = (levels.indexOf(current) + 1) % levels.length;
    const next = levels[nextIdx];
    DataManager.setFontSizeLevel(next);
    document.body.classList.remove('font-standard','font-large','font-xlarge');
    document.body.classList.add('font-' + next);
    this.render();
    const label = next==='standard'?'标准':next==='large'?'大字':'超大字';
    showToast(`${label}模式已开启`);
    SpeechUtil.speak(`${label}模式已开启`);
  },
  async toggleVoiceReminder() {
    const s = await DataManager.getReminderSettings();
    s.voiceReminder = !s.voiceReminder;
    SpeechUtil.enabled = s.voiceReminder;
    await DataManager.saveReminderSettings(s);
    this.render();
  },
  async toggleNotification() {
    const s = await DataManager.getReminderSettings();
    if(!s.notificationEnabled && 'Notification' in window) {
      Notification.requestPermission().then(async (p) => {
        s.notificationEnabled = (p === 'granted');
        await DataManager.saveReminderSettings(s);
        this.render();
        if(p==='granted') showToast('通知权限已开启');
        else showToast('通知权限被拒绝');
      });
    } else {
      s.notificationEnabled = !s.notificationEnabled;
      await DataManager.saveReminderSettings(s);
      this.render();
    }
  },
  async editRepeatCount() {
    const s = await DataManager.getReminderSettings();
    const val = prompt('重复提醒次数（1-5次）：', s.repeatCount);
    if(val && !isNaN(val) && val>=1 && val<=5) { s.repeatCount=parseInt(val); await DataManager.saveReminderSettings(s); this.render(); }
  },
  async editRepeatInterval() {
    const s = await DataManager.getReminderSettings();
    const val = prompt('重复提醒间隔（分钟）：', s.repeatInterval);
    if(val && !isNaN(val) && val>=1 && val<=30) { s.repeatInterval=parseInt(val); await DataManager.saveReminderSettings(s); this.render(); }
  },
  async editMissedThreshold() {
    const s = await DataManager.getReminderSettings();
    const val = prompt('漏服判定时间（分钟）：', s.missedThreshold);
    if(val && !isNaN(val) && val>=10 && val<=180) { s.missedThreshold=parseInt(val); await DataManager.saveReminderSettings(s); this.render(); }
  },
  async editSnoozeMinutes() {
    const s = await DataManager.getReminderSettings();
    const val = prompt('稍后提醒延迟（分钟，5-60）：', s.snoozeMinutes||10);
    if(val && !isNaN(val) && val>=5 && val<=60) { s.snoozeMinutes=parseInt(val); await DataManager.saveReminderSettings(s); this.render(); }
  },
  async editFamilyInfo() {
    const f = await DataManager.getFamilySettings();
    const name = prompt('请输入老人姓名', f.name);
    if(name) { f.name=name; await DataManager.saveFamilySettings(f); this.render(); }
  },
  async editPhone() {
    const f = await DataManager.getFamilySettings();
    const phone = prompt('请输入联系电话', f.phone);
    if(phone) { f.phone=phone; await DataManager.saveFamilySettings(f); this.render(); }
  },
  async toggleMissNotify() {
    const f = await DataManager.getFamilySettings();
    f.notifyOnMiss = !f.notifyOnMiss;
    await DataManager.saveFamilySettings(f);
    this.render();
  },
  async exportData() {
    const medicines = await DataManager.getMedicines();
    const blob = new Blob([JSON.stringify({medicines, exportDate:new Date().toISOString()},null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`智药伴_数据_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('记录已导出');
  },
  async clearData() {
    if(confirm('确定要清除所有数据吗？此操作不可恢复！')) {
      if(confirm('再次确认：清除后无法找回，确定吗？')) {
        if(window.indexedDB && window.indexedDB.deleteDatabase) {
          window.indexedDB.deleteDatabase('zhiyao_ban_v3');
        }
        DataManager._cache = { medicines: null, records: {} };
        showToast('数据已清除'); this.render();
      }
    }
  }
};

// ===== 提醒系统 =====
const ReminderSystem = {
  timer: null, repeatTimers: {}, missedTimer: null,

  init() {
    this.timer = setInterval(() => this.check(), 60000);
    this.missedTimer = setInterval(() => this.checkMissed(), 300000);
    this.check();
    this.checkMissed();
  },
  async check() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const medicines = await DataManager.getMedicines();
    const todayStatus = await DataManager.getTodayStatus();
    const settings = await DataManager.getReminderSettings();

    if(this.isQuietHours(settings)) return;

    medicines.forEach(med => {
      med.time.split(',').forEach((t, idx) => {
        const slotKey = `${med.id}_${med.timeSlot.split(',')[idx]||'slot'+idx}`;
        if(t.trim() === currentTime && !todayStatus[slotKey]) {
          this.showReminder(med, t.trim(), idx, settings);
          this.scheduleRepeats(med, t.trim(), idx, settings);
        }
      });
    });
  },
  isQuietHours(settings) {
    const now = new Date();
    const currentMin = now.getHours()*60+now.getMinutes();
    const [qsH,qsM] = settings.quietStart.split(':').map(Number);
    const [qeH,qeM] = settings.quietEnd.split(':').map(Number);
    const quietStart = qsH*60+qsM;
    const quietEnd = qeH*60+qeM;
    if(quietStart > quietEnd) { return currentMin >= quietStart || currentMin < quietEnd; }
    return currentMin >= quietStart && currentMin < quietEnd;
  },
  scheduleRepeats(med, time, idx, settings) {
    const medId = `${med.id}_${idx}`;
    if(this.repeatTimers[medId]) clearTimeout(this.repeatTimers[medId]);
    let count = 0;
    const repeat = async () => {
      if(count >= settings.repeatCount) return;
      count++;
      const todayStatus = await DataManager.getTodayStatus();
      const slotKey = `${med.id}_${med.timeSlot.split(',')[idx]||'slot'+idx}`;
      if(!todayStatus[slotKey]) {
        this.showReminder(med, time, idx, settings);
      }
    };
    this.repeatTimers[medId] = setInterval(repeat, settings.repeatInterval * 60000);
    setTimeout(() => { clearInterval(this.repeatTimers[medId]); }, 30*60000);
  },
  async checkMissed() {
    const medicines = await DataManager.getMedicines();
    const settings = await DataManager.getReminderSettings();
    const now = new Date();
    medicines.forEach(async (med) => {
      med.time.split(',').forEach(async (t, idx) => {
        const [h,m] = t.trim().split(':').map(Number);
        const slotKey = `${med.id}_${med.timeSlot.split(',')[idx]||'slot'+idx}`;
        const todayStatus = await DataManager.getTodayStatus();
        if(!todayStatus[slotKey]) {
          const medMin = h*60+m;
          const nowMin = now.getHours()*60+now.getMinutes();
          if(nowMin > medMin + settings.missedThreshold) {
            await DataManager.markMissed(med.id, med.timeSlot.split(',')[idx]||'slot'+idx);
            const fam = await DataManager.getFamilySettings();
            if(fam.notifyOnMiss && fam.familyMembers.length > 0) {
              console.log(`[通知家属] ${med.name} 漏服`);
            }
          }
        }
      });
    });
  },
  async showReminder(med, time, idx, settings) {
    const modal = document.getElementById('reminderModal');
    document.getElementById('reminderMedName').textContent = `${med.name}（${med.alias}）`;
    document.getElementById('reminderDose').textContent = `${med.dose} · ${med.condition}`;

    // 冲突检查
    const medicines = await DataManager.getMedicines();
    const conflicts = DrugKnowledge.checkConflicts(medicines);
    const conflictDiv = document.getElementById('reminderConflict');
    if(conflicts.length > 0) {
      conflictDiv.style.display = 'block';
      conflictDiv.innerHTML = '用药提醒：' + conflicts.filter(c=>c.drugs.includes(med.name)).map(c=>c.desc).join('；');
    } else {
      conflictDiv.style.display = 'none';
    }

    // "稍后提醒"按钮明确延迟时长
    const snoozeMin = settings.snoozeMinutes || 10;
    document.getElementById('reminderSkip').textContent = `${snoozeMin}分钟后提醒`;

    modal.classList.add('show');

    // 语音播报
    if(settings.voiceReminder) {
      SpeechUtil.speak(`该吃药了，${med.alias}${med.dose}，${med.condition}服用`);
    }

    // 浏览器通知
    if(settings.notificationEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('智药伴 - 该吃药了', {
        body: `${med.name} ${med.dose} ${med.condition}服用`,
        tag: `reminder_${med.id}`
      });
    }

    const slotKey = med.timeSlot.split(',')[idx]||'slot'+idx;
    document.getElementById('reminderConfirm').onclick = async () => {
      await DataManager.checkIn(med.id, slotKey);
      modal.classList.remove('show');
      showToast('已打卡'); SpeechUtil.speak('已记录服药'); HomePage.render();
    };
    document.getElementById('reminderSkip').onclick = () => {
      modal.classList.remove('show');
      // 设置snooze定时器
      setTimeout(() => this.showReminder(med, time, idx, settings), snoozeMin * 60000);
    };
  },
  voiceCheckIn() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) { showToast(isIOS ? 'iOS暂不支持语音确认' : '浏览器不支持语音识别'); return; }

    // 显示语音反馈状态
    const feedback = document.getElementById('voiceFeedback');
    if(feedback) feedback.style.display = 'block';

    const rec = new SR(); rec.lang='zh-CN'; rec.continuous=false;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      if(feedback) feedback.style.display = 'none';
      if(text.includes('服') || text.includes('吃') || text.includes('确认') || text.includes('好')) {
        document.getElementById('reminderConfirm').click();
      } else {
        showToast('未识别到确认指令，请重试');
      }
    };
    rec.onerror = () => {
      if(feedback) feedback.style.display = 'none';
      showToast('语音识别失败');
    };
    rec.start();
  }
};

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化IndexedDB
  await DB.init();

  // 设置默认字体级别（大字模式）
  const fontLevel = DataManager.getFontSizeLevel();
  document.body.classList.add('font-' + fontLevel);

  // 语音设置
  const settings = await DataManager.getReminderSettings();
  SpeechUtil.enabled = settings.voiceReminder;

  // 初始化路由和提醒
  Router.init();
  ReminderSystem.init();

  // 请求通知权限
  if('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // 注册Service Worker
  if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
});
