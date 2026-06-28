/**
 * 智药伴 - AI老年人用药提醒
 * 应用入口文件
 */

import { 加载数据, 保存数据, 应用数据, 创建默认数据副本 } from './store.js';
import { 初始化语音识别, 切换录音状态 } from './voice.js';
import { 切换页面, 初始化历史导航 } from './router.js';
import { 渲染今日用药 } from './today.js';
import { 切换录入方式, 处理语音添加药品, 处理照片上传, 确认添加药品, 重置添加表单 } from './add.js';
import { 发送AI消息 } from './ai.js';
import { 检查提醒, 启用后台切回检查 } from './reminder.js';
import {
  切换长辈模式, 更新模式按钮, 清除所有数据,
  渲染AI配置表单, 保存AI配置, 测试AI连接,
  渲染云端配置表单, 保存云端配置, 同步到云端, 家属远程查看,
  导出数据到文件, 从文件导入数据, 切换高级操作, 切换隐私政策, 同意隐私政策
} from './settings.js';
import { 显示首次引导, 完成首次引导 } from './onboarding.js';
import { 初始化登录弹窗, 显示登录弹窗, 更新用户状态, 隐藏登录弹窗 } from './login.js';
import { 已登录 } from './auth.js';

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

  // 语音按钮（点击开始/结束模式）
  const 录音按钮 = document.getElementById('recordBtn');
  if (录音按钮) {
    录音按钮.addEventListener('click', function (事件) {
      事件.preventDefault();
      const 成功 = 切换录音状态('add');
      if (!成功) {
        alert('当前浏览器不支持语音识别，请使用手动输入');
      }
    });
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
      const 成功 = 切换录音状态('chat');
      if (!成功) {
        alert('当前浏览器不支持语音识别，请手动输入');
      }
    });
  }

  // 设置项
  const 语音提醒开关 = document.getElementById('voiceReminder');
  if (语音提醒开关) {
    语音提醒开关.addEventListener('change', function () {
      应用数据.设置.语音播报 = this.checked;
      保存设置();
    });
  }
  const 漏服提醒开关 = document.getElementById('missReminder');
  if (漏服提醒开关) {
    漏服提醒开关.addEventListener('change', function () {
      应用数据.设置.漏服提醒 = this.checked;
      保存设置();
    });
  }

  // AI 配置表单
  const AI开关 = document.getElementById('aiEnabled');
  if (AI开关) AI开关.addEventListener('change', 保存AI配置);
  const AI地址 = document.getElementById('aiApiUrl');
  if (AI地址) AI地址.addEventListener('change', 保存AI配置);
  const AI密钥 = document.getElementById('aiApiKey');
  if (AI密钥) AI密钥.addEventListener('change', 保存AI配置);
  const AI模型 = document.getElementById('aiModel');
  if (AI模型) AI模型.addEventListener('change', 保存AI配置);
  const AI测试按钮 = document.getElementById('aiTestBtn');
  if (AI测试按钮) AI测试按钮.addEventListener('click', 测试AI连接);

  // 云端同步配置表单
  const 云端同步开关 = document.getElementById('cloudSync');
  if (云端同步开关) 云端同步开关.addEventListener('change', 保存云端配置);
  const 应用ID输入 = document.getElementById('cloudAppId');
  if (应用ID输入) 应用ID输入.addEventListener('change', 保存云端配置);
  const 应用密钥输入 = document.getElementById('cloudAppKey');
  if (应用密钥输入) 应用密钥输入.addEventListener('change', 保存云端配置);
  const 服务地址输入 = document.getElementById('cloudServer');
  if (服务地址输入) 服务地址输入.addEventListener('change', 保存云端配置);
  const 家庭编号输入 = document.getElementById('familyId');
  if (家庭编号输入) 家庭编号输入.addEventListener('change', 保存云端配置);
  const 查看密码输入 = document.getElementById('familyPassword');
  if (查看密码输入) 查看密码输入.addEventListener('change', 保存云端配置);
  const 紧急联系人输入 = document.getElementById('emergencyContact');
  if (紧急联系人输入) 紧急联系人输入.addEventListener('change', 保存云端配置);

  const 云端上传按钮 = document.getElementById('cloudUploadBtn');
  if (云端上传按钮) 云端上传按钮.addEventListener('click', 同步到云端);
  const 家属查看按钮 = document.getElementById('viewFamilyBtn');
  if (家属查看按钮) 家属查看按钮.addEventListener('click', 家属远程查看);

  // 高级操作
  const 高级按钮 = document.getElementById('advancedToggle');
  if (高级按钮) {
    高级按钮.addEventListener('click', 切换高级操作);
  }

  // 清除数据
  const 清除按钮 = document.getElementById('clearDataBtn');
  if (清除按钮) {
    清除按钮.addEventListener('click', 清除所有数据);
  }

  // 数据备份
  const 导出按钮 = document.getElementById('exportDataBtn');
  if (导出按钮) {
    导出按钮.addEventListener('click', 导出数据到文件);
  }
  const 导入输入 = document.getElementById('importDataInput');
  if (导入输入) {
    导入输入.addEventListener('change', function () {
      从文件导入数据(this.files[0]);
    });
  }

  // 隐私政策
  const 隐私链接 = document.getElementById('privacyLink');
  if (隐私链接) {
    隐私链接.addEventListener('click', (e) => {
      e.preventDefault();
      切换隐私政策(true);
    });
  }
  const 同意隐私按钮 = document.getElementById('agreePrivacyBtn');
  if (同意隐私按钮) {
    同意隐私按钮.addEventListener('click', 同意隐私政策);
  }
  const 关闭隐私按钮 = document.getElementById('closePrivacyBtn');
  if (关闭隐私按钮) {
    关闭隐私按钮.addEventListener('click', () => 切换隐私政策(false));
  }

  // 紧急联系
  const 紧急按钮 = document.getElementById('emergencyBtn');
  if (紧急按钮) {
    紧急按钮.addEventListener('click', 一键联系家属);
  }

  // 首次引导
  const 引导完成按钮 = document.getElementById('onboardingDoneBtn');
  if (引导完成按钮) {
    引导完成按钮.addEventListener('click', () => {
      完成首次引导();
      重置添加表单();
      切换页面('today');
    });
  }

  // 监听数据保存事件，自动同步到云端
  启用自动云端同步();

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
 * 一键联系家属
 */
function 一键联系家属() {
  const 联系人 = 应用数据.设置.紧急联系人;
  if (联系人) {
    if (confirm(`是否立即拨打家属电话 ${联系人}？`)) {
      window.location.href = `tel:${联系人}`;
    }
  } else {
    alert('请先在家属关怀设置中填写紧急联系人电话');
  }
}

/**
 * 应用初始化
 */
async function 初始化() {
  // 如果 URL 带有 #page=xxx，则直接切换到对应页面并跳过引导（用于演示/截图）
  const hash页面 = window.location.hash.replace('#', '');
  const 跳过引导 = hash页面 && ['today', 'add', 'schedule', 'history', 'ai', 'family', 'settings'].includes(hash页面);

  await 加载数据();
  初始化语音识别();
  初始化登录弹窗();
  初始化历史导航();
  绑定事件();

  // 应用长辈模式
  if (应用数据.设置.长辈模式) {
    document.body.classList.add('elderly-mode');
  }
  更新模式按钮();

  // 更新用户登录状态显示
  更新用户状态();

  // 设置开关状态
  const 语音提醒开关 = document.getElementById('voiceReminder');
  if (语音提醒开关) 语音提醒开关.checked = 应用数据.设置.语音播报;
  const 漏服提醒开关 = document.getElementById('missReminder');
  if (漏服提醒开关) 漏服提醒开关.checked = 应用数据.设置.漏服提醒;

  // 渲染 AI 配置表单和云端配置表单
  渲染AI配置表单();
  渲染云端配置表单();

  // 记录活跃时间
  const 现在 = new Date();
  localStorage.setItem('智药伴最后活跃', `${String(现在.getHours()).padStart(2, '0')}:${String(现在.getMinutes()).padStart(2, '0')} 活跃`);

  // 切换页面前先渲染今日数据
  if (跳过引导) {
    切换页面(hash页面);
  } else {
    切换页面('today');
  }

  // 启用后台切回检查
  启用后台切回检查();

  // 每分钟检查一次提醒
  检查提醒();
  setInterval(检查提醒, 60000);

  // 首次使用显示引导，未同意隐私政策也显示
  if (!跳过引导 && (应用数据.首次使用 || !应用数据.设置.隐私已同意)) {
    显示首次引导();
  }

  // 未登录时显示登录弹窗（但允许游客模式浏览本地数据）
  // 如果用户希望先体验，可以在弹窗关闭后继续；这里默认显示一次登录引导
  if (!跳过引导 && !已登录() && !应用数据.首次使用) {
    显示登录弹窗();
  }
}

// 自动同步定时器
let 自动同步定时器 = null;

/**
 * 启用自动云端同步
 * 当本地数据保存后，如果开启了云端同步，则延迟自动上传
 */
function 启用自动云端同步() {
  document.addEventListener('数据已保存', () => {
    const 设置 = 应用数据.设置;
    if (!设置.云端同步 || !设置.应用ID || !设置.应用密钥 || !设置.家庭编号 || !设置.查看密码) {
      return;
    }

    // 防抖：3 秒内多次保存只同步一次
    if (自动同步定时器) {
      clearTimeout(自动同步定时器);
    }
    自动同步定时器 = setTimeout(() => {
      同步到云端();
    }, 3000);
  });
}

// 启动应用
document.addEventListener('DOMContentLoaded', 初始化);
