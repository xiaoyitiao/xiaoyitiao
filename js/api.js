/**
 * 后端 API 客户端
 * 所有请求自动携带 JWT token，统一错误处理
 */

import { 获取认证头, 已登录, 退出登录 } from './auth.js';

// 开发环境使用相对路径（由 Vite dev server 代理到后端）
// 生产环境可通过构建时注入的 VITE_API_BASE_URL 指定后端域名
const BASE_URL = import.meta.env?.VITE_API_BASE_URL || '';

/**
 * 统一请求封装
 */
export async function api请求(路径, 选项 = {}) {
  const url = `${BASE_URL}${路径}`;
  const headers = {
    'Content-Type': 'application/json',
    ...获取认证头(),
    ...(选项.headers || {})
  };

  const response = await fetch(url, {
    ...选项,
    headers
  });

  if (response.status === 401) {
    退出登录();
    throw new Error('登录已过期，请重新登录');
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('服务器返回格式错误');
  }

  if (!response.ok || data.code !== 200) {
    throw new Error(data.message || `请求失败：${response.status}`);
  }

  return data.data;
}

/**
 * GET 请求
 */
export function apiGet(路径) {
  return api请求(路径, { method: 'GET' });
}

/**
 * POST 请求
 */
export function apiPost(路径, 数据) {
  return api请求(路径, {
    method: 'POST',
    body: JSON.stringify(数据)
  });
}

/**
 * PUT 请求
 */
export function apiPut(路径, 数据) {
  return api请求(路径, {
    method: 'PUT',
    body: JSON.stringify(数据)
  });
}

/**
 * DELETE 请求
 */
export function apiDelete(路径) {
  return api请求(路径, { method: 'DELETE' });
}

/**
 * 检查当前登录状态是否有效
 */
export async function 检查登录状态() {
  if (!已登录()) return false;
  try {
    await apiGet('/api/user/me');
    return true;
  } catch (e) {
    return false;
  }
}

// 药品 API
export const 药品API = {
  列表: () => apiGet('/api/medicines'),
  获取: (id) => apiGet(`/api/medicines/${id}`),
  新增: (data) => apiPost('/api/medicines', data),
  更新: (id, data) => apiPut(`/api/medicines/${id}`, data),
  删除: (id) => apiDelete(`/api/medicines/${id}`)
};

// 打卡 API
export const 打卡API = {
  列表: (date) => apiGet(`/api/check-ins?date=${date}`),
  打卡: (data) => apiPost('/api/check-ins', data),
  月记录: (month) => apiGet(`/api/check-ins/month?month=${month}`)
};

// 今日计划 API
export const 计划API = {
  今日: (date) => apiGet(`/api/schedule/today?date=${date}`)
};

// 家人 API
export const 家人API = {
  绑定: (data) => apiPost('/api/family/bind', data),
  我的老人: () => apiGet('/api/family/my-elders'),
  我的家属: () => apiGet('/api/family/my-families'),
  老人今日: (elderUserId) => apiGet(`/api/family/elder-today/${elderUserId}`)
};

// AI API
export const AI后端API = {
  聊天: (message, systemPrompt) => apiPost('/api/ai/chat', { message, systemPrompt }),
  解析: (content, systemPrompt) => apiPost('/api/ai/parse', { content, systemPrompt })
};

// 提醒订阅 API
export const 提醒API = {
  订阅: (subscription) => apiPost('/api/reminders/subscribe', subscription),
  测试推送: () => apiPost('/api/reminders/test-push')
};
