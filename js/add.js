/**
 * 添加/编辑药品模块
 */

import { 应用数据, 保存数据 } from './store.js';
import { 生成编号, 获取今天日期 } from './utils.js';
import { 播报语音 } from './voice.js';
import { 切换页面 } from './router.js';
import { 识别图片文字, 解析药品信息 } from './ocr.js';
import { 转义HTML } from './security.js';
import { 检查药品相互作用 } from './interaction-db.js';
import { 药品API } from './api.js';
import { 已登录 } from './auth.js';

// 当前录入方式：voice | photo | manual
let 当前录入方式 = 'voice';

// 语音识别结果
let 语音识别结果 = null;

// 拍照识别结果
let 拍照识别结果 = null;

// 当前编辑的药品编号（null 表示新增）
let 当前编辑编号 = null;

/**
 * 切换添加药品的录入方式
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
 * 进入编辑模式，回填指定药品信息
 */
export function 编辑药品(药品编号) {
  const 药品 = 应用数据.药品列表.find(药 => 药.编号 === 药品编号);
  if (!药品) return;

  当前编辑编号 = 药品编号;
  切换页面('add');

  // 回填手动输入表单
  document.getElementById('medName').value = 药品.名称 || '';
  document.getElementById('medDose').value = 药品.剂量 || '';
  document.getElementById('medTime').value = 药品.时间 || '08:00';
  document.getElementById('medFreq').value = 药品.频率 || 'daily';
  const 库存输入 = document.getElementById('medStock');
  if (库存输入) 库存输入.value = 药品.库存 ?? '';
  document.getElementById('medNote').value = 药品.备注 || '';

  // 切换为手动输入方式以便修改
  切换录入方式('manual');

  const 确认按钮 = document.getElementById('addMedConfirm');
  if (确认按钮) 确认按钮.textContent = '保存修改';
}

/**
 * 重置添加/编辑表单
 */
export function 重置添加表单() {
  当前编辑编号 = null;
  语音识别结果 = null;
  拍照识别结果 = null;
  document.getElementById('voiceResult').classList.add('hidden');
  document.getElementById('photoPreview').classList.add('hidden');
  document.getElementById('photoInput').value = '';
  document.getElementById('photoResult').classList.add('hidden');
  document.getElementById('medName').value = '';
  document.getElementById('medDose').value = '';
  document.getElementById('medTime').value = '08:00';
  document.getElementById('medFreq').value = 'daily';
  const 库存输入 = document.getElementById('medStock');
  if (库存输入) 库存输入.value = '';
  document.getElementById('medNote').value = '';

  const 确认按钮 = document.getElementById('addMedConfirm');
  if (确认按钮) 确认按钮.textContent = '确认添加';
}

/**
 * 处理语音添加药品的识别文本
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
    const 附加信息 = document.createElement('span');
    附加信息.style.color = 'var(--主色)';
    附加信息.textContent = `已解析：${解析.名称}，${解析.剂量}，${解析.时间}，${解析.备注}`;
    结果框.appendChild(document.createElement('br'));
    结果框.appendChild(附加信息);
    播报语音(`识别到${解析.名称}，${解析.时间}服用${解析.剂量}`);
  } else {
    播报语音('未能完全解析，请检查信息');
  }
}

/**
 * 从语音文本中解析药品信息
 */
function 解析药品语音(文本) {
  const 时间匹配 = 文本.match(/(\d{1,2})[:：点](\d{0,2})?/);
  const 剂量匹配 = 文本.match(/(\d+)片|(\d+)粒|(\d+)袋|(\d+)毫升/);
  const 备注匹配 = 文本.match(/(饭前|饭后|睡前|晨起|随餐)/);

  let 名称 = 文本
    .replace(/[每天|每日|早上|中午|晚上|睡前|饭后|饭前|服用|吃|喝|一次|一片|一粒|一袋]/g, ' ')
    .replace(/\d+[:：点]?\d*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

  return { 名称, 剂量, 实际剂量: 剂量, 时间, 频率: 'daily', 备注 };
}

/**
 * 根据药品名称返回对应图标
 */
function 获取药品图标(名称) {
  if (名称.includes('降压')) return '💉';
  if (名称.includes('阿司') || 名称.includes('他汀')) return '💊';
  if (名称.includes('维生')) return '🍊';
  if (名称.includes('感冒')) return '🤧';
  if (名称.includes('布洛芬') || 名称.includes('止痛')) return '💊';
  return '💊';
}

/**
 * 处理药品照片上传
 */
export async function 处理照片上传(事件) {
  const 文件 = 事件.target.files[0];
  if (!文件) return;

  const 预览区 = document.getElementById('photoPreview');
  const 状态区 = document.getElementById('photoStatus');
  const 结果区 = document.getElementById('photoResult');

  拍照识别结果 = null;
  if (结果区) 结果区.classList.add('hidden');

  const 读取器 = new FileReader();
  读取器.onload = async function (e) {
    const 图片数据 = e.target.result;
    预览区.innerHTML = '';
    const 图片 = document.createElement('img');
    图片.src = 图片数据;
    图片.alt = '药品照片';
    预览区.appendChild(图片);
    预览区.classList.remove('hidden');

    更新识别状态('正在识别药品文字，请稍候...');

    try {
      const 识别文字 = await 识别图片文字(图片数据, (进度) => {
        if (进度.status === 'recognizing text') {
          const 百分比 = Math.round(进度.progress * 100);
          更新识别状态(`正在识别药品文字... ${百分比}%`);
        }
      });

      if (!识别文字.trim()) {
        更新识别状态('未能识别到文字，请尝试上传更清晰的照片，或改用语音、手动输入。', true);
        return;
      }

      更新识别状态('识别到文字，正在解析药品信息...');
      const 药品信息 = await 解析药品信息(识别文字);

      if (药品信息) {
        拍照识别结果 = 药品信息;
        拍照识别结果.图标 = 获取药品图标(药品信息.名称);
        显示识别结果(药品信息);
        播报语音(`识别到${药品信息.名称}，${药品信息.时间}服用${药品信息.剂量}，${药品信息.备注}`);
      } else {
        更新识别状态('未能解析出药品信息，请尝试上传更清晰的照片，或改用语音、手动输入。', true);
      }
    } catch (错误) {
      console.error('拍照识别失败:', 错误);
      if (错误.message && 错误.message.includes('network')) {
        更新识别状态('网络较慢或语言包加载失败，建议切换到手动输入。', true);
      } else {
        更新识别状态('识别过程出现错误，请重试或改用其他方式添加。', true);
      }
    }
  };

  读取器.onerror = function () {
    更新识别状态('图片读取失败，请重试。', true);
  };

  读取器.readAsDataURL(文件);
}

/**
 * 更新识别状态提示
 */
function 更新识别状态(文本, 是否错误 = false) {
  const 状态区 = document.getElementById('photoStatus');
  if (!状态区) return;
  状态区.textContent = 文本;
  状态区.classList.remove('hidden');
  状态区.classList.toggle('error', 是否错误);
}

/**
 * 显示识别结果
 */
function 显示识别结果(药品信息) {
  const 结果区 = document.getElementById('photoResult');
  if (!结果区) return;

  结果区.innerHTML = '';

  const 标题 = document.createElement('div');
  标题.className = 'result-title';
  标题.textContent = '识别结果';
  结果区.appendChild(标题);

  const 创建项目 = (标签, 值) => {
    const 项目 = document.createElement('div');
    项目.className = 'result-item';
    const 标签span = document.createElement('span');
    标签span.textContent = 标签;
    const 值strong = document.createElement('strong');
    值strong.textContent = 值;
    项目.appendChild(标签span);
    项目.appendChild(值strong);
    return 项目;
  };

  结果区.appendChild(创建项目('药品名称：', 药品信息.名称));
  结果区.appendChild(创建项目('每次剂量：', 药品信息.剂量));
  结果区.appendChild(创建项目('服药时间：', 药品信息.时间));
  结果区.appendChild(创建项目('服用备注：', 药品信息.备注));

  const 提示 = document.createElement('p');
  提示.className = 'result-tip';
  提示.textContent = '如信息有误，可在确认前切换到手动输入修改。';
  结果区.appendChild(提示);

  结果区.classList.remove('hidden');

  const 状态区 = document.getElementById('photoStatus');
  if (状态区) 状态区.classList.add('hidden');
}

/**
 * 确认添加或保存编辑药品，同步到后端
 */
export async function 确认添加药品() {
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
    const 库存输入 = document.getElementById('medStock');
    const 库存 = 库存输入 ? parseInt(库存输入.value, 10) || 0 : 0;
    const 备注 = document.getElementById('medNote').value.trim();
    if (!名称 || !剂量) {
      alert('请填写药品名称和剂量');
      return;
    }
    新药品 = { 名称, 剂量, 实际剂量: 剂量, 时间, 频率, 库存, 备注 };
  }

  if (!新药品) return;

  // 药物相互作用校验
  const 相互作用 = 检查药品相互作用(新药品.名称, 应用数据.药品列表.filter(药 => 药.编号 !== 当前编辑编号).map(药 => 药.名称));
  if (相互作用.有风险) {
    const 确认 = confirm(`⚠️ 安全提醒：${相互作用.警告}\n\n添加此药品前，请务必咨询医生或药师。是否仍要添加？`);
    if (!确认) return;
  }

  const 药品数据 = {
    name: 新药品.名称,
    dose: 新药品.剂量,
    actualDose: 新药品.实际剂量 || 新药品.剂量,
    time: 新药品.时间,
    frequency: 新药品.频率 || 'daily',
    weekDays: Array.isArray(新药品.周几) ? 新药品.周几.join(',') : '',
    intervalDays: 新药品.间隔天数 || 1,
    startDate: 新药品.开始日期 || null,
    endDate: 新药品.结束日期 || null,
    stock: 新药品.库存 ?? 0,
    note: 新药品.备注 || '',
    icon: 新药品.图标 || 获取药品图标(新药品.名称)
  };

  try {
    if (当前编辑编号) {
      if (已登录()) {
        await 药品API.更新(Number(当前编辑编号), 药品数据);
      }
      const 索引 = 应用数据.药品列表.findIndex(药 => 药.编号 === 当前编辑编号);
      if (索引 !== -1) {
        应用数据.药品列表[索引] = {
          ...应用数据.药品列表[索引],
          ...新药品,
          编号: 当前编辑编号,
          图标: 药品数据.icon
        };
      }
      播报语音(`已保存${新药品.名称}`);
      alert('保存成功！');
    } else {
      let 后端ID = null;
      if (已登录()) {
        const saved = await 药品API.新增(药品数据);
        后端ID = String(saved.id);
      }
      新药品.编号 = 后端ID || 生成编号();
      新药品.图标 = 药品数据.icon;
      新药品.实际剂量 = 新药品.剂量;
      应用数据.药品列表.push(新药品);
      播报语音(`已添加${新药品.名称}`);
      alert('添加成功！');
    }
  } catch (错误) {
    console.error('同步药品到后端失败:', 错误);
    alert('保存失败：' + 错误.message);
    return;
  }

  await 保存数据(true);
  重置添加表单();
  切换页面('today');
}
