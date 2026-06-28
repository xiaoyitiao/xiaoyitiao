/**
 * 数据存储模块
 * 本地 Store 只作为展示缓存，所有关键数据增删改都会同步到后端 MySQL
 */

import { 加密文本, 解密文本, 像是密文 } from './security.js';
import { 药品API, 打卡API, 计划API } from './api.js';
import { 已登录 } from './auth.js';

// localStorage 存储键名
export const 存储键 = '智药伴数据';
export const 敏感数据键 = '智药伴敏感数据';
export const 已提醒键 = '智药伴已提醒记录';

// 数据版本号，用于未来迁移
export const 当前数据版本 = 3;

// 默认演示数据
export const 演示数据 = {
  药品列表: [],
  打卡记录: {},
  设置: {
    长辈模式: false,
    语音播报: true,
    漏服提醒: true,
    漏服提醒分钟: 30,
    数据加密: false,
    加密口令: '',
    紧急联系人: '',
    隐私已同意: false,
    当前角色: 'elder'
  },
  AI配置: {
    启用真实API: false,
    API地址: '',
    API密钥: '',
    模型: ''
  },
  首次使用: true,
  演示模式: false,
  数据版本: 当前数据版本,
  用药历史: {},
  用药统计: { 连续打卡天数: 0, 最近打卡日期: '' },
  当前用户: null
};

/**
 * 创建默认数据的深拷贝副本
 */
export function 创建默认数据副本() {
  return JSON.parse(JSON.stringify(演示数据));
}

// 当前应用运行时的数据副本
export let 应用数据 = 创建默认数据副本();

/**
 * 安全解析 JSON，失败返回 null
 */
function 安全解析(文本) {
  try {
    return JSON.parse(文本);
  } catch {
    return null;
  }
}

/**
 * 解密敏感配置字段
 */
async function 解密敏感配置() {
  const 已存敏感数据 = localStorage.getItem(敏感数据键);
  if (!已存敏感数据) return;

  const 敏感数据 = 安全解析(已存敏感数据);
  if (!敏感数据 || typeof 敏感数据 !== 'object') return;

  const 口令 = 应用数据.设置.加密口令 || 'zhiyaoban-default-key';

  const 解密字段 = async (字段名, 目标对象, 目标键) => {
    if (敏感数据[字段名]) {
      const 明文 = await 解密文本(敏感数据[字段名], 口令);
      if (明文 !== null) {
        目标对象[目标键] = 明文;
      }
    }
  };

  // 保留旧字段兼容，但后端上线后建议清空本地 AI 密钥
  await 解密字段('API密钥', 应用数据.AI配置, 'API密钥');
}

/**
 * 加密并保存敏感配置字段
 */
export async function 保存敏感配置() {
  const 敏感数据 = {};
  const 口令 = 应用数据.设置.加密口令 || 'zhiyaoban-default-key';

  const 加密字段 = async (字段名, 源值) => {
    if (源值) {
      敏感数据[字段名] = await 加密文本(源值, 口令);
    }
  };

  // 后端上线后，AI 密钥不再保存在前端
  await 加密字段('API密钥', 应用数据.AI配置.API密钥);

  // 保存到本地时，主存储中这些字段置空，避免明文泄露
  const 待保存数据 = JSON.parse(JSON.stringify(应用数据));
  待保存数据.AI配置.API密钥 = '';

  localStorage.setItem(存储键, JSON.stringify(待保存数据));
  localStorage.setItem(敏感数据键, JSON.stringify(敏感数据));
}

/**
 * 从后端同步药品列表和今日打卡记录
 */
export async function 从后端同步数据() {
  if (!已登录()) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const [药品列表, 今日打卡, 计划数据] = await Promise.all([
      药品API.列表(),
      打卡API.列表(today),
      计划API.今日(today)
    ]);

    应用数据.药品列表 = 药品列表.map(药 => ({
      编号: String(药.id),
      名称: 药.name,
      剂量: 药.dose,
      实际剂量: 药.actualDose || 药.dose,
      时间: 药.time,
      频率: 药.frequency,
      周几: 药.weekDays ? 药.weekDays.split(',').map(Number) : [],
      间隔天数: 药.intervalDays || 1,
      开始日期: 药.startDate || '',
      结束日期: 药.endDate || '',
      库存: 药.stock || 0,
      备注: 药.note || '',
      图标: 药.icon || '💊'
    }));

    应用数据.打卡记录 = {};
    (今日打卡 || []).forEach(记录 => {
      const key = `${记录.medicineId}_${记录.date}`;
      应用数据.打卡记录[key] = {
        时间戳: new Date(记录.takenAt).getTime(),
        剂量: 记录.dose || ''
      };
    });

    await 保存数据(true);
  } catch (错误) {
    console.error('从后端同步数据失败:', 错误);
  }
}

/**
 * 从 localStorage 加载数据
 */
export async function 加载数据() {
  try {
    const 已存数据 = localStorage.getItem(存储键);
    if (已存数据) {
      const 解析数据 = 安全解析(已存数据);
      if (解析数据) {
        应用数据 = { ...创建默认数据副本(), ...解析数据 };
        应用数据.数据版本 = 当前数据版本;
        迁移打卡记录();
        await 解密敏感配置();
      }
    }
  } catch (错误) {
    console.error('读取数据失败:', 错误);
  }
}

/**
 * 迁移旧版布尔值打卡记录为对象格式
 */
function 迁移打卡记录() {
  const 记录 = 应用数据.打卡记录 || {};
  let 有更新 = false;
  for (const 键 in 记录) {
    if (记录[键] === true) {
      记录[键] = { 时间戳: Date.now(), 剂量: '' };
      有更新 = true;
    }
  }
  if (有更新) {
    应用数据.打卡记录 = 记录;
  }
}

/**
 * 将当前数据保存到 localStorage
 * @param {boolean} 仅本地 - 是否只保存本地不同步后端（避免循环同步）
 */
export async function 保存数据(仅本地 = false) {
  try {
    await 保存敏感配置();
    if (!仅本地 && typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('数据已保存'));
    }
  } catch (错误) {
    console.error('保存数据失败:', 错误);
    if (错误.name === 'QuotaExceededError' || 错误.code === 22) {
      alert('本地存储空间已满，请导出备份后清理历史数据。');
    }
  }
}

/**
 * 同步保存数据（简单场景）
 */
export function 保存数据同步() {
  try {
    const 待保存数据 = JSON.parse(JSON.stringify(应用数据));
    待保存数据.AI配置.API密钥 = '';
    localStorage.setItem(存储键, JSON.stringify(待保存数据));
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('数据已保存'));
    }
  } catch (错误) {
    console.error('保存数据失败:', 错误);
  }
}

/**
 * 导出完整数据为 JSON 字符串
 */
export function 导出数据() {
  return JSON.stringify(应用数据, null, 2);
}

/**
 * 从 JSON 字符串导入数据
 */
export function 导入数据(JSON文本) {
  try {
    const 数据 = 安全解析(JSON文本);
    if (!数据 || typeof 数据 !== 'object') return false;
    应用数据 = { ...创建默认数据副本(), ...数据 };
    迁移打卡记录();
    return true;
  } catch (错误) {
    console.error('导入数据失败:', 错误);
    return false;
  }
}

/**
 * 归档历史打卡记录，按日期整理到用药历史中
 */
export function 归档用药历史() {
  const 历史 = 应用数据.用药历史 || {};
  const 记录 = 应用数据.打卡记录 || {};

  for (const 键 in 记录) {
    const [药品编号, 日期] = 键.split('_');
    if (!历史[日期]) 历史[日期] = {};
    if (typeof 记录[键] === 'object') {
      历史[日期][药品编号] = { ...记录[键] };
    }
  }

  应用数据.用药历史 = 历史;
}
