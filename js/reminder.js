/**
 * 提醒与漏服检测模块
 *
 * 改进：
 * 1. 使用本地时区判断日期和时间。
 * 2. 采用时间窗判断：当前时间 ≥ 服药时间且未打卡则触发，避免精确到分钟的漏检。
 * 3. 漏服提醒改为“超过服药时间 N 分钟仍未打卡”持续提醒。
 * 4. 已提醒记录持久化到 localStorage，按天清理。
 * 5. 后台标签页通过 visibilitychange 重新检查。
 */

import { 应用数据, 已提醒键 } from './store.js';
import { 获取今天日期, 获取当前时间字符串, 时间相差分钟 } from './utils.js';
import { 播报语音 } from './voice.js';
import { 药品打卡 } from './today.js';

// 已提醒记录，避免重复弹窗
let 已提醒记录 = new Set();

/**
 * 加载今日已提醒记录
 */
function 加载已提醒记录() {
  try {
    const 今日 = 获取今天日期();
    const 已存 = localStorage.getItem(已提醒键);
    if (已存) {
      const 数据 = JSON.parse(已存);
      if (数据.日期 === 今日 && Array.isArray(数据.记录)) {
        已提醒记录 = new Set(数据.记录);
      } else {
        已提醒记录 = new Set();
        保存已提醒记录();
      }
    }
  } catch (错误) {
    console.error('加载已提醒记录失败:', 错误);
    已提醒记录 = new Set();
  }
}

/**
 * 保存今日已提醒记录到 localStorage
 */
function 保存已提醒记录() {
  try {
    const 今日 = 获取今天日期();
    localStorage.setItem(已提醒键, JSON.stringify({
      日期: 今日,
      记录: Array.from(已提醒记录)
    }));
  } catch (错误) {
    console.error('保存已提醒记录失败:', 错误);
  }
}

/**
 * 检查并触发到点提醒与漏服提醒
 */
export function 检查提醒() {
  const 当前时间 = 获取当前时间字符串();
  const 今日 = 获取今天日期();

  加载已提醒记录();

  应用数据.药品列表.forEach(药品 => {
    const 键 = `${药品.编号}_${今日}`;
    const 打卡信息 = 应用数据.打卡记录[键];
    if (打卡信息 && (打卡信息 === true || 打卡信息.时间戳)) return;

    const 到点提醒键 = `${药品.编号}_${今日}_到点`;
    const 漏服提醒键 = `${药品.编号}_${今日}_漏服`;

    // 到点提醒：当前时间 >= 服药时间，且当天未提醒过
    const 到点分钟差 = 时间相差分钟(当前时间, 药品.时间);
    if (到点分钟差 >= 0 && !已提醒记录.has(到点提醒键)) {
      已提醒记录.add(到点提醒键);
      保存已提醒记录();
      显示提醒弹窗(药品, false);
    }

    // 漏服提醒：超过服药时间 N 分钟仍未打卡
    if (应用数据.设置.漏服提醒) {
      const 漏服分钟 = 应用数据.设置.漏服提醒分钟 || 30;
      if (到点分钟差 >= 漏服分钟 && !已提醒记录.has(漏服提醒键)) {
        已提醒记录.add(漏服提醒键);
        保存已提醒记录();
        显示提醒弹窗(药品, true);
      }
    }
  });
}

/**
 * 显示用药提醒弹窗
 * @param {Object} 药品
 * @param {boolean} 是否漏服
 */
function 显示提醒弹窗(药品, 是否漏服 = false) {
  const 弹窗 = document.getElementById('reminderModal');
  const 标题 = document.getElementById('reminderTitle');
  const 内容 = document.getElementById('reminderBody');

  标题.textContent = 是否漏服 ? '漏服提醒' : '该吃药了';

  let 正文 = `${药品.名称}\n${药品.剂量} · ${药品.备注}`;
  if (是否漏服) {
    正文 += '\n\n' + 生成补服建议(药品);
  }
  // 使用 textContent 避免 XSS
  内容.textContent = 正文;
  内容.style.whiteSpace = 'pre-line';
  弹窗.classList.remove('hidden');

  播报语音(`${是否漏服 ? '您尚未服用' : '该吃药了，'}${药品.名称}，${药品.剂量}，${药品.备注}`);

  const 已服按钮 = document.getElementById('reminderTaken');
  const 稍后按钮 = document.getElementById('reminderLater');

  // 移除旧事件，避免重复绑定
  const 新已服按钮 = 已服按钮.cloneNode(true);
  const 新稍后按钮 = 稍后按钮.cloneNode(true);
  已服按钮.parentNode.replaceChild(新已服按钮, 已服按钮);
  稍后按钮.parentNode.replaceChild(新稍后按钮, 稍后按钮);

  新已服按钮.addEventListener('click', function () {
    药品打卡(药品.编号);
    弹窗.classList.add('hidden');
  });

  新稍后按钮.addEventListener('click', function () {
    弹窗.classList.add('hidden');
  });
}

/**
 * 根据药品类型与漏服时长生成补服建议
 * @param {Object} 药品
 * @returns {string}
 */
function 生成补服建议(药品) {
  const 名称 = 药品.名称 || '';
  if (名称.includes('降压') || 名称.includes('降糖')) {
    return '补服建议：若距离下次服药时间尚早，可咨询医生后决定是否补服；若已接近下次用药时间，通常跳过本次，切勿加倍服用。';
  }
  if (名称.includes('抗生素') || 名称.includes('头孢') || 名称.includes('阿莫西林')) {
    return '补服建议：抗生素需保持血药浓度稳定，漏服后应尽快补服，但若已接近下次服药时间，请咨询医生，不要自行加倍。';
  }
  return '补服建议：一般漏服一次不要补服双倍剂量。若漏服时间不长，可考虑补服；若已接近下次用药时间，建议跳过本次并咨询医生。';
}

/**
 * 监听页面可见性变化，切回前台时重新检查提醒
 */
export function 启用后台切回检查() {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        检查提醒();
      }
    });
  }
}
