/**
 * 提醒与漏服检测模块
 */

import { 应用数据 } from './store.js';
import { 获取今天日期, 获取当前时间字符串 } from './utils.js';
import { 播报语音 } from './voice.js';
import { 药品打卡 } from './today.js';

// 已提醒记录，避免重复弹窗
const 已提醒记录 = new Set();

/**
 * 每分钟检查一次到点提醒与漏服提醒
 */
export function 检查提醒() {
  const 当前时间 = 获取当前时间字符串();
  const 今日 = 获取今天日期();

  应用数据.药品列表.forEach(药品 => {
    const 键 = `${药品.编号}_${今日}`;
    if (应用数据.打卡记录[键]) return;

    const 提醒键 = `${药品.编号}_${今日}_${药品.时间}`;

    // 到点提醒
    if (药品.时间 === 当前时间 && !已提醒记录.has(提醒键)) {
      已提醒记录.add(提醒键);
      显示提醒弹窗(药品);
    }

    // 漏服30分钟后再次提醒
    if (应用数据.设置.漏服提醒) {
      const 漏服时间 = 计算延迟时间(药品.时间, 30);
      const 漏服键 = `${药品.编号}_${今日}_${漏服时间}_漏服`;
      if (当前时间 === 漏服时间 && !已提醒记录.has(漏服键)) {
        已提醒记录.add(漏服键);
        显示提醒弹窗(药品, true);
      }
    }
  });
}

/**
 * 计算指定时间延迟若干分钟后的时间字符串
 * @param {string} 时间字符串 - HH:MM 格式
 * @param {number} 延迟分钟
 * @returns {string}
 */
function 计算延迟时间(时间字符串, 延迟分钟) {
  const [小时, 分钟] = 时间字符串.split(':').map(Number);
  const 日期 = new Date();
  日期.setHours(小时, 分钟 + 延迟分钟);
  return 日期.toTimeString().slice(0, 5);
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
  内容.innerHTML = `<strong>${药品.名称}</strong><br>${药品.剂量} · ${药品.备注}`;
  弹窗.classList.remove('hidden');

  播报语音(`${是否漏服 ? '您尚未服用' : '该吃药了，'}${药品.名称}，${药品.剂量}，${药品.备注}`);

  const 已服按钮 = document.getElementById('reminderTaken');
  const 稍后按钮 = document.getElementById('reminderLater');

  已服按钮.onclick = function () {
    药品打卡(药品.编号);
    弹窗.classList.add('hidden');
  };

  稍后按钮.onclick = function () {
    弹窗.classList.add('hidden');
  };
}
