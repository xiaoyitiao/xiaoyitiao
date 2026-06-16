/**
 * 通用工具函数模块
 */

/**
 * 生成唯一编号
 * @returns {string} 基于时间戳和随机数的唯一编号
 */
export function 生成编号() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * 获取今天的日期字符串，格式为 YYYY-MM-DD
 * @returns {string}
 */
export function 获取今天日期() {
  return new Date().toISOString().split('T')[0];
}

/**
 * 获取当前时间字符串，格式为 HH:MM
 * @returns {string}
 */
export function 获取当前时间字符串() {
  const 现在 = new Date();
  return 现在.toTimeString().slice(0, 5);
}

/**
 * 将日期对象格式化为中文长日期格式
 * @param {Date} 日期对象
 * @returns {string}
 */
export function 格式化日期(日期对象) {
  const 选项 = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  return 日期对象.toLocaleDateString('zh-CN', 选项);
}
