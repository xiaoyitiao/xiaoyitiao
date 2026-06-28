/**
 * 语音模块
 * 负责语音识别与语音播报功能
 *
 * 改进：
 * 1. 模块顶层不直接访问 window.speechSynthesis，使用时惰性获取。
 * 2. 语音识别交互改为“点击开始、再点击结束”的单次点击模式。
 * 3. 播报前判断 API 存在性，避免旧浏览器报错。
 */

import { 应用数据 } from './store.js';

// 语音识别对象，初始为空
export let 语音识别对象 = null;

// 当前语音输入目标：'add' 添加药品 或 'chat' AI聊天
export let 当前语音输入目标 = null;

// 是否正在录音
let 正在录音 = false;

/**
 * 获取语音合成对象（惰性）
 * @returns {SpeechSynthesis|null}
 */
function 获取语音合成对象() {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis || null;
}

/**
 * 设置当前语音输入目标
 * @param {string} 目标
 */
export function 设置语音输入目标(目标) {
  当前语音输入目标 = 目标;
}

/**
 * 初始化浏览器语音识别功能
 * @returns {SpeechRecognition|null}
 */
export function 初始化语音识别() {
  if (typeof window === 'undefined') return null;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('当前浏览器不支持语音识别');
    return null;
  }

  const 识别 = new SpeechRecognition();
  识别.lang = 'zh-CN';
  识别.continuous = false;
  识别.interimResults = false;

  识别.onstart = function () {
    正在录音 = true;
    const 录音按钮 = document.getElementById('recordBtn');
    if (录音按钮) {
      录音按钮.classList.add('recording');
      const 文字 = document.getElementById('recordText');
      if (文字) 文字.textContent = '点击结束';
    }
    const 聊天语音按钮 = document.getElementById('chatVoiceBtn');
    if (聊天语音按钮) 聊天语音按钮.textContent = '🔴';
  };

  识别.onend = function () {
    正在录音 = false;
    const 录音按钮 = document.getElementById('recordBtn');
    if (录音按钮) {
      录音按钮.classList.remove('recording');
      const 文字 = document.getElementById('recordText');
      if (文字) 文字.textContent = '点击说话';
    }
    const 聊天语音按钮 = document.getElementById('chatVoiceBtn');
    if (聊天语音按钮) 聊天语音按钮.textContent = '🎤';
  };

  识别.onresult = function (事件) {
    const 文本 = 事件.results[0][0].transcript;
    document.dispatchEvent(new CustomEvent('语音输入结果', { detail: { 目标: 当前语音输入目标, 文本 } }));
  };

  识别.onerror = function (事件) {
    console.error('语音识别错误:', 事件.error);
    播报语音('语音识别失败，请重试');
    正在录音 = false;
  };

  语音识别对象 = 识别;
  return 识别;
}

/**
 * 切换录音状态（点击开始/结束）
 * @param {string} 目标
 * @returns {boolean} 是否成功启动
 */
export function 切换录音状态(目标 = 'add') {
  if (!语音识别对象) {
    return false;
  }

  设置语音输入目标(目标);

  if (正在录音) {
    try {
      语音识别对象.stop();
      return true;
    } catch (错误) {
      console.error('语音识别停止失败:', 错误);
      return false;
    }
  } else {
    try {
      语音识别对象.start();
      return true;
    } catch (错误) {
      console.error('语音识别启动失败:', 错误);
      return false;
    }
  }
}

/**
 * 使用语音合成播报文本
 * @param {string} 文本
 */
export function 播报语音(文本) {
  if (!应用数据.设置.语音播报) return;

  const 合成对象 = 获取语音合成对象();
  if (!合成对象) return;

  try {
    // 先停止之前的播报
    合成对象.cancel();
    const 话语 = new SpeechSynthesisUtterance(文本);
    话语.lang = 'zh-CN';
    话语.rate = 0.95;
    话语.pitch = 1;
    合成对象.speak(话语);
  } catch (错误) {
    console.error('语音播报失败:', 错误);
  }
}
