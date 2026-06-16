/**
 * 用药计划模块
 */

import { 应用数据, 保存数据 } from './store.js';

/**
 * 渲染全部用药计划列表
 */
export function 渲染用药计划() {
  const 列表容器 = document.getElementById('scheduleList');
  const 空状态 = document.getElementById('scheduleEmpty');
  列表容器.innerHTML = '';

  if (应用数据.药品列表.length === 0) {
    列表容器.classList.add('hidden');
    空状态.classList.remove('hidden');
    return;
  }

  列表容器.classList.remove('hidden');
  空状态.classList.add('hidden');

  const 排序列表 = [...应用数据.药品列表].sort((a, b) => a.时间.localeCompare(b.时间));
  排序列表.forEach(药品 => {
    const 项目 = document.createElement('div');
    项目.className = 'med-card';
    项目.innerHTML = `
      <div class="med-icon">${药品.图标}</div>
      <div class="med-info">
        <div class="med-name">${药品.名称}</div>
        <div class="med-detail">${药品.时间} · ${药品.剂量} · ${药品.备注}</div>
      </div>
      <button class="btn-secondary delete-btn" data-id="${药品.编号}">删除</button>
    `;
    列表容器.appendChild(项目);
  });

  列表容器.querySelectorAll('.delete-btn').forEach(按钮 => {
    按钮.addEventListener('click', function () {
      if (confirm('确定删除这个药品吗？')) {
        删除药品(this.dataset.id);
      }
    });
  });
}

/**
 * 删除指定药品
 * @param {string} 编号
 */
function 删除药品(编号) {
  应用数据.药品列表 = 应用数据.药品列表.filter(药 => 药.编号 !== 编号);
  保存数据();
  渲染用药计划();
}
