/**
 * 今日用药模块
 */

import { 应用数据, 保存数据 } from './store.js';
import { 获取今天日期, 格式化日期 } from './utils.js';
import { 播报语音 } from './voice.js';

/**
 * 渲染今日用药列表与进度
 */
export function 渲染今日用药() {
  const 列表容器 = document.getElementById('todayList');
  const 空状态 = document.getElementById('todayEmpty');
  const 日期元素 = document.getElementById('todayDate');
  const 今日 = 获取今天日期();

  日期元素.textContent = 格式化日期(new Date());
  列表容器.innerHTML = '';

  if (应用数据.药品列表.length === 0) {
    列表容器.classList.add('hidden');
    空状态.classList.remove('hidden');
    更新进度(0, 0);
    return;
  }

  列表容器.classList.remove('hidden');
  空状态.classList.add('hidden');

  let 已完成 = 0;
  const 今日列表 = 应用数据.药品列表.map(药品 => {
    const 键 = `${药品.编号}_${今日}`;
    const 已打卡 = 应用数据.打卡记录[键] === true;
    if (已打卡) 已完成++;
    return { ...药品, 已打卡 };
  }).sort((a, b) => a.时间.localeCompare(b.时间));

  今日列表.forEach(药品 => {
    const 项目 = document.createElement('div');
    项目.className = 'med-card';
    项目.innerHTML = `
      <div class="med-icon">${药品.图标}</div>
      <div class="med-info">
        <div class="med-name">${药品.名称}</div>
        <div class="med-detail">${药品.时间} · ${药品.剂量} · ${药品.备注}</div>
      </div>
      ${药品.已打卡
        ? '<span class="status-badge 已服">已服</span>'
        : `<button class="check-btn" data-id="${药品.编号}" aria-label="打卡">✓</button>`}
    `;
    列表容器.appendChild(项目);
  });

  // 绑定打卡按钮
  列表容器.querySelectorAll('.check-btn').forEach(按钮 => {
    按钮.addEventListener('click', function () {
      药品打卡(this.dataset.id);
    });
  });

  更新进度(已完成, 应用数据.药品列表.length);
}

/**
 * 更新今日完成进度条
 * @param {number} 已完成
 * @param {number} 总数
 */
function 更新进度(已完成, 总数) {
  document.getElementById('progressText').textContent = `${已完成} / ${总数}`;
  const 百分比 = 总数 === 0 ? 0 : Math.round((已完成 / 总数) * 100);
  document.getElementById('progressFill').style.width = 百分比 + '%';
}

/**
 * 标记药品已服用
 * @param {string} 药品编号
 */
export function 药品打卡(药品编号) {
  const 今日 = 获取今天日期();
  const 键 = `${药品编号}_${今日}`;
  应用数据.打卡记录[键] = true;
  保存数据();

  const 药品 = 应用数据.药品列表.find(药 => 药.编号 === 药品编号);
  if (药品) {
    播报语音(`已记录${药品.名称}服用`);
  }

  渲染今日用药();
}
