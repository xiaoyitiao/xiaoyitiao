/**
 * 用药历史模块
 *
 * 提供日历视图展示每日服药情况与依从率统计。
 */

import { 应用数据 } from './store.js';
import { 获取今天日期, 生成月历日期, 格式化为日期字符串 } from './utils.js';

/**
 * 渲染用药历史页面
 * @param {number} 年
 * @param {number} 月
 */
export function 渲染用药历史(年 = new Date().getFullYear(), 月 = new Date().getMonth() + 1) {
  const 标题 = document.getElementById('historyTitle');
  const 日历容器 = document.getElementById('historyCalendar');
  const 统计容器 = document.getElementById('historyStats');

  if (标题) 标题.textContent = `${年}年${月}月 用药日历`;
  if (日历容器) 日历容器.innerHTML = '';

  const 日期列表 = 生成月历日期(年, 月);
  const 药品总数 = 应用数据.药品列表.length;

  let 总应服 = 0;
  let 总已服 = 0;

  日期列表.forEach(日期字符串 => {
    const 日 = parseInt(日期字符串.split('-')[2], 10);
    const 历史记录 = 应用数据.用药历史?.[日期字符串] || {};
    const 打卡记录 = 应用数据.打卡记录 || {};

    // 合并当日打卡记录
    let 当日已服 = 0;
    应用数据.药品列表.forEach(药品 => {
      const 键 = `${药品.编号}_${日期字符串}`;
      const 打卡信息 = 打卡记录[键] || 历史记录[药品.编号];
      if (打卡信息 && (打卡信息 === true || 打卡信息.时间戳)) {
        当日已服++;
      }
    });

    const 当日应服 = 药品总数;
    总应服 += 当日应服;
    总已服 += 当日已服;

    const 单元格 = document.createElement('div');
    单元格.className = 'calendar-day';
    if (日期字符串 === 获取今天日期()) {
      单元格.classList.add('today');
    }

    const 日期号 = document.createElement('div');
    日期号.className = 'calendar-day-number';
    日期号.textContent = 日;

    const 状态 = document.createElement('div');
    状态.className = 'calendar-day-status';
    if (当日应服 === 0) {
      状态.textContent = '无计划';
      单元格.classList.add('no-plan');
    } else if (当日已服 >= 当日应服) {
      状态.textContent = '全部完成';
      单元格.classList.add('completed');
    } else if (当日已服 > 0) {
      状态.textContent = `${当日已服}/${当日应服}`;
      单元格.classList.add('partial');
    } else {
      状态.textContent = '未打卡';
      单元格.classList.add('missed');
    }

    单元格.appendChild(日期号);
    单元格.appendChild(状态);
    日历容器.appendChild(单元格);
  });

  if (统计容器) {
    const 依从率 = 总应服 === 0 ? 0 : Math.round((总已服 / 总应服) * 100);
    统计容器.innerHTML = '';

    const 创建统计项 = (标签, 值) => {
      const 项 = document.createElement('div');
      项.className = 'history-stat';
      const 数字 = document.createElement('strong');
      数字.textContent = String(值);
      const 文字 = document.createElement('span');
      文字.textContent = 标签;
      项.appendChild(数字);
      项.appendChild(文字);
      return 项;
    };

    统计容器.appendChild(创建统计项('本月应服', 总应服));
    统计容器.appendChild(创建统计项('本月已服', 总已服));
    统计容器.appendChild(创建统计项('依从率', 依从率 + '%'));
  }
}
