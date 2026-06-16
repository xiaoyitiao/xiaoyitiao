/**
 * 设置模块
 */

import { 应用数据, 保存数据, 创建默认数据副本, 存储键 } from './store.js';
import { 渲染今日用药 } from './today.js';

/**
 * 切换长辈模式
 */
export function 切换长辈模式() {
  应用数据.设置.长辈模式 = !应用数据.设置.长辈模式;
  document.body.classList.toggle('elderly-mode', 应用数据.设置.长辈模式);
  保存数据();
  更新模式按钮();
}

/**
 * 更新顶部长辈模式按钮显示
 */
export function 更新模式按钮() {
  const 按钮 = document.getElementById('modeToggle');
  if (应用数据.设置.长辈模式) {
    按钮.querySelector('.mode-icon').textContent = '👓';
    按钮.querySelector('.mode-text').textContent = '普通模式';
  } else {
    按钮.querySelector('.mode-icon').textContent = '👴';
    按钮.querySelector('.mode-text').textContent = '长辈模式';
  }
}

/**
 * 清除所有用药数据并恢复默认
 */
export function 清除所有数据() {
  if (confirm('确定要清除所有用药数据吗？此操作不可恢复。')) {
    localStorage.removeItem(存储键);

    // 保留当前长辈模式设置
    const 当前长辈模式 = document.body.classList.contains('elderly-mode');
    const 默认副本 = 创建默认数据副本();
    默认副本.设置.长辈模式 = 当前长辈模式;

    // 将默认数据重置到当前应用数据对象中
    Object.keys(应用数据).forEach(键 => delete 应用数据[键]);
    Object.assign(应用数据, 默认副本);

    保存数据();
    渲染今日用药();
    alert('数据已清除');
  }
}
