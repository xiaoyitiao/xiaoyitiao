/**
 * 用药计划模块
 */

import { 应用数据, 保存数据 } from './store.js';
import { 编辑药品, 重置添加表单 } from './add.js';
import { 切换页面 } from './router.js';
import { 药品API } from './api.js';
import { 已登录 } from './auth.js';

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

    const 图标 = document.createElement('div');
    图标.className = 'med-icon';
    图标.textContent = 药品.图标;

    const 信息区 = document.createElement('div');
    信息区.className = 'med-info';

    const 名称 = document.createElement('div');
    名称.className = 'med-name';
    名称.textContent = 药品.名称;

    const 详情 = document.createElement('div');
    详情.className = 'med-detail';
    const 频率文本 = 频率到文本(药品.频率);
    详情.textContent = `${药品.时间} · ${频率文本} · ${药品.剂量} · ${药品.备注}`;

    信息区.appendChild(名称);
    信息区.appendChild(详情);

    const 操作区 = document.createElement('div');
    操作区.className = 'schedule-actions';

    const 编辑按钮 = document.createElement('button');
    编辑按钮.className = 'btn-secondary edit-btn';
    编辑按钮.textContent = '编辑';
    编辑按钮.dataset.id = 药品.编号;
    编辑按钮.setAttribute('aria-label', `编辑 ${药品.名称}`);

    const 删除按钮 = document.createElement('button');
    删除按钮.className = 'btn-secondary delete-btn';
    删除按钮.textContent = '删除';
    删除按钮.dataset.id = 药品.编号;
    删除按钮.setAttribute('aria-label', `删除 ${药品.名称}`);

    操作区.appendChild(编辑按钮);
    操作区.appendChild(删除按钮);

    项目.appendChild(图标);
    项目.appendChild(信息区);
    项目.appendChild(操作区);
    列表容器.appendChild(项目);
  });

  列表容器.querySelectorAll('.edit-btn').forEach(按钮 => {
    按钮.addEventListener('click', function () {
      重置添加表单();
      编辑药品(this.dataset.id);
    });
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
 * 将频率代码转为可读文本
 * @param {string} 频率
 * @returns {string}
 */
function 频率到文本(频率) {
  const 映射 = {
    daily: '每天',
    weekly: '每周',
    once: '仅一次',
    interval: '间隔天数',
    custom: '自定义'
  };
  return 映射[频率] || 频率;
}

/**
 * 删除指定药品
 * @param {string} 编号
 */
async function 删除药品(编号) {
  if (已登录()) {
    try {
      await 药品API.删除(Number(编号));
    } catch (错误) {
      console.error('删除后端药品失败:', 错误);
      alert('删除失败：' + 错误.message);
      return;
    }
  }
  应用数据.药品列表 = 应用数据.药品列表.filter(药 => 药.编号 !== 编号);
  await 保存数据(true);
  渲染用药计划();
}
