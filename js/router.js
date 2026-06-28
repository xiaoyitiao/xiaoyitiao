/**
 * 页面路由模块
 * 负责单页面应用的页面切换
 */

import { 渲染今日用药 } from './today.js';
import { 渲染用药计划 } from './schedule.js';
import { 渲染家属关怀 } from './family.js';
import { 渲染用药历史 } from './history.js';
import { 重置添加表单 } from './add.js';

// 历史页面当前显示的月份
let 历史年月 = { 年: new Date().getFullYear(), 月: new Date().getMonth() + 1 };

/**
 * 切换到指定页面
 * @param {string} 页面名
 */
export function 切换页面(页面名) {
  document.querySelectorAll('.page').forEach(页面 => 页面.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(项 => 项.classList.remove('active'));

  const 目标页面 = document.getElementById('page-' + 页面名);
  if (目标页面) 目标页面.classList.add('active');

  const 目标导航 = document.querySelector(`.nav-item[data-page="${页面名}"]`);
  if (目标导航) 目标导航.classList.add('active');

  // 渲染对应页面数据
  if (页面名 === 'today') 渲染今日用药();
  if (页面名 === 'schedule') 渲染用药计划();
  if (页面名 === 'family') 渲染家属关怀();
  if (页面名 === 'history') 渲染用药历史(历史年月.年, 历史年月.月);
  if (页面名 === 'add') 重置添加表单();
}

/**
 * 绑定历史页面月份导航事件
 */
export function 初始化历史导航() {
  const 上月按钮 = document.getElementById('historyPrevBtn');
  const 下月按钮 = document.getElementById('historyNextBtn');

  if (上月按钮) {
    上月按钮.addEventListener('click', () => {
      历史年月.月--;
      if (历史年月.月 < 1) {
        历史年月.月 = 12;
        历史年月.年--;
      }
      渲染用药历史(历史年月.年, 历史年月.月);
    });
  }

  if (下月按钮) {
    下月按钮.addEventListener('click', () => {
      历史年月.月++;
      if (历史年月.月 > 12) {
        历史年月.月 = 1;
        历史年月.年++;
      }
      渲染用药历史(历史年月.年, 历史年月.月);
    });
  }
}
