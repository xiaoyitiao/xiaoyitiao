/**
 * 家属关怀模块
 */

import { 应用数据 } from './store.js';
import { 获取今天日期, 获取当前时间字符串 } from './utils.js';

/**
 * 渲染家属关怀页面统计与列表
 */
export function 渲染家属关怀() {
  const 今日 = 获取今天日期();
  const 总数 = 应用数据.药品列表.length;
  let 已服 = 0;
  let 漏服 = 0;

  const 列表容器 = document.getElementById('familyList');
  列表容器.innerHTML = '';

  const 排序列表 = [...应用数据.药品列表].sort((a, b) => a.时间.localeCompare(b.时间));
  const 当前时间 = 获取当前时间字符串();

  排序列表.forEach(药品 => {
    const 键 = `${药品.编号}_${今日}`;
    const 已打卡 = 应用数据.打卡记录[键] === true;
    if (已打卡) {
      已服++;
    } else if (药品.时间 < 当前时间) {
      漏服++;
    }

    const 状态 = 已打卡 ? '已服' : (药品.时间 < 当前时间 ? '漏服' : '待服');
    const 项目 = document.createElement('div');
    项目.className = 'med-card';
    项目.innerHTML = `
      <div class="med-icon">${药品.图标}</div>
      <div class="med-info">
        <div class="med-name">${药品.名称}</div>
        <div class="med-detail">${药品.时间} · ${药品.剂量}</div>
      </div>
      <span class="status-badge ${状态}">${状态}</span>
    `;
    列表容器.appendChild(项目);
  });

  document.getElementById('familyTotal').textContent = 总数;
  document.getElementById('familyTaken').textContent = 已服;
  document.getElementById('familyMissed').textContent = 漏服;

  const 预警框 = document.getElementById('familyAlert');
  if (漏服 > 0) {
    预警框.classList.remove('hidden');
  } else {
    预警框.classList.add('hidden');
  }

  // 更新最后活跃时间
  const 最后活跃 = localStorage.getItem('智药伴最后活跃');
  document.getElementById('lastActive').textContent = 最后活跃 || '今日未登录';
}
