/**
 * 登录弹窗模块
 * 负责手机号验证码登录的 UI 控制与后端交互
 */

import { 发送验证码, 登录, 已登录, 获取Token, 退出登录 } from './auth.js';
import { 从后端同步数据 } from './store.js';
import { 切换页面 } from './router.js';
import { 渲染今日用药 } from './today.js';

let 登录后回调 = null;

/**
 * 初始化登录弹窗事件
 */
export function 初始化登录弹窗() {
  const 登录弹窗 = document.getElementById('loginModal');
  const 发送验证码按钮 = document.getElementById('sendCodeBtn');
  const 登录按钮 = document.getElementById('loginBtn');
  const 手机号输入 = document.getElementById('loginPhone');
  const 验证码输入 = document.getElementById('loginCode');

  if (!登录弹窗 || !发送验证码按钮 || !登录按钮) return;

  发送验证码按钮.addEventListener('click', async function () {
    const 手机号 = 手机号输入.value.trim();
    if (!/^1\d{10}$/.test(手机号)) {
      alert('请输入正确的 11 位手机号');
      return;
    }

    发送验证码按钮.disabled = true;
    发送验证码按钮.textContent = '发送中...';

    try {
      await 发送验证码(手机号);
      alert('验证码已发送，请查收短信');
      开始倒计时(发送验证码按钮);
    } catch (错误) {
      alert('发送验证码失败：' + 错误.message);
      发送验证码按钮.disabled = false;
      发送验证码按钮.textContent = '获取验证码';
    }
  });

  登录按钮.addEventListener('click', async function () {
    const 手机号 = 手机号输入.value.trim();
    const 验证码 = 验证码输入.value.trim();

    if (!/^1\d{10}$/.test(手机号)) {
      alert('请输入正确的手机号');
      return;
    }
    if (!/^\d{6}$/.test(验证码)) {
      alert('请输入 6 位验证码');
      return;
    }

    登录按钮.disabled = true;
    登录按钮.textContent = '登录中...';

    try {
      const 用户信息 = await 登录(手机号, 验证码);
      alert('登录成功！');
      隐藏登录弹窗();
      更新用户状态(手机号);
      await 从后端同步数据();
      渲染今日用药();
      if (登录后回调) {
        登录后回调(用户信息);
        登录后回调 = null;
      }
    } catch (错误) {
      alert('登录失败：' + 错误.message);
    } finally {
      登录按钮.disabled = false;
      登录按钮.textContent = '登录';
    }
  });

  // 顶部退出登录按钮
  const 顶部退出按钮 = document.getElementById('logoutBtn');
  if (顶部退出按钮) {
    顶部退出按钮.addEventListener('click', function () {
      if (confirm('确定要退出登录吗？')) {
        退出登录();
      }
    });
  }

  // 设置页退出登录按钮
  const 设置退出按钮 = document.getElementById('settingsLogoutBtn');
  if (设置退出按钮) {
    设置退出按钮.addEventListener('click', function () {
      if (confirm('确定要退出登录吗？')) {
        退出登录();
      }
    });
  }
}

/**
 * 显示登录弹窗
 * @param {Function} 回调 - 登录成功后的回调函数
 */
export function 显示登录弹窗(回调 = null) {
  const 登录弹窗 = document.getElementById('loginModal');
  if (!登录弹窗) return;

  登录后回调 = 回调;
  登录弹窗.classList.remove('hidden');

  const 手机号输入 = document.getElementById('loginPhone');
  if (手机号输入) {
    手机号输入.value = '';
    手机号输入.focus();
  }
  const 验证码输入 = document.getElementById('loginCode');
  if (验证码输入) 验证码输入.value = '';
}

/**
 * 隐藏登录弹窗
 */
export function 隐藏登录弹窗() {
  const 登录弹窗 = document.getElementById('loginModal');
  if (登录弹窗) 登录弹窗.classList.add('hidden');
}

/**
 * 更新顶部用户状态显示
 */
export function 更新用户状态(手机号 = '') {
  const 用户显示 = document.getElementById('userPhone');
  const 退出按钮 = document.getElementById('logoutBtn');

  if (已登录()) {
    if (用户显示) {
      用户显示.textContent = 手机号 || '已登录';
      用户显示.classList.remove('hidden');
    }
    if (退出按钮) 退出按钮.classList.remove('hidden');
  } else {
    if (用户显示) {
      用户显示.textContent = '';
      用户显示.classList.add('hidden');
    }
    if (退出按钮) 退出按钮.classList.add('hidden');
  }
}

/**
 * 检查登录状态，未登录时显示弹窗
 * @returns {boolean} 是否已登录
 */
export function 要求登录() {
  if (已登录()) return true;
  显示登录弹窗();
  return false;
}

/**
 * 发送验证码按钮倒计时
 */
function 开始倒计时(按钮) {
  let 剩余秒数 = 60;
  按钮.disabled = true;
  按钮.textContent = `${剩余秒数}s 后重试`;

  const 定时器 = setInterval(() => {
    剩余秒数--;
    if (剩余秒数 <= 0) {
      clearInterval(定时器);
      按钮.disabled = false;
      按钮.textContent = '获取验证码';
    } else {
      按钮.textContent = `${剩余秒数}s 后重试`;
    }
  }, 1000);
}
