/**
 * 智药伴 - AI老年人用药提醒
 * 应用入口文件
 */

import { 加载数据, 保存数据, 应用数据 } from './store.js';
import { 初始化语音识别, 语音识别对象, 设置语音输入目标 } from './voice.js';
import { 切换页面 } from './router.js';
import { 渲染今日用药 } from './today.js';
import { 切换录入方式, 处理语音添加药品, 处理照片上传, 确认添加药品 } from './add.js';
import { 发送AI消息 } from './ai.js';
import { 检查提醒 } from './reminder.js';
import { 切换长辈模式, 更新模式按钮, 清除所有数据, 渲染AI配置表单, 保存AI配置, 测试AI连接 } from './settings.js';

/**
 * 绑定页面事件
 */
function 绑定事件() {
  // 底部导航
  document.querySelectorAll('.nav-item').forEach(项 => {
    项.addEventListener('click', function () {
      切换页面(this.dataset.page);
    });
  });

  // 页面内跳转按钮
  document.querySelectorAll('[data-page]').forEach(按钮 => {
    if (!按钮.classList.contains('nav-item')) {
      按钮.addEventListener('click', function () {
        切换页面(this.dataset.page);
      });
    }
  });

  // 长辈模式切换
  document.getElementById('modeToggle').addEventListener('click', 切换长辈模式);

  // 录入方式切换
  document.getElementById('voiceBtn').addEventListener('click', () => 切换录入方式('voice'));
  document.getElementById('photoBtn').addEventListener('click', () => 切换录入方式('photo'));
  document.getElementById('manualBtn').addEventListener('click', () => 切换录入方式('manual'));

  // 语音按钮
  const 录音按钮 = document.getElementById('recordBtn');
  if (录音按钮) {
    录音按钮.addEventListener('mousedown', 开始语音输入);
    录音按钮.addEventListener('touchstart', 开始语音输入);
    录音按钮.addEventListener('mouseup', 停止语音输入);
    录音按钮.addEventListener('touchend', 停止语音输入);
    录音按钮.addEventListener('mouseleave', 停止语音输入);
  }

  // 照片上传
  document.getElementById('photoInput').addEventListener('change', 处理照片上传);

  // 确认添加
  document.getElementById('addMedConfirm').addEventListener('click', 确认添加药品);

  // AI 发送
  document.getElementById('chatSendBtn').addEventListener('click', () => {
    const 文本 = document.getElementById('chatInput').value;
    发送AI消息(文本);
  });
  document.getElementById('chatInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') 发送AI消息(this.value);
  });

  // AI 语音提问
  const 聊天语音按钮 = document.getElementById('chatVoiceBtn');
  if (聊天语音按钮) {
    聊天语音按钮.addEventListener('click', function () {
      设置语音输入目标('chat');
      if (语音识别对象) {
        try {
          语音识别对象.start();
        } catch (错误) {
          console.error('语音识别启动失败:', 错误);
        }
      } else {
        alert('当前浏览器不支持语音识别，请手动输入');
      }
    });
  }

  // 设置项
  document.getElementById('voiceReminder').addEventListener('change', function () {
    应用数据.设置.语音播报 = this.checked;
    保存设置();
  });
  document.getElementById('missReminder').addEventListener('change', function () {
    应用数据.设置.漏服提醒 = this.checked;
    保存设置();
  });

  // AI 配置表单
  document.getElementById('aiEnabled').addEventListener('change', 保存AI配置);
  document.getElementById('aiApiUrl').addEventListener('change', 保存AI配置);
  document.getElementById('aiApiKey').addEventListener('change', 保存AI配置);
  document.getElementById('aiModel').addEventListener('change', 保存AI配置);
  document.getElementById('aiTestBtn').addEventListener('click', 测试AI连接);

  // 清除数据
  document.getElementById('clearDataBtn').addEventListener('click', 清除所有数据);

  // 监听语音输入结果事件，根据目标分发给不同模块
  document.addEventListener('语音输入结果', function (事件) {
    const { 目标, 文本 } = 事件.detail;
    if (目标 === 'add') {
      处理语音添加药品(文本);
    } else if (目标 === 'chat') {
      document.getElementById('chatInput').value = 文本;
      发送AI消息(文本);
    }
  });
}

/**
 * 保存设置到本地
 */
function 保存设置() {
  保存数据();
}

/**
 * 开始语音输入
 * @param {Event} 事件
 */
function 开始语音输入(事件) {
  事件.preventDefault();
  if (!语音识别对象) {
    alert('当前浏览器不支持语音识别，请使用手动输入');
    return;
  }
  设置语音输入目标('add');
  try {
    语音识别对象.start();
  } catch (错误) {
    console.error('语音识别启动失败:', 错误);
  }
}

/**
 * 停止语音输入
 * @param {Event} 事件
 */
function 停止语音输入(事件) {
  事件.preventDefault();
  if (语音识别对象) {
    try {
      语音识别对象.stop();
    } catch (错误) {
      console.error('语音识别停止失败:', 错误);
    }
  }
}

/**
 * 应用初始化
 */
function 初始化() {
  加载数据();
  初始化语音识别();
  绑定事件();

  // 应用长辈模式
  if (应用数据.设置.长辈模式) {
    document.body.classList.add('elderly-mode');
  }
  更新模式按钮();

  // 设置开关状态
  document.getElementById('voiceReminder').checked = 应用数据.设置.语音播报;
  document.getElementById('missReminder').checked = 应用数据.设置.漏服提醒;

  // 渲染 AI 配置表单
  渲染AI配置表单();

  // 记录活跃时间
  const 现在 = new Date();
  localStorage.setItem('智药伴最后活跃', `${现在.getHours()}:${String(现在.getMinutes()).padStart(2, '0')} 活跃`);

  切换页面('today');

  // 每分钟检查一次提醒
  检查提醒();
  setInterval(检查提醒, 60000);
}

// 启动应用
document.addEventListener('DOMContentLoaded', 初始化);
