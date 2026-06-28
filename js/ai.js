/**
 * AI 用药助手模块
 *
 * 安全与合规改进：
 * 1. 强制通过后端代理调用 AI 接口，前端不直接暴露 API 密钥。
 * 2. 所有渲染使用 textContent / 转义HTML，防止 XSS。
 * 3. AI 回复强制附加用药安全免责声明与适老化展示。
 */

import { 播报语音 } from './voice.js';
import { 应用数据 } from './store.js';
import { 转义HTML, 安全设置文本 } from './security.js';
import { AI后端API } from './api.js';

// 本地用药知识库，用于未接入真实 API 时的关键词匹配回复
const AI知识库 = {
  '阿司匹林': '阿司匹林肠溶片建议饭后服用，可减少胃部刺激。如需长期服用，请遵医嘱并定期检查。',
  '降压药': '降压药通常建议固定时间服用，避免漏服。具体饭前饭后请遵医嘱或参考说明书。',
  '他汀': '他汀类药物一般建议晚上服用，因为胆固醇合成在夜间较活跃。',
  '饭前': '大多数胃药、降糖药建议饭前服用，但阿司匹林、抗生素等可能刺激胃，建议饭后。',
  '饭后': '饭后服药可减少对胃的刺激，常见如阿司匹林、布洛芬、部分抗生素等。',
  '相互作用': '多种药物同时服用可能产生相互作用，建议在医生或药师指导下使用。',
  '漏服': '如果漏服一次，通常不要补服双倍剂量，具体请查看药品说明书或咨询医生。',
  '维生素C': '维生素C建议饭后服用，可减少胃部不适。',
  '钙片': '钙片建议晚餐后或睡前服用，避免与铁剂同服。',
  '降糖药': '降糖药请严格按照医嘱时间服用，漏服后不要随意补服，需监测血糖。',
  '布洛芬': '布洛芬建议饭后服用，避免空腹刺激胃黏膜。',
  '感冒药': '感冒药多含复方成分，注意不要与同类药重复服用。'
};

/**
 * 根据用户药品清单生成个性化提示上下文
 */
function 获取用户药品上下文() {
  const 药品列表 = 应用数据.药品列表 || [];
  if (药品列表.length === 0) return '';
  const 药品名 = 药品列表.map(药 => 药.名称).join('、');
  return `用户当前用药清单：${药品名}。请结合这些药品回答。`;
}

/**
 * 在聊天窗口添加一条消息
 */
function 添加聊天消息(发送者, 内容) {
  const 容器 = document.getElementById('chatContainer');
  const 消息 = document.createElement('div');
  消息.className = 'chat-message ' + (发送者 === 'user' ? 'user-message' : 'ai-message');

  const 头像 = document.createElement('div');
  头像.className = 'chat-avatar';
  头像.textContent = 发送者 === 'user' ? '👤' : '🤖';

  const 气泡 = document.createElement('div');
  气泡.className = 'chat-bubble';

  const 段落 = document.createElement('p');
  段落.textContent = 内容;
  气泡.appendChild(段落);

  消息.appendChild(头像);
  消息.appendChild(气泡);
  容器.appendChild(消息);
  容器.scrollTop = 容器.scrollHeight;
}

/**
 * 根据问题从本地知识库获取回复
 */
function 获取AI回复(问题) {
  for (const 关键词 in AI知识库) {
    if (问题.includes(关键词)) {
      return AI知识库[关键词];
    }
  }

  const 通用回复 = [
    '这个问题建议咨询医生或药师，他们会根据您的具体情况给出专业建议。',
    '用药安全很重要，建议您仔细阅读药品说明书，或到附近药店咨询药师。',
    '我暂时无法准确回答这个问题，建议您带药品包装咨询专业医生。'
  ];
  return 通用回复[Math.floor(Math.random() * 通用回复.length)];
}

/**
 * 强制在 AI 回复末尾追加免责声明
 */
function 附加免责声明(回复) {
  const 免责声明 = '【以上建议仅供参考，请遵医嘱或咨询专业医生/药师】';
  if (回复.includes('请遵医嘱')) return 回复;
  return 回复 + '\n\n' + 免责声明;
}

/**
 * 向后端 AI 代理接口发送通用解析请求
 * 拍照识别后的药品信息提取等场景
 */
export async function 请求AI解析(用户内容, 系统提示) {
  try {
    const result = await AI后端API.解析(用户内容, 系统提示);
    return result.reply || null;
  } catch (错误) {
    console.error('AI解析接口调用失败:', 错误);
    return null;
  }
}

/**
 * 发送 AI 消息并获取回复
 */
export async function 发送AI消息(文本) {
  if (!文本.trim()) return;

  添加聊天消息('user', 文本);
  document.getElementById('chatInput').value = '';

  let 回复 = '';
  try {
    const 系统提示 = '你是一位专业的用药咨询助手，请用简洁、温和的中文回答老年人或家属的用药问题，注意用药安全提醒。' + 获取用户药品上下文();
    const result = await AI后端API.聊天(文本, 系统提示);
    回复 = result.reply || 'AI暂时无法回答';
  } catch (错误) {
    console.warn('后端 AI 代理不可用，降级到本地知识库:', 错误);
    await new Promise(解决 => setTimeout(解决, 600));
    回复 = 获取AI回复(文本);
  }

  回复 = 附加免责声明(回复);
  添加聊天消息('ai', 回复);
  播报语音(回复);
}

/**
 * 安全渲染 AI 或远程数据到指定元素
 */
export function 安全渲染文本(元素, 文本) {
  安全设置文本(元素, 文本);
}

/**
 * 安全创建 HTML 片段
 */
export function 安全创建HTML(HTML文本) {
  const 模板 = document.createElement('template');
  模板.innerHTML = 转义HTML(HTML文本);
  return 模板.content;
}
