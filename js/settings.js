/**
 * 设置模块
 */

import { 应用数据, 保存数据, 创建默认数据副本, 存储键 } from './store.js';
import { 渲染今日用药 } from './today.js';

/**
 * 切换长辈模式
 */
export function 切换长辈模式() {
  应用数据.设置.长辈模式 = !应用数据.设置.长辈模式;
  document.body.classList.toggle('elderly-mode', 应用数据.设置.长辈模式);
  保存数据();
  更新模式按钮();
}

/**
 * 更新顶部长辈模式按钮显示
 */
export function 更新模式按钮() {
  const 按钮 = document.getElementById('modeToggle');
  if (应用数据.设置.长辈模式) {
    按钮.querySelector('.mode-icon').textContent = '👓';
    按钮.querySelector('.mode-text').textContent = '普通模式';
  } else {
    按钮.querySelector('.mode-icon').textContent = '👴';
    按钮.querySelector('.mode-text').textContent = '长辈模式';
  }
}

/**
 * 渲染 AI 配置表单
 */
export function 渲染AI配置表单() {
  const 配置 = 应用数据.AI配置 || {};
  document.getElementById('aiEnabled').checked = !!配置.启用真实API;
  document.getElementById('aiApiUrl').value = 配置.API地址 || '';
  document.getElementById('aiApiKey').value = 配置.API密钥 || '';
  document.getElementById('aiModel').value = 配置.模型 || '';
}

/**
 * 保存 AI 配置到本地数据
 */
export function 保存AI配置() {
  应用数据.AI配置 = {
    启用真实API: document.getElementById('aiEnabled').checked,
    API地址: document.getElementById('aiApiUrl').value.trim(),
    API密钥: document.getElementById('aiApiKey').value.trim(),
    模型: document.getElementById('aiModel').value.trim()
  };
  保存数据();
}

/**
 * 显示 AI 连接测试结果
 * @param {string} 文本
 * @param {boolean} 是否成功
 */
function 显示测试结果(文本, 是否成功) {
  const 结果区 = document.getElementById('aiTestResult');
  结果区.textContent = 文本;
  结果区.classList.remove('hidden');
  结果区.classList.toggle('success', 是否成功);
  结果区.classList.toggle('error', !是否成功);
}

/**
 * 测试 AI 接口连接
 */
export async function 测试AI连接() {
  const 配置 = 应用数据.AI配置 || {};
  if (!配置.API地址 || !配置.API密钥) {
    显示测试结果('请先填写接口地址和密钥', false);
    return;
  }

  显示测试结果('正在测试连接...', false);

  try {
    const 响应 = await fetch(配置.API地址, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + 配置.API密钥
      },
      body: JSON.stringify({
        model: 配置.模型,
        messages: [
          { role: 'user', content: '你好' }
        ]
      })
    });

    if (!响应.ok) {
      const 错误信息 = await 响应.text();
      显示测试结果('连接失败：' + 响应.status + ' ' + 错误信息.slice(0, 100), false);
      return;
    }

    const 数据 = await 响应.json();
    const 回复 = 数据.choices?.[0]?.message?.content || 数据.result;
    if (回复) {
      显示测试结果('连接成功，接口返回：' + 回复.slice(0, 50), true);
    } else {
      显示测试结果('连接成功，但返回数据格式不符合预期', false);
    }
  } catch (错误) {
    console.error('测试 AI 连接失败:', 错误);
    显示测试结果('连接失败：' + 错误.message, false);
  }
}

/**
 * 清除所有用药数据并恢复默认
 */
export function 清除所有数据() {
  if (confirm('确定要清除所有用药数据吗？此操作不可恢复。')) {
    localStorage.removeItem(存储键);

    // 保留当前长辈模式设置
    const 当前长辈模式 = document.body.classList.contains('elderly-mode');
    const 默认副本 = 创建默认数据副本();
    默认副本.设置.长辈模式 = 当前长辈模式;

    // 将默认数据重置到当前应用数据对象中
    Object.keys(应用数据).forEach(键 => delete 应用数据[键]);
    Object.assign(应用数据, 默认副本);

    保存数据();
    渲染AI配置表单();
    渲染今日用药();
    alert('数据已清除');
  }
}
