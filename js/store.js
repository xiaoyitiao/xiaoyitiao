/**
 * 数据存储模块
 * 负责本地数据的读取、保存和默认数据管理
 */

// localStorage 存储键名
export const 存储键 = '智药伴数据';

// 默认演示数据
export const 默认数据 = {
  药品列表: [
    { 编号: '1', 名称: '阿司匹林肠溶片', 剂量: '1片', 时间: '08:00', 频率: 'daily', 备注: '饭后服用', 图标: '💊' },
    { 编号: '2', 名称: '降压药', 剂量: '1片', 时间: '12:30', 频率: 'daily', 备注: '饭前服用', 图标: '💉' }
  ],
  打卡记录: {}, // 格式：{ '药品编号_YYYY-MM-DD': true/false }
  设置: {
    长辈模式: false,
    语音播报: true,
    漏服提醒: true,
    云端同步: false,
    应用ID: '',
    应用密钥: '',
    服务地址: '',
    家庭编号: '',
    查看密码: ''
  },
  AI配置: {
    启用真实API: false,
    API地址: '',
    API密钥: '',
    模型: ''
  }
};

/**
 * 创建默认数据的深拷贝副本
 * @returns {Object}
 */
export function 创建默认数据副本() {
  return JSON.parse(JSON.stringify(默认数据));
}

// 当前应用运行时的数据副本
export let 应用数据 = 创建默认数据副本();

/**
 * 从 localStorage 加载数据
 * 如果没有保存过数据，则使用默认数据
 */
export function 加载数据() {
  try {
    const 已存数据 = localStorage.getItem(存储键);
    if (已存数据) {
      const 解析数据 = JSON.parse(已存数据);
      应用数据 = { ...默认数据, ...解析数据 };
    }
  } catch (错误) {
    console.error('读取数据失败:', 错误);
  }
}

/**
 * 将当前数据保存到 localStorage
 * 保存成功后会触发数据已保存事件，供云端同步等功能监听
 */
export function 保存数据() {
  try {
    localStorage.setItem(存储键, JSON.stringify(应用数据));
    // 触发自定义事件，通知其他模块数据已更新
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('数据已保存'));
    }
  } catch (错误) {
    console.error('保存数据失败:', 错误);
  }
}
