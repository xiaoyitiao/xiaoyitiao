/**
 * 语音模块
 * 负责语音识别与语音播报功能
 */

import { 应用数据 } from './store.js';

// 语音识别对象，初始为空
export let 语音识别对象 = null;

// 语音合成对象
export const 语音合成对象 = window.speechSynthesis;

// 当前语音输入目标：'add' 添加药品 或 'chat' AI聊天
export let 当前语音输入目标 = null;

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
    const 录音按钮 = document.getElementById('recordBtn');
    if (录音按钮) {
      录音按钮.classList.add('recording');
      document.getElementById('recordText').textContent = '录音中...';
    }
    const 聊天语音按钮 = document.getElementById('chatVoiceBtn');
    if (聊天语音按钮) 聊天语音按钮.textContent = '🔴';
  };

  识别.onend = function () {
    const 录音按钮 = document.getElementById('recordBtn');
    if (录音按钮) {
      录音按钮.classList.remove('recording');
      document.getElementById('recordText').textContent = '按住说话';
    }
    const 聊天语音按钮 = document.getElementById('chatVoiceBtn');
    if (聊天语音按钮) 聊天语音按钮.textContent = '🎤';
  };

  识别.onresult = function (事件) {
    const 文本 = 事件.results[0][0].transcript;
    // 使用自定义事件分发识别结果，由对应模块监听处理
    document.dispatchEvent(new CustomEvent('语音输入结果', { detail: { 目标: 当前语音输入目标, 文本 } }));
  };

  识别.onerror = function (事件) {
    console.error('语音识别错误:', 事件.error);
    播报语音('语音识别失败，请重试');
  };

  return 识别;
}

/**
 * 使用语音合成播报文本
 * @param {string} 文本
 */
export function 播报语音(文本) {
  if (!应用数据.设置.语音播报 || !语音合成对象) return;

  // 先停止之前的播报
  语音合成对象.cancel();
  const 话语 = new SpeechSynthesisUtterance(文本);
  话语.lang = 'zh-CN';
  话语.rate = 0.95;
  话语.pitch = 1;
  语音合成对象.speak(话语);
}
