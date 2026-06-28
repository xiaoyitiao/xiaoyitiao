/**
 * 登录鉴权模块
 * 采用手机号验证码登录，所有后端请求携带 JWT token
 */

const TOKEN_KEY = '智药伴token';
const TOKEN_EXPIRE_KEY = '智药伴token过期时间';

/**
 * 获取当前 token
 */
export function 获取Token() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 保存 token
 */
export function 保存Token(token, expiresInSeconds = 604800) {
  localStorage.setItem(TOKEN_KEY, token);
  const expireAt = Date.now() + expiresInSeconds * 1000;
  localStorage.setItem(TOKEN_EXPIRE_KEY, String(expireAt));
}

/**
 * 清除登录态
 */
export function 清除登录态() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRE_KEY);
}

/**
 * 判断是否已登录
 */
export function 已登录() {
  const token = 获取Token();
  if (!token) return false;
  const expireAt = parseInt(localStorage.getItem(TOKEN_EXPIRE_KEY) || '0', 10);
  return expireAt > Date.now() + 60000; // 预留 1 分钟缓冲
}

/**
 * 发送验证码
 */
export async function 发送验证码(手机号) {
  const res = await fetch('/api/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: 手机号 })
  });
  const data = await res.json();
  if (data.code !== 200) {
    throw new Error(data.message || '发送验证码失败');
  }
  return true;
}

/**
 * 验证码登录
 */
export async function 登录(手机号, 验证码) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: 手机号, code: 验证码 })
  });
  const data = await res.json();
  if (data.code !== 200) {
    throw new Error(data.message || '登录失败');
  }
  const { token, expiresIn, userId, role } = data.data;
  保存Token(token, expiresIn);
  return { userId, role, phone: 手机号 };
}

/**
 * 退出登录
 */
export function 退出登录() {
  清除登录态();
  window.location.reload();
}

/**
 * 获取认证头
 */
export function 获取认证头() {
  const token = 获取Token();
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}
