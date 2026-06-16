/**
 * 添加药品模块
 */

import { 应用数据, 保存数据 } from './store.js';
import { 生成编号 } from './utils.js';
import { 播报语音 } from './voice.js';
import { 切换页面 } from './router.js';

// 当前录入方式：voice | photo | manual
let 当前录入方式 = 'voice';

// 语音识别结果
let 语音识别结果 = null;

// 拍照识别结果
let 拍照识别结果 = null;

/**
 * 切换添加药品的录入方式
 * @param {string} 方式
 */
export function 切换录入方式(方式) {
  当前录入方式 = 方式;
  document.querySelectorAll('.method-btn').forEach(按钮 => 按钮.classList.remove('active'));
  document.getElementById(方式 + 'Btn')?.classList.add('active');

  document.getElementById('voicePanel').classList.toggle('hidden', 方式 !== 'voice');
  document.getElementById('photoPanel').classList.toggle('hidden', 方式 !== 'photo');
  document.getElementById('manualPanel').classList.toggle('hidden', 方式 !== 'manual');

  语音识别结果 = null;
  拍照识别结果 = null;
  document.getElementById('voiceResult').classList.add('hidden');
  document.getElementById('photoPreview').classList.add('hidden');
}

/**
 * 处理语音添加药品的识别文本
 * @param {string} 文本
 */
export function 处理语音添加药品(文本) {
  语音识别结果 = 文本;
  const 结果框 = document.getElementById('voiceResult');
  结果框.textContent = '识别结果：' + 文本;
  结果框.classList.remove('hidden');

  // 尝试解析时间、药品名、剂量
  const 解析 = 解析药品语音(文本);
  if (解析) {
    语音识别结果 = 解析;
    结果框.innerHTML += `<br><span style="color:var(--主色)">已解析：${解析.名称}，${解析.剂量}，${解析.时间}，${解析.备注}</span>`;
    播报语音(`识别到${解析.名称}，${解析.时间}服用${解析.剂量}`);
  } else {
    播报语音('未能完全解析，请检查信息');
  }
}

/**
 * 从语音文本中解析药品信息
 * @param {string} 文本
 * @returns {Object}
 */
function 解析药品语音(文本) {
  // 简单规则解析示例
  const 时间匹配 = 文本.match(/(\d{1,2})[:：点](\d{0,2})?/);
  const 剂量匹配 = 文本.match(/(\d+)片|(\d+)粒|(\d+)袋|(\d+)毫升/);
  const 备注匹配 = 文本.match(/(饭前|饭后|睡前|晨起|随餐)/);

  // 提取药品名：去掉常见词后的内容
  let 名称 = 文本
    .replace(/[每天|每日|早上|中午|晚上|睡前|饭后|饭前|服用|吃|喝|一次|一片|一粒|一袋]/g, ' ')
    .replace(/\d+[:：点]?\d*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 如果解析不出名称，给一个默认提示
  if (!名称 || 名称.length < 2) {
    名称 = '未识别药品';
  }

  let 时间 = '08:00';
  if (时间匹配) {
    const 时 = 时间匹配[1].padStart(2, '0');
    const 分 = (时间匹配[2] || '00').padStart(2, '0');
    时间 = `${时}:${分}`;
  } else if (文本.includes('早上') || 文本.includes('早晨')) {
    时间 = '08:00';
  } else if (文本.includes('中午')) {
    时间 = '12:00';
  } else if (文本.includes('晚上')) {
    时间 = '18:00';
  } else if (文本.includes('睡前')) {
    时间 = '21:00';
  }

  const 剂量 = 剂量匹配 ? 剂量匹配[0] : '1片';
  const 备注 = 备注匹配 ? 备注匹配[0] : '请遵医嘱';

  return { 名称, 剂量, 时间, 频率: 'daily', 备注 };
}

/**
 * 根据药品名称返回对应图标
 * @param {string} 名称
 * @returns {string}
 */
function 获取药品图标(名称) {
  if (名称.includes('降压')) return '💉';
  if (名称.includes('阿司') || 名称.includes('他汀')) return '💊';
  if (名称.includes('维生')) return '🍊';
  if (名称.includes('感冒')) return '🤧';
  return '💊';
}

/**
 * 处理药品照片上传
 * @param {Event} 事件
 */
export function 处理照片上传(事件) {
  const 文件 = 事件.target.files[0];
  if (!文件) return;

  const 预览区 = document.getElementById('photoPreview');
  const 读取器 = new FileReader();
  读取器.onload = function (e) {
    预览区.innerHTML = `<img src="${e.target.result}" alt="药品照片">`;
    预览区.classList.remove('hidden');
  };
  读取器.readAsDataURL(文件);

  // TODO: 当前为演示识别结果，后续可接入真实 OCR 或药品识别接口
  setTimeout(() => {
    拍照识别结果 = {
      名称: '阿托伐他汀钙片',
      剂量: '1片',
      时间: '20:00',
      频率: 'daily',
      备注: '睡前服用'
    };
    alert('拍照识别完成：阿托伐他汀钙片，每晚1片，睡前服用');
  }, 800);
}

/**
 * 确认添加药品到用药计划
 */
export function 确认添加药品() {
  let 新药品 = null;

  if (当前录入方式 === 'voice') {
    if (!语音识别结果) {
      alert('请先录入语音');
      return;
    }
    if (typeof 语音识别结果 === 'string') {
      新药品 = 解析药品语音(语音识别结果);
    } else {
      新药品 = 语音识别结果;
    }
  } else if (当前录入方式 === 'photo') {
    if (!拍照识别结果) {
      alert('请先上传药品照片');
      return;
    }
    新药品 = 拍照识别结果;
  } else {
    const 名称 = document.getElementById('medName').value.trim();
    const 剂量 = document.getElementById('medDose').value.trim();
    const 时间 = document.getElementById('medTime').value;
    const 频率 = document.getElementById('medFreq').value;
    const 备注 = document.getElementById('medNote').value.trim();
    if (!名称 || !剂量) {
      alert('请填写药品名称和剂量');
      return;
    }
    新药品 = { 名称, 剂量, 时间, 频率, 备注 };
  }

  if (!新药品) return;

  新药品.编号 = 生成编号();
  新药品.图标 = 获取药品图标(新药品.名称);
  应用数据.药品列表.push(新药品);
  保存数据();

  播报语音(`已添加${新药品.名称}`);
  alert('添加成功！');

  // 清空输入
  语音识别结果 = null;
  拍照识别结果 = null;
  document.getElementById('voiceResult').classList.add('hidden');
  document.getElementById('photoPreview').classList.add('hidden');
  document.getElementById('photoInput').value = '';
  document.getElementById('medName').value = '';
  document.getElementById('medDose').value = '';
  document.getElementById('medNote').value = '';

  切换页面('today');
}
