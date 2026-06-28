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
 * 获取今天的日期字符串，格式为 YYYY-MM-DD（使用本地时区）
 * @returns {string}
 */
export function 获取今天日期() {
  const 现在 = new Date();
  const 年 = 现在.getFullYear();
  const 月 = String(现在.getMonth() + 1).padStart(2, '0');
  const 日 = String(现在.getDate()).padStart(2, '0');
  return `${年}-${月}-${日}`;
}

/**
 * 获取当前时间字符串，格式为 HH:MM（使用本地时区）
 * @returns {string}
 */
export function 获取当前时间字符串() {
  const 现在 = new Date();
  const 时 = String(现在.getHours()).padStart(2, '0');
  const 分 = String(现在.getMinutes()).padStart(2, '0');
  return `${时}:${分}`;
}

/**
 * 获取当前日期时间对象
 * @returns {Date}
 */
export function 获取当前时间() {
  return new Date();
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

/**
 * 将日期格式化为 YYYY-MM-DD（本地时区）
 * @param {Date} 日期
 * @returns {string}
 */
export function 格式化为日期字符串(日期) {
  const 年 = 日期.getFullYear();
  const 月 = String(日期.getMonth() + 1).padStart(2, '0');
  const 日 = String(日期.getDate()).padStart(2, '0');
  return `${年}-${月}-${日}`;
}

/**
 * 解析 HH:MM 时间字符串为当天 Date 对象
 * @param {string} 时间字符串
 * @param {Date} [基准日期]
 * @returns {Date}
 */
export function 时间到日期对象(时间字符串, 基准日期 = new Date()) {
  const [时, 分] = 时间字符串.split(':').map(Number);
  const 日期 = new Date(基准日期.getTime());
  日期.setHours(时, 分, 0, 0);
  return 日期;
}

/**
 * 计算两个 HH:MM 时间字符串相差的分钟数（a - b）
 * @param {string} 时间A
 * @param {string} 时间B
 * @returns {number}
 */
export function 时间相差分钟(时间A, 时间B) {
  const [时A, 分A] = 时间A.split(':').map(Number);
  const [时B, 分B] = 时间B.split(':').map(Number);
  return (时A * 60 + 分A) - (时B * 60 + 分B);
}

/**
 * 判断当前时间是否已经超过给定时间 N 分钟
 * @param {string} 时间字符串
 * @param {number} 分钟数
 * @returns {boolean}
 */
export function 已超过时间N分钟(时间字符串, 分钟数) {
  const 现在 = 获取当前时间字符串();
  return 时间相差分钟(现在, 时间字符串) >= 分钟数;
}

/**
 * 生成指定月份的所有日期字符串数组
 * @param {number} 年
 * @param {number} 月
 * @returns {string[]}
 */
export function 生成月历日期(年, 月) {
  const 日期列表 = [];
  const 当月天数 = new Date(年, 月, 0).getDate();
  for (let 日 = 1; 日 <= 当月天数; 日++) {
    日期列表.push(`${年}-${String(月).padStart(2, '0')}-${String(日).padStart(2, '0')}`);
  }
  return 日期列表;
}

/**
 * 深拷贝对象
 * @param {any} 对象
 * @returns {any}
 */
export function 深拷贝(对象) {
  return JSON.parse(JSON.stringify(对象));
}

/**
 * 带超时的 fetch 封装
 * @param {string|Request} 地址
 * @param {Object} 选项
 * @param {number} 超时毫秒
 * @returns {Promise<Response>}
 */
export async function 安全Fetch(地址, 选项 = {}, 超时 = 15000) {
  const 控制器 = new AbortController();
  const 超时ID = setTimeout(() => 控制器.abort(), 超时);
  try {
    const 响应 = await fetch(地址, { ...选项, signal: 控制器.signal });
    return 响应;
  } finally {
    clearTimeout(超时ID);
  }
}

/**
 * 有限重试的异步函数包装器
 * @param {Function} 异步函数
 * @param {number} 最大重试次数
 * @param {number} 延迟毫秒
 * @returns {Promise<any>}
 */
export async function 重试执行(异步函数, 最大重试次数 = 2, 延迟 = 1000) {
  let 最后错误;
  for (let i = 0; i <= 最大重试次数; i++) {
    try {
      return await 异步函数();
    } catch (错误) {
      最后错误 = 错误;
      if (i < 最大重试次数) {
        await new Promise(解决 => setTimeout(解决, 延迟));
      }
    }
  }
  throw 最后错误;
}
