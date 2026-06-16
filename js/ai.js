/**
 * AI 用药助手模块
 */

import { 播报语音 } from './voice.js';

// 如需接入真实大模型，修改此配置即可
export const AI配置 = {
  启用真实API: false,
  API地址: '',
  API密钥: '',
  模型: ''
};

// 本地用药知识库，用于未接入真实 API 时的关键词匹配回复
const AI知识库 = {
  '阿司匹林': '阿司匹林肠溶片建议饭后服用，可减少胃部刺激。如需长期服用，请遵医嘱并定期检查。',
  '降压药': '降压药通常建议固定时间服用，避免漏服。具体饭前饭后请遵医嘱或参考说明书。',
  '他汀': '他汀类药物一般建议晚上服用，因为胆固醇合成在夜间较活跃。',
  '饭前': '大多数胃药、降糖药建议饭前服用，但阿司匹林、抗生素等可能刺激胃，建议饭后。',
  '饭后': '饭后服药可减少对胃的刺激，常见如阿司匹林、布洛芬、部分抗生素等。',
  '相互作用': '多种药物同时服用可能产生相互作用，建议在医生或药师指导下使用。',
  '漏服': '如果漏服一次，通常不要补服双倍剂量，具体请查看药品说明书或咨询医生。'
};

/**
 * 在聊天窗口添加一条消息
 * @param {string} 发送者 - 'user' 或 'ai'
 * @param {string} 内容
 */
function 添加聊天消息(发送者, 内容) {
  const 容器 = document.getElementById('chatContainer');
  const 消息 = document.createElement('div');
  消息.className = 'chat-message ' + (发送者 === 'user' ? 'user-message' : 'ai-message');
  消息.innerHTML = `
    <div class="chat-avatar">${发送者 === 'user' ? '👤' : '🤖'}</div>
    <div class="chat-bubble"><p>${内容}</p></div>
  `;
  容器.appendChild(消息);
  容器.scrollTop = 容器.scrollHeight;
}

/**
 * 根据问题从本地知识库获取回复
 * @param {string} 问题
 * @returns {string}
 */
function 获取AI回复(问题) {
  // 优先匹配本地知识库
  for (const 关键词 in AI知识库) {
    if (问题.includes(关键词)) {
      return AI知识库[关键词];
    }
  }

  // 通用回复
  const 通用回复 = [
    '这个问题建议咨询医生或药师，他们会根据您的具体情况给出专业建议。',
    '用药安全很重要，建议您仔细阅读药品说明书，或到附近药店咨询药师。',
    '我暂时无法准确回答这个问题，建议您带药品包装咨询专业医生。'
  ];
  return 通用回复[Math.floor(Math.random() * 通用回复.length)];
}

/**
 * 向 AI 接口发送通用解析请求
 * 可用于拍照识别后的药品信息提取等非聊天场景
 * @param {string} 用户内容
 * @param {string} 系统提示
 * @returns {Promise<string|null>} AI 返回的文本内容
 */
export async function 请求AI解析(用户内容, 系统提示) {
  if (!AI配置.启用真实API || !AI配置.API地址 || !AI配置.API密钥) {
    return null;
  }

  try {
    const 响应 = await fetch(AI配置.API地址, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AI配置.API密钥
      },
      body: JSON.stringify({
        model: AI配置.模型,
        messages: [
          { role: 'system', content: 系统提示 },
          { role: 'user', content: 用户内容 }
        ]
      })
    });
    const 数据 = await 响应.json();
    return 数据.choices?.[0]?.message?.content || 数据.result || null;
  } catch (错误) {
    console.error('AI解析接口调用失败:', 错误);
    return null;
  }
}

/**
 * 发送 AI 消息并获取回复
 * @param {string} 文本
 */
export async function 发送AI消息(文本) {
  if (!文本.trim()) return;

  添加聊天消息('user', 文本);
  document.getElementById('chatInput').value = '';

  let 回复 = '';
  if (AI配置.启用真实API && AI配置.API地址 && AI配置.API密钥) {
    const 系统提示 = '你是一位专业的用药咨询助手，请用简洁、温和的中文回答老年人或家属的用药问题，注意用药安全提醒。';
    const 解析结果 = await 请求AI解析(文本, 系统提示);
    回复 = 解析结果 || 'AI暂时无法回答';
  } else {
    // 模拟网络延迟
    await new Promise(解决 => setTimeout(解决, 600));
    回复 = 获取AI回复(文本);
  }

  添加聊天消息('ai', 回复);
  播报语音(回复);
}
