/**
 * 智药伴 - AI老年人智能用药提醒Web应用
 * 核心应用逻辑
 */

// ===== 数据管理 =====
const DataManager = {
  // 获取药品列表
  getMedicines() {
    const data = localStorage.getItem('zyb_medicines');
    return data ? JSON.parse(data) : this.getDefaultMedicines();
  },

  // 保存药品列表
  saveMedicines(medicines) {
    localStorage.setItem('zyb_medicines', JSON.stringify(medicines));
  },

  // 获取服药记录
  getRecords() {
    const data = localStorage.getItem('zyb_records');
    return data ? JSON.parse(data) : {};
  },

  // 保存服药记录
  saveRecords(records) {
    localStorage.setItem('zyb_records', JSON.stringify(records));
  },

  // 今日打卡
  checkIn(medicineId, timeSlot) {
    const records = this.getRecords();
    const today = new Date().toISOString().split('T')[0];
    if (!records[today]) records[today] = {};
    records[today][`${medicineId}_${timeSlot}`] = {
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      status: 'completed'
    };
    this.saveRecords(records);
  },

  // 获取今日状态
  getTodayStatus() {
    const records = this.getRecords();
    const today = new Date().toISOString().split('T')[0];
    return records[today] || {};
  },

  // 适老模式设置
  isElderlyMode() {
    return localStorage.getItem('zyb_elderly_mode') === 'true';
  },

  setElderlyMode(val) {
    localStorage.setItem('zyb_elderly_mode', val);
  },

  // 家属设置
  getFamilySettings() {
    const data = localStorage.getItem('zyb_family');
    return data ? JSON.parse(data) : {
      name: '张奶奶',
      relation: '奶奶',
      phone: '',
      notifyOnMiss: true
    };
  },

  saveFamilySettings(settings) {
    localStorage.setItem('zyb_family', JSON.stringify(settings));
  },

  // 默认示例药品数据
  getDefaultMedicines() {
    return [
      {
        id: 'med_1',
        name: '氨氯地平',
        alias: '降压药',
        dose: '1片',
        frequency: '每天1次',
        time: '08:00',
        condition: '饭后',
        color: '#FF9F43',
        icon: '🌅',
        timeSlot: 'morning'
      },
      {
        id: 'med_2',
        name: '二甲双胍',
        alias: '降糖药',
        dose: '1片',
        frequency: '每天2次',
        time: '08:00,18:00',
        condition: '饭后',
        color: '#4A90D9',
        icon: '💊',
        timeSlot: 'morning,evening'
      },
      {
        id: 'med_3',
        name: '阿托伐他汀',
        alias: '降脂药',
        dose: '1片',
        frequency: '每天1次',
        time: '22:00',
        condition: '睡前',
        color: '#9B59B6',
        icon: '🌙',
        timeSlot: 'night'
      }
    ];
  }
};

// ===== 页面路由 =====
const Router = {
  currentPage: 'home',

  init() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        this.navigate(page);
      });
    });
    // 初始加载首页
    this.navigate('home');
  },

  navigate(page) {
    this.currentPage = page;
    // 切换页面显示
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
      targetPage.classList.add('active');
      targetPage.classList.add('page-enter');
      setTimeout(() => targetPage.classList.remove('page-enter'), 350);
    }

    // 切换导航高亮
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // 触发页面加载回调
    if (page === 'home') HomePage.render();
    if (page === 'add') AddPage.render();
    if (page === 'ai') AIPage.render();
    if (page === 'family') FamilyPage.render();
    if (page === 'settings') SettingsPage.render();
  }
};

// ===== 首页 =====
const HomePage = {
  render() {
    const medicines = DataManager.getMedicines();
    const todayStatus = DataManager.getTodayStatus();
    const hour = new Date().getHours();
    let greeting = '早上好';
    if (hour >= 12 && hour < 18) greeting = '下午好';
    else if (hour >= 18) greeting = '晚上好';

    // 构建时间线
    const timeline = this.buildTimeline(medicines, todayStatus);

    // 计算统计
    let totalSlots = 0;
    let completedSlots = 0;
    let pendingSlots = 0;
    let missedSlots = 0;

    timeline.forEach(item => {
      totalSlots++;
      if (item.status === 'completed') completedSlots++;
      else if (item.status === 'pending') pendingSlots++;
      else if (item.status === 'missed') missedSlots++;
    });

    const container = document.getElementById('page-home');
    container.innerHTML = `
      <div class="greeting">${greeting} 👋</div>
      <div class="greeting-sub">今天也要按时吃药哦</div>

      <div class="today-overview card-animate">
        <div class="overview-item taken">
          <div class="ov-number number-roll">${completedSlots}</div>
          <div class="ov-label">已服用</div>
        </div>
        <div class="overview-item pending">
          <div class="ov-number number-roll">${pendingSlots}</div>
          <div class="ov-label">待服用</div>
        </div>
        <div class="overview-item missed">
          <div class="ov-number number-roll">${missedSlots}</div>
          <div class="ov-label">已漏服</div>
        </div>
        <div class="overview-item">
          <div class="ov-number number-roll" style="color:var(--primary)">${totalSlots}</div>
          <div class="ov-label">今日总计</div>
        </div>
      </div>

      <div class="card card-animate">
        <div class="card-title">📋 今日用药</div>
        <div class="timeline" id="timeline">
          ${timeline.map(item => this.renderTimelineItem(item)).join('')}
        </div>
      </div>

      ${totalSlots === 0 ? `
        <div class="empty-state card-animate">
          <div class="empty-state-icon">💊</div>
          <div class="empty-state-text">还没有添加药品，点击下方"录药"开始吧</div>
        </div>
      ` : ''}
    `;

    // 绑定打卡事件
    container.querySelectorAll('.check-in-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const medId = btn.dataset.id;
        const slot = btn.dataset.slot;
        this.handleCheckIn(medId, slot, btn);
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
        const timeMinutes = h * 60 + m;
        const slotKey = `${med.id}_${med.timeSlot.split(',')[idx] || 'slot' + idx}`;
        const status = todayStatus[slotKey]
          ? 'completed'
          : (currentTime > timeMinutes + 60 ? 'missed' : 'pending');

        timeline.push({
          id: med.id,
          name: med.name,
          alias: med.alias,
          dose: med.dose,
          condition: med.condition,
          time: t.trim(),
          timeSlot: med.timeSlot.split(',')[idx] || 'slot' + idx,
          icon: med.icon,
          color: med.color,
          status
        });
      });
    });

    timeline.sort((a, b) => a.time.localeCompare(b.time));
    return timeline;
  },

  renderTimelineItem(item) {
    const statusClass = item.status;
    const statusText = item.status === 'completed' ? '✅ 已服用' : item.status === 'missed' ? '❌ 已漏服' : '⏳ 待服用';

    return `
      <div class="timeline-item ${statusClass} card-animate">
        <div class="timeline-time">${item.icon} ${item.time}</div>
        <div class="timeline-med">${item.name}（${item.alias}）</div>
        <div class="timeline-dose">${item.dose} · ${item.condition}</div>
        <span class="timeline-status ${statusClass}">${statusText}</span>
        ${item.status === 'pending' ? `
          <button class="check-in-btn" data-id="${item.id}" data-slot="${item.timeSlot}">
            ✋ 我已服用
          </button>
        ` : ''}
      </div>
    `;
  },

  handleCheckIn(medId, slot, btnEl) {
    DataManager.checkIn(medId, slot);

    // 按钮动画
    btnEl.classList.add('check-success');
    btnEl.innerHTML = '✅ 已打卡';
    btnEl.disabled = true;
    btnEl.style.background = '#27AE60';

    // 语音播报
    const med = DataManager.getMedicines().find(m => m.id === medId);
    if (med) {
      SpeechUtil.speak(`已记录，${med.alias}${med.dose}已服用`);
    }

    // 刷新页面
    setTimeout(() => this.render(), 1200);

    showToast('✅ 打卡成功！');
  }
};

// ===== 录药页面 =====
const AddPage = {
  isRecording: false,
  recognition: null,

  render() {
    const container = document.getElementById('page-add');
    container.innerHTML = `
      <div class="card card-animate">
        <div class="card-title">🎙️ 语音录药</div>
        <div class="voice-section">
          <div class="voice-hint">点击下方按钮，说出您的用药信息</div>
          <button class="voice-btn" id="voiceRecordBtn" onclick="AddPage.toggleRecording()">
            🎤
          </button>
          <div id="voiceStatus" style="color:var(--text-secondary);font-size:15px;">点击开始录音</div>
          <div class="voice-result" id="voiceResult">
            <div style="font-weight:600;margin-bottom:8px;">📝 识别结果：</div>
            <div class="voice-result-text" id="voiceResultText"></div>
            <div id="parsedResult"></div>
            <button class="submit-btn" onclick="AddPage.confirmVoiceAdd()" style="margin-top:12px;">✅ 确认添加</button>
          </div>
        </div>
      </div>

      <div class="card card-animate">
        <div class="card-title">📷 拍照识别</div>
        <div class="photo-section">
          <div style="color:var(--text-secondary);margin-bottom:16px;">拍药品包装盒，AI自动识别</div>
          <label class="photo-btn btn-press" for="photoInput">
            📷 拍照识别
            <input type="file" id="photoInput" accept="image/*" capture="environment" style="display:none" onchange="AddPage.handlePhoto(event)">
          </label>
          <div id="photoResult" style="margin-top:16px;"></div>
        </div>
      </div>

      <div class="card card-animate">
        <div class="card-title" style="cursor:pointer" onclick="AddPage.toggleManualForm()">
          ✏️ 手动添加 <span style="font-size:14px;color:var(--text-secondary)">（点击展开）</span>
        </div>
        <div class="manual-form" id="manualForm">
          <div class="form-group">
            <label class="form-label">药品名称</label>
            <input class="form-input" id="inputMedName" placeholder="如：氨氯地平">
          </div>
          <div class="form-group">
            <label class="form-label">别名/俗称</label>
            <input class="form-input" id="inputMedAlias" placeholder="如：降压药">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">剂量</label>
              <input class="form-input" id="inputMedDose" placeholder="如：1片">
            </div>
            <div class="form-group">
              <label class="form-label">频次</label>
              <select class="form-input" id="inputMedFreq">
                <option value="每天1次">每天1次</option>
                <option value="每天2次">每天2次</option>
                <option value="每天3次">每天3次</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">服药时间</label>
            <input class="form-input" id="inputMedTime" type="time" value="08:00">
          </div>
          <div class="form-group">
            <label class="form-label">用药条件</label>
            <select class="form-input" id="inputMedCondition">
              <option value="饭后">饭后</option>
              <option value="饭前">饭前</option>
              <option value="睡前">睡前</option>
              <option value="空腹">空腹</option>
              <option value="随餐">随餐</option>
            </select>
          </div>
          <button class="submit-btn btn-press" onclick="AddPage.manualAdd()">➕ 添加药品</button>
        </div>
      </div>

      <div class="card card-animate">
        <div class="card-title">💊 已添加药品</div>
        <ul class="medicine-list" id="medicineList"></ul>
      </div>
    `;

    this.renderMedicineList();
  },

  toggleManualForm() {
    const form = document.getElementById('manualForm');
    form.classList.toggle('show');
  },

  // 语音录入
  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  },

  startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('⚠️ 您的浏览器不支持语音识别，请使用Chrome');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'zh-CN';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      this.isRecording = true;
      document.getElementById('voiceRecordBtn').classList.add('recording');
      document.getElementById('voiceStatus').textContent = '🔴 正在录音，请说话...';
    };

    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      document.getElementById('voiceResultText').textContent = transcript;
      document.getElementById('voiceResult').classList.add('show');
      this.parseVoiceInput(transcript);
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      document.getElementById('voiceRecordBtn').classList.remove('recording');
      document.getElementById('voiceStatus').textContent = '点击开始录音';
    };

    this.recognition.onerror = (event) => {
      this.isRecording = false;
      document.getElementById('voiceRecordBtn').classList.remove('recording');
      document.getElementById('voiceStatus').textContent = '❌ 识别失败，请重试';
      if (event.error === 'not-allowed') {
        showToast('⚠️ 请允许麦克风权限');
      }
    };

    this.recognition.start();
  },

  stopRecording() {
    if (this.recognition) {
      this.recognition.stop();
    }
  },

  // 解析语音输入
  parseVoiceInput(text) {
    const parsed = this.parseMedicineText(text);
    const parsedDiv = document.getElementById('parsedResult');
    if (parsed) {
      parsedDiv.innerHTML = `
        <div style="margin-top:12px;padding:12px;background:var(--success-light);border-radius:10px;">
          <div style="font-weight:600;color:var(--success);margin-bottom:8px;">✅ AI识别结果</div>
          <div>💊 药品：<strong>${parsed.name}</strong></div>
          <div>📏 剂量：<strong>${parsed.dose}</strong></div>
          <div>⏰ 时间：<strong>${parsed.time}</strong></div>
          <div>📝 条件：<strong>${parsed.condition}</strong></div>
        </div>
      `;
      this._pendingVoiceMed = parsed;
    } else {
      parsedDiv.innerHTML = `
        <div style="margin-top:12px;padding:12px;background:var(--warning-light);border-radius:10px;">
          <div style="color:var(--warning);">⚠️ 未能完全识别，请手动补充信息</div>
        </div>
      `;
      this._pendingVoiceMed = { name: text, dose: '1片', time: '08:00', condition: '饭后', frequency: '每天1次' };
    }
  },

  // 简单的NLP解析
  parseMedicineText(text) {
    let name = '', dose = '1片', time = '08:00', condition = '饭后', frequency = '每天1次';

    // 提取药品名
    const medMatch = text.match(/(?:吃|服|用)([^\s]{2,10}?)(?:[，,每每天早中晚])/);
    if (medMatch) name = medMatch[1];

    // 提取剂量
    const doseMatch = text.match(/(\d+)\s*(?:片|粒|颗|支|包|毫升|mg|g)/);
    if (doseMatch) dose = doseMatch[0];

    // 提取时间
    if (text.includes('早') || text.includes('早上')) time = '08:00';
    else if (text.includes('中') || text.includes('中午')) time = '12:00';
    else if (text.includes('晚') || text.includes('晚上')) time = '18:00';
    else if (text.includes('睡前')) { time = '22:00'; condition = '睡前'; }

    // 提取频次
    if (text.includes('三次') || text.includes('3次')) frequency = '每天3次';
    else if (text.includes('两次') || text.includes('2次') || text.includes('一天两次')) frequency = '每天2次';

    // 提取条件
    if (text.includes('饭前')) condition = '饭前';
    else if (text.includes('睡前')) condition = '睡前';
    else if (text.includes('空腹')) condition = '空腹';

    if (!name) return null;

    // 构建时间字符串
    let times = [time];
    if (frequency === '每天2次') times = ['08:00', '18:00'];
    if (frequency === '每天3次') times = ['08:00', '12:00', '18:00'];

    return { name, dose, time: times.join(','), condition, frequency, alias: name };
  },

  confirmVoiceAdd() {
    if (!this._pendingVoiceMed) return;
    const med = this._pendingVoiceMed;
    this.addMedicine(med);
    showToast('✅ 药品已添加');
    SpeechUtil.speak(`${med.name}已添加到用药计划`);
    this._pendingVoiceMed = null;
    this.renderMedicineList();
  },

  // 拍照识别
  handlePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const resultDiv = document.getElementById('photoResult');
    resultDiv.innerHTML = '<div style="padding:16px;text-align:center;">🔍 正在识别中...</div>';

    // 模拟OCR识别（实际项目中应调用百度/腾讯OCR API）
    setTimeout(() => {
      resultDiv.innerHTML = `
        <div style="padding:16px;background:var(--success-light);border-radius:12px;">
          <div style="font-weight:600;color:var(--success);margin-bottom:8px;">✅ 识别成功</div>
          <div>💊 识别到：<strong>氨氯地平片 5mg</strong></div>
          <div style="font-size:14px;color:var(--text-secondary);margin-top:4px;">请确认并补充服药时间</div>
          <button class="submit-btn btn-press" onclick="AddPage.addFromOCR()" style="margin-top:12px;">✅ 确认添加</button>
        </div>
      `;
    }, 1500);
  },

  addFromOCR() {
    this.addMedicine({
      name: '氨氯地平片',
      alias: '降压药',
      dose: '1片',
      time: '08:00',
      condition: '饭后',
      frequency: '每天1次'
    });
    showToast('✅ 药品已添加');
    SpeechUtil.speak('氨氯地平片已添加到用药计划');
    this.renderMedicineList();
  },

  // 手动添加
  manualAdd() {
    const name = document.getElementById('inputMedName').value.trim();
    if (!name) {
      showToast('⚠️ 请输入药品名称');
      return;
    }

    const freq = document.getElementById('inputMedFreq').value;
    const baseTime = document.getElementById('inputMedTime').value;
    let times = [baseTime];
    if (freq === '每天2次') times = [baseTime, '18:00'];
    if (freq === '每天3次') times = [baseTime, '12:00', '18:00'];

    const icons = ['💊', '💉', '🩺', '🧴', '💉'];
    const colors = ['#4A90D9', '#FF9F43', '#27AE60', '#9B59B6', '#E74C3C'];

    this.addMedicine({
      name,
      alias: document.getElementById('inputMedAlias').value || name,
      dose: document.getElementById('inputMedDose').value || '1片',
      time: times.join(','),
      condition: document.getElementById('inputMedCondition').value,
      frequency: freq,
      icon: icons[Math.floor(Math.random() * icons.length)],
      color: colors[Math.floor(Math.random() * colors.length)]
    });

    showToast('✅ 药品已添加');
    SpeechUtil.speak(`${name}已添加到用药计划`);
    this.renderMedicineList();

    // 清空表单
    document.getElementById('inputMedName').value = '';
    document.getElementById('inputMedAlias').value = '';
    document.getElementById('inputMedDose').value = '';
  },

  addMedicine(medData) {
    const medicines = DataManager.getMedicines();
    const newMed = {
      id: 'med_' + Date.now(),
      name: medData.name,
      alias: medData.alias || medData.name,
      dose: medData.dose || '1片',
      frequency: medData.frequency || '每天1次',
      time: medData.time || '08:00',
      condition: medData.condition || '饭后',
      color: medData.color || '#4A90D9',
      icon: medData.icon || '💊',
      timeSlot: medData.time || '08:00'
    };
    medicines.push(newMed);
    DataManager.saveMedicines(medicines);
  },

  renderMedicineList() {
    const list = document.getElementById('medicineList');
    if (!list) return;
    const medicines = DataManager.getMedicines();

    if (medicines.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">暂无药品，请添加</div></div>';
      return;
    }

    list.innerHTML = medicines.map(med => `
      <li class="medicine-item btn-press">
        <div class="medicine-icon morning" style="background:${med.color}22;">
          ${med.icon}
        </div>
        <div class="medicine-info">
          <div class="medicine-name">${med.name}（${med.alias}）</div>
          <div class="medicine-schedule">${med.frequency} · ${med.dose} · ${med.condition}</div>
        </div>
        <div class="medicine-time">${med.time}</div>
        <button style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--danger);padding:8px;" onclick="AddPage.deleteMedicine('${med.id}')">🗑️</button>
      </li>
    `).join('');
  },

  deleteMedicine(id) {
    if (!confirm('确定删除这个药品吗？')) return;
    let medicines = DataManager.getMedicines();
    medicines = medicines.filter(m => m.id !== id);
    DataManager.saveMedicines(medicines);
    this.renderMedicineList();
    showToast('🗑️ 已删除');
  }
};

// ===== AI问答页面 =====
const AIPage = {
  messages: [],

  render() {
    const container = document.getElementById('page-ai');
    container.innerHTML = `
      <div class="card card-animate" style="margin-bottom:12px;">
        <div class="card-title">🤖 AI用药助手</div>
        <div style="font-size:14px;color:var(--text-secondary);">有问题随时问我，比如药品用法、相互作用等</div>
      </div>

      <div class="quick-questions card-animate">
        <button class="quick-q" onclick="AIPage.askQuick('降压药饭前还是饭后吃？')">降压药饭前还是饭后吃？</button>
        <button class="quick-q" onclick="AIPage.askQuick('两种药能一起吃吗？')">两种药能一起吃吗？</button>
        <button class="quick-q" onclick="AIPage.askQuick('漏服了怎么办？')">漏服了怎么办？</button>
        <button class="quick-q" onclick="AIPage.askQuick('吃药能喝茶吗？')">吃药能喝茶吗？</button>
      </div>

      <div class="chat-container card-animate">
        <div class="chat-messages" id="chatMessages">
          <div class="chat-bubble ai">
            👋 您好！我是智药伴AI助手，关于用药的问题都可以问我。比如"这个药怎么吃""两种药能不能一起吃"等。
          </div>
        </div>
        <div class="chat-input-area">
          <input class="chat-input" id="chatInput" placeholder="输入您的问题..." onkeydown="if(event.key==='Enter')AIPage.sendMessage()">
          <button class="chat-voice-btn btn-press" onclick="AIPage.voiceInput()">🎤</button>
          <button class="chat-send-btn btn-press" onclick="AIPage.sendMessage()">➤</button>
        </div>
      </div>
    `;
  },

  sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    this.addMessage(text, 'user');
    input.value = '';

    // 显示打字动画
    const messagesDiv = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-bubble ai';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    messagesDiv.appendChild(typingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // 模拟AI回复
    setTimeout(() => {
      const response = this.generateResponse(text);
      const typing = document.getElementById('typingIndicator');
      if (typing) typing.remove();
      this.addMessage(response, 'ai');
      SpeechUtil.speak(response);
    }, 1200 + Math.random() * 800);
  },

  addMessage(text, sender) {
    const messagesDiv = document.getElementById('chatMessages');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;
    messagesDiv.appendChild(bubble);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  },

  askQuick(question) {
    document.getElementById('chatInput').value = question;
    this.sendMessage();
  },

  voiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('⚠️ 浏览器不支持语音识别');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById('chatInput').value = transcript;
      this.sendMessage();
    };

    recognition.onerror = () => {
      showToast('⚠️ 语音识别失败');
    };

    recognition.start();
  },

  // 模拟AI回复（实际项目中调用大模型API）
  generateResponse(question) {
    const medicines = DataManager.getMedicines();
    const medNames = medicines.map(m => m.name).join('、');

    if (question.includes('饭前') || question.includes('饭后')) {
      return '一般来说，降压药（如氨氯地平）建议饭后服用，降糖药（如二甲双胍）也应随餐或饭后服用，降脂药（如阿托伐他汀）通常睡前服用效果更好。不过具体用药时间请遵医嘱，我只是提供参考建议。';
    }
    if (question.includes('一起吃') || question.includes('同时') || question.includes('相互作用')) {
      return '您目前的药品' + medNames + '之间一般没有严重相互作用，但建议不同药物间隔30分钟服用，避免影响吸收。特别是降糖药和降压药，建议错开服用时间。如有疑虑，请咨询医生。';
    }
    if (question.includes('漏服') || question.includes('忘了')) {
      return '如果漏服时间不超过原定时间的一半，可以补服。比如原本8点吃的药，12点前想起来可以补吃。但如果已经接近下次服药时间，就不要补了，跳过这次，下次按时吃即可。千万不要一次吃双倍的量！';
    }
    if (question.includes('茶') || question.includes('水') || question.includes('饮料')) {
      return '服药最好用温白开水送服。茶叶中的鞣酸可能影响药物吸收，建议吃药前后1小时内不要喝茶。果汁（尤其是西柚汁）也会影响多种药物的代谢，要特别注意。';
    }
    if (question.includes('副作用') || question.includes('不舒服')) {
      return '如果服药后出现不适，如头晕、恶心、皮疹等，应立即停药并就医。不要自行调整剂量。建议记录不适症状和出现时间，方便医生判断是否与药物相关。';
    }
    return '感谢您的提问！关于"' + question + '"，建议您咨询主治医生获取专业建议。我的回答仅供参考，不能替代医嘱。您也可以问我关于服药时间、药品相互作用、漏服处理等常见问题。';
  }
};

// ===== 家属关怀页面 =====
const FamilyPage = {
  render() {
    const settings = DataManager.getFamilySettings();
    const todayStatus = DataManager.getTodayStatus();
    const medicines = DataManager.getMedicines();

    // 计算本周服药率
    const weekData = this.getWeeklyData();

    const container = document.getElementById('page-family');
    container.innerHTML = `
      <div class="family-header card-animate">
        <div class="family-avatar">👵</div>
        <div class="family-name">${settings.name}</div>
        <div class="family-relation">${settings.relation}</div>
      </div>

      <div class="card card-animate">
        <div class="card-title">📊 今日服药率</div>
        <div class="rate-circle">
          <svg viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="68" fill="none" stroke="#E8F0FE" stroke-width="12"/>
            <circle cx="80" cy="80" r="68" fill="none" stroke="${weekData.todayRate >= 80 ? 'var(--success)' : weekData.todayRate >= 50 ? 'var(--warning)' : 'var(--danger)'}" stroke-width="12" stroke-dasharray="${weekData.todayRate * 4.27} 427" stroke-linecap="round"/>
          </svg>
          <div class="rate-text">
            <div class="rate-number">${weekData.todayRate}%</div>
            <div class="rate-label">完成率</div>
          </div>
        </div>
      </div>

      <div class="card card-animate">
        <div class="card-title">📅 本周记录</div>
        <div class="weekly-chart">
          ${weekData.days.map(d => `
            <div class="weekly-bar-group">
              <div class="weekly-bar ${d.rate >= 80 ? 'full' : d.rate >= 50 ? 'partial' : 'empty'}" style="height:${Math.max(d.rate * 1.0, 8)}px;"></div>
              <div class="weekly-day">${d.label}</div>
            </div>
          `).join('')}
        </div>
      </div>

      ${weekData.missedToday.length > 0 ? `
        <div class="card card-animate">
          <div class="card-title" style="color:var(--danger);">⚠️ 漏服提醒</div>
          ${weekData.missedToday.map(m => `
            <div class="alert-card">
              <div class="alert-icon">❌</div>
              <div class="alert-text">
                <div class="alert-title">${m.name}（${m.time}）</div>
                <div class="alert-desc">${m.dose} · 已超时未服用</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="card card-animate" style="text-align:center;padding:24px;">
          <div style="font-size:48px;margin-bottom:8px;">✅</div>
          <div style="font-size:18px;font-weight:700;color:var(--success);">今日暂无漏服</div>
        </div>
      `}

      <div class="card card-animate">
        <div class="card-title">📞 紧急联系</div>
        <div class="settings-item" onclick="FamilyPage.callFamily()" style="cursor:pointer;">
          <div class="settings-item-left">
            <div class="settings-item-icon">📱</div>
            <div class="settings-item-label">拨打电话</div>
          </div>
          <div style="color:var(--primary);">→</div>
        </div>
      </div>
    `;
  },

  getWeeklyData() {
    const medicines = DataManager.getMedicines();
    const records = DataManager.getRecords();
    const today = new Date();
    const days = [];
    const missedToday = [];

    // 今日数据
    const todayKey = today.toISOString().split('T')[0];
    const todayRec = records[todayKey] || {};

    let todayTotal = 0;
    let todayDone = 0;
    medicines.forEach(med => {
      const times = med.time.split(',');
      times.forEach((t, idx) => {
        todayTotal++;
        const slotKey = `${med.id}_${med.timeSlot.split(',')[idx] || 'slot' + idx}`;
        if (todayRec[slotKey]) {
          todayDone++;
        } else {
          const [h, m] = t.trim().split(':').map(Number);
          const now = new Date();
          if (now.getHours() * 60 + now.getMinutes() > h * 60 + m + 60) {
            missedToday.push({ name: med.name, time: t.trim(), dose: med.dose });
          }
        }
      });
    });

    const todayRate = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

    // 本周数据
    const weekLabels = ['一', '二', '三', '四', '五', '六', '日'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const rec = records[key] || {};

      let total = 0, done = 0;
      medicines.forEach(med => {
        const times = med.time.split(',');
        times.forEach((t, idx) => {
          total++;
          const slotKey = `${med.id}_${med.timeSlot.split(',')[idx] || 'slot' + idx}`;
          if (rec[slotKey]) done++;
        });
      });

      days.push({
        label: weekLabels[d.getDay() === 0 ? 6 : d.getDay() - 1],
        rate: total > 0 ? Math.round((done / total) * 100) : 0
      });
    }

    return { todayRate, days, missedToday };
  },

  callFamily() {
    const settings = DataManager.getFamilySettings();
    if (settings.phone) {
      window.location.href = `tel:${settings.phone}`;
    } else {
      showToast('⚠️ 请先在设置中填写联系电话');
    }
  }
};

// ===== 设置页面 =====
const SettingsPage = {
  render() {
    const isElderly = DataManager.isElderlyMode();
    const family = DataManager.getFamilySettings();

    const container = document.getElementById('page-settings');
    container.innerHTML = `
      <div class="settings-group card-animate">
        <div class="settings-group-title">显示设置</div>
        <div class="settings-item" onclick="SettingsPage.toggleElderlyMode()">
          <div class="settings-item-left">
            <div class="settings-item-icon">👴</div>
            <div class="settings-item-label">长辈模式</div>
          </div>
          <div class="toggle-switch ${isElderly ? 'on' : ''}" id="elderlyToggle"></div>
        </div>
        <div class="settings-item" onclick="SettingsPage.toggleVoiceReminder()">
          <div class="settings-item-left">
            <div class="settings-item-icon">🔊</div>
            <div class="settings-item-label">语音播报提醒</div>
          </div>
          <div class="toggle-switch on" id="voiceReminderToggle"></div>
        </div>
      </div>

      <div class="settings-group card-animate">
        <div class="settings-group-title">家属信息</div>
        <div class="settings-item" onclick="SettingsPage.editFamilyInfo()">
          <div class="settings-item-left">
            <div class="settings-item-icon">👤</div>
            <div class="settings-item-label">老人姓名</div>
          </div>
          <div style="color:var(--text-secondary);">${family.name}</div>
        </div>
        <div class="settings-item" onclick="SettingsPage.editPhone()">
          <div class="settings-item-left">
            <div class="settings-item-icon">📱</div>
            <div class="settings-item-label">联系电话</div>
          </div>
          <div style="color:var(--text-secondary);">${family.phone || '未设置'}</div>
        </div>
        <div class="settings-item" onclick="SettingsPage.toggleMissNotify()">
          <div class="settings-item-left">
            <div class="settings-item-icon">🔔</div>
            <div class="settings-item-label">漏服通知家属</div>
          </div>
          <div class="toggle-switch ${family.notifyOnMiss ? 'on' : ''}" id="missNotifyToggle"></div>
        </div>
      </div>

      <div class="settings-group card-animate">
        <div class="settings-group-title">数据管理</div>
        <div class="settings-item" onclick="SettingsPage.exportData()">
          <div class="settings-item-left">
            <div class="settings-item-icon">📤</div>
            <div class="settings-item-label">导出服药记录</div>
          </div>
          <div style="color:var(--text-secondary);">→</div>
        </div>
        <div class="settings-item" onclick="SettingsPage.clearData()">
          <div class="settings-item-left">
            <div class="settings-item-icon">🗑️</div>
            <div class="settings-item-label" style="color:var(--danger);">清除所有数据</div>
          </div>
          <div style="color:var(--text-secondary);">→</div>
        </div>
      </div>

      <div class="settings-group card-animate">
        <div class="settings-group-title">关于</div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon">💡</div>
            <div class="settings-item-label">智药伴 v1.0</div>
          </div>
        </div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon">🏫</div>
            <div class="settings-item-label">深圳大学·新闻1班·守护银发小组</div>
          </div>
        </div>
      </div>
    `;
  },

  toggleElderlyMode() {
    const isElderly = DataManager.isElderlyMode();
    DataManager.setElderlyMode(!isElderly);
    document.body.classList.toggle('elderly-mode', !isElderly);
    this.render();
    showToast(!isElderly ? '👴 长辈模式已开启' : '📱 标准模式已开启');
  },

  toggleVoiceReminder() {
    const toggle = document.getElementById('voiceReminderToggle');
    toggle.classList.toggle('on');
  },

  toggleMissNotify() {
    const toggle = document.getElementById('missNotifyToggle');
    toggle.classList.toggle('on');
    const family = DataManager.getFamilySettings();
    family.notifyOnMiss = toggle.classList.contains('on');
    DataManager.saveFamilySettings(family);
  },

  editFamilyInfo() {
    const family = DataManager.getFamilySettings();
    const name = prompt('请输入老人姓名', family.name);
    if (name) {
      family.name = name;
      DataManager.saveFamilySettings(family);
      this.render();
    }
  },

  editPhone() {
    const family = DataManager.getFamilySettings();
    const phone = prompt('请输入联系电话', family.phone);
    if (phone) {
      family.phone = phone;
      DataManager.saveFamilySettings(family);
      this.render();
    }
  },

  exportData() {
    const records = DataManager.getRecords();
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `智药伴_服药记录_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 记录已导出');
  },

  clearData() {
    if (confirm('⚠️ 确定要清除所有数据吗？此操作不可恢复！')) {
      if (confirm('再次确认：清除后无法找回，确定吗？')) {
        localStorage.removeItem('zyb_medicines');
        localStorage.removeItem('zyb_records');
        showToast('🗑️ 数据已清除');
        this.render();
      }
    }
  }
};

// ===== 语音工具 =====
const SpeechUtil = {
  speak(text) {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  }
};

// ===== 提醒系统 =====
const ReminderSystem = {
  timer: null,

  init() {
    // 每分钟检查一次
    this.timer = setInterval(() => this.check(), 60000);
    // 启动时也检查一次
    this.check();
  },

  check() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const medicines = DataManager.getMedicines();
    const todayStatus = DataManager.getTodayStatus();

    medicines.forEach(med => {
      const times = med.time.split(',');
      times.forEach((t, idx) => {
        const slotKey = `${med.id}_${med.timeSlot.split(',')[idx] || 'slot' + idx}`;
        // 如果当前时间匹配服药时间且未打卡
        if (t.trim() === currentTime && !todayStatus[slotKey]) {
          this.showReminder(med, t.trim(), idx);
        }
      });
    });
  },

  showReminder(med, time, idx) {
    const modal = document.getElementById('reminderModal');
    document.getElementById('reminderMedName').textContent = `${med.name}（${med.alias}）`;
    document.getElementById('reminderDose').textContent = `${med.dose} · ${med.condition}`;

    modal.classList.add('show');

    // 语音播报
    SpeechUtil.speak(`该吃药了，${med.alias}${med.dose}，${med.condition}服用`);

    // 确认按钮
    document.getElementById('reminderConfirm').onclick = () => {
      DataManager.checkIn(med.id, med.timeSlot.split(',')[idx] || 'slot' + idx);
      modal.classList.remove('show');
      showToast('✅ 已打卡');
      SpeechUtil.speak('已记录服药');
      HomePage.render();
    };

    // 跳过按钮
    document.getElementById('reminderSkip').onclick = () => {
      modal.classList.remove('show');
    };
  }
};

// ===== Toast通知 =====
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== 应用初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  // 适老模式
  if (DataManager.isElderlyMode()) {
    document.body.classList.add('elderly-mode');
  }

  // 初始化路由
  Router.init();

  // 初始化提醒系统
  ReminderSystem.init();

  // 请求通知权限
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});
