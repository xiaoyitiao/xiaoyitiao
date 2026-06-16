/**
 * 设置模块
 */

import { 应用数据, 保存数据, 创建默认数据副本, 存储键 } from './store.js';
import { 渲染今日用药 } from './today.js';
import { 初始化云服务, 上传家庭数据, 查询家庭数据 } from './cloud.js';
import { 获取今天日期, 获取当前时间字符串 } from './utils.js';

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
 * 显示测试结果或云端状态
 * @param {string} 元素ID
 * @param {string} 文本
 * @param {boolean} 是否成功
 */
function 显示状态(元素ID, 文本, 是否成功) {
  const 结果区 = document.getElementById(元素ID);
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
    显示状态('aiTestResult', '请先填写接口地址和密钥', false);
    return;
  }

  显示状态('aiTestResult', '正在测试连接...', false);

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
      显示状态('aiTestResult', '连接失败：' + 响应.status + ' ' + 错误信息.slice(0, 100), false);
      return;
    }

    const 数据 = await 响应.json();
    const 回复 = 数据.choices?.[0]?.message?.content || 数据.result;
    if (回复) {
      显示状态('aiTestResult', '连接成功，接口返回：' + 回复.slice(0, 50), true);
    } else {
      显示状态('aiTestResult', '连接成功，但返回数据格式不符合预期', false);
    }
  } catch (错误) {
    console.error('测试 AI 连接失败:', 错误);
    显示状态('aiTestResult', '连接失败：' + 错误.message, false);
  }
}

/**
 * 渲染云端同步配置表单
 */
export function 渲染云端配置表单() {
  const 设置 = 应用数据.设置;
  document.getElementById('cloudSync').checked = !!设置.云端同步;
  document.getElementById('cloudAppId').value = 设置.应用ID || '';
  document.getElementById('cloudAppKey').value = 设置.应用密钥 || '';
  document.getElementById('cloudServer').value = 设置.服务地址 || '';
  document.getElementById('familyId').value = 设置.家庭编号 || '';
  document.getElementById('familyPassword').value = 设置.查看密码 || '';
}

/**
 * 保存云端同步配置
 */
export function 保存云端配置() {
  应用数据.设置.云端同步 = document.getElementById('cloudSync').checked;
  应用数据.设置.应用ID = document.getElementById('cloudAppId').value.trim();
  应用数据.设置.应用密钥 = document.getElementById('cloudAppKey').value.trim();
  应用数据.设置.服务地址 = document.getElementById('cloudServer').value.trim();
  应用数据.设置.家庭编号 = document.getElementById('familyId').value.trim();
  应用数据.设置.查看密码 = document.getElementById('familyPassword').value.trim();
  保存数据();
}

/**
 * 立即同步老人用药数据到云端
 */
export async function 同步到云端() {
  保存云端配置();
  const 设置 = 应用数据.设置;

  const 初始化成功 = 初始化云服务({
    应用ID: 设置.应用ID,
    应用密钥: 设置.应用密钥,
    服务地址: 设置.服务地址
  });

  if (!初始化成功) {
    显示状态('cloudStatus', '云服务初始化失败，请检查应用 ID 和 Key', false);
    return;
  }

  if (!设置.家庭编号 || !设置.查看密码) {
    显示状态('cloudStatus', '请先设置家庭编号和查看密码', false);
    return;
  }

  显示状态('cloudStatus', '正在同步到云端...', false);
  const 结果 = await 上传家庭数据(设置.家庭编号, 设置.查看密码, 应用数据);

  if (结果.成功) {
    显示状态('cloudStatus', '同步成功，家属可使用家庭编号远程查看', true);
  } else {
    显示状态('cloudStatus', '同步失败：' + 结果.错误, false);
  }
}

/**
 * 家属远程查看老人用药情况
 */
export async function 家属远程查看() {
  const 设置 = 应用数据.设置;

  const 初始化成功 = 初始化云服务({
    应用ID: 设置.应用ID,
    应用密钥: 设置.应用密钥,
    服务地址: 设置.服务地址
  });

  if (!初始化成功) {
    显示状态('viewFamilyStatus', '云服务初始化失败，请先在上方配置应用 ID 和 Key', false);
    return;
  }

  const 家庭编号 = document.getElementById('viewFamilyId').value.trim();
  const 查看密码 = document.getElementById('viewFamilyPassword').value.trim();

  if (!家庭编号 || !查看密码) {
    显示状态('viewFamilyStatus', '请输入家庭编号和查看密码', false);
    return;
  }

  显示状态('viewFamilyStatus', '正在查询云端数据...', false);
  const 结果 = await 查询家庭数据(家庭编号, 查看密码);

  if (结果.成功) {
    显示状态('viewFamilyStatus', '查询成功', true);
    渲染远程查看结果(结果.数据);
  } else {
    显示状态('viewFamilyStatus', '查询失败：' + 结果.错误, false);
    document.getElementById('remoteViewResult')?.classList.add('hidden');
  }
}

/**
 * 渲染家属远程查看结果
 * @param {Object} 远程数据
 */
function 渲染远程查看结果(远程数据) {
  let 结果区 = document.getElementById('remoteViewResult');
  if (!结果区) {
    结果区 = document.createElement('div');
    结果区.id = 'remoteViewResult';
    结果区.className = 'remote-view-result';
    const 状态区 = document.getElementById('viewFamilyStatus');
    状态区.parentNode.insertBefore(结果区, 状态区.nextSibling);
  }

  const 药品列表 = 远程数据.药品列表 || [];
  const 打卡记录 = 远程数据.打卡记录 || {};
  const 今日 = 获取今天日期();
  const 当前时间 = 获取当前时间字符串();

  let 已服 = 0;
  let 漏服 = 0;

  let 药品HTML = '';
  const 排序列表 = [...药品列表].sort((a, b) => a.时间.localeCompare(b.时间));
  排序列表.forEach(药品 => {
    const 键 = `${药品.编号}_${今日}`;
    const 已打卡 = 打卡记录[键] === true;
    if (已打卡) {
      已服++;
    } else if (药品.时间 < 当前时间) {
      漏服++;
    }
    const 状态 = 已打卡 ? '已服' : (药品.时间 < 当前时间 ? '漏服' : '待服');

    药品HTML += `
      <div class="remote-med-card">
        <div class="remote-med-icon">${药品.图标 || '💊'}</div>
        <div class="remote-med-info">
          <div class="remote-med-name">${药品.名称}</div>
          <div class="remote-med-detail">${药品.时间} · ${药品.剂量} · ${药品.备注}</div>
        </div>
        <span class="status-badge ${状态}">${状态}</span>
      </div>
    `;
  });

  结果区.innerHTML = `
    <div class="remote-view-header">
      <h4>老人今日用药情况</h4>
      <div class="remote-view-stats">
        <div class="remote-stat"><strong>${药品列表.length}</strong><span>应服</span></div>
        <div class="remote-stat"><strong>${已服}</strong><span>已服</span></div>
        <div class="remote-stat"><strong>${漏服}</strong><span>漏服</span></div>
      </div>
      ${漏服 > 0 ? '<div class="remote-alert">⚠️ 检测到漏服药品，请及时联系老人</div>' : ''}
    </div>
    <div class="remote-med-list">${药品HTML || '<p class="empty-tip">暂无用药数据</p>'}</div>
  `;
  结果区.classList.remove('hidden');
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
    渲染云端配置表单();
    渲染今日用药();
    alert('数据已清除');
  }
}
