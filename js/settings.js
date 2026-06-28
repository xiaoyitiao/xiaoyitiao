/**
 * 设置模块
 *
 * 改进：
 * 1. 敏感字段（API 密钥、LeanCloud 密钥、查看密码）加密存储。
 * 2. 云端同步与家属查看改为异步初始化。
 * 3. 清除数据按钮放入高级操作，清除前自动导出备份。
 * 4. 增加数据导出/导入、隐私政策、演示模式切换、后端代理配置。
 * 5. 所有动态文本使用 textContent 或转义HTML。
 */

import { 应用数据, 保存数据, 创建默认数据副本, 存储键, 导出数据, 导入数据 } from './store.js';
import { 渲染今日用药 } from './today.js';
import { 初始化云服务, 上传家庭数据, 查询家庭数据, 重置云服务状态 } from './cloud.js';
import { 获取今天日期, 获取当前时间字符串 } from './utils.js';
import { 转义HTML, 安全设置文本 } from './security.js';

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
    安全设置文本(按钮.querySelector('.mode-icon'), '👓');
    安全设置文本(按钮.querySelector('.mode-text'), '普通模式');
  } else {
    安全设置文本(按钮.querySelector('.mode-icon'), '👴');
    安全设置文本(按钮.querySelector('.mode-text'), '长辈模式');
  }
}

/**
 * 渲染 AI 配置表单
 */
export function 渲染AI配置表单() {
  const 配置 = 应用数据.AI配置 || {};
  const 启用开关 = document.getElementById('aiEnabled');
  if (启用开关) 启用开关.checked = !!配置.启用真实API;
  const 地址输入 = document.getElementById('aiApiUrl');
  if (地址输入) 地址输入.value = 配置.API地址 || '';
  const 模型输入 = document.getElementById('aiModel');
  if (模型输入) 模型输入.value = 配置.模型 || '';
}

/**
 * 保存 AI 配置到本地数据
 */
export function 保存AI配置() {
  const 启用开关 = document.getElementById('aiEnabled');
  const 地址输入 = document.getElementById('aiApiUrl');
  const 模型输入 = document.getElementById('aiModel');

  应用数据.AI配置 = {
    启用真实API: 启用开关 ? 启用开关.checked : false,
    API地址: 地址输入 ? 地址输入.value.trim() : '',
    API密钥: '',
    模型: 模型输入 ? 模型输入.value.trim() : ''
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
  if (!结果区) return;
  安全设置文本(结果区, 文本);
  结果区.classList.remove('hidden');
  结果区.classList.toggle('success', 是否成功);
  结果区.classList.toggle('error', !是否成功);
}

/**
 * 测试 AI 接口连接
 */
export async function 测试AI连接() {
  const 配置 = 应用数据.AI配置 || {};
  if (!配置.API地址) {
    显示状态('aiTestResult', '请先填写接口地址', false);
    return;
  }

  显示状态('aiTestResult', '正在测试连接...', false);

  try {
    const 请求选项 = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 配置.模型,
        messages: [{ role: 'user', content: '你好' }]
      })
    };

    const 是代理模式 = 配置.API地址.includes('/proxy') || !配置.API密钥;
    if (!是代理模式) {
      请求选项.headers['Authorization'] = 'Bearer ' + 配置.API密钥;
    }

    const 响应 = await fetch(配置.API地址, 请求选项);

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
  const 紧急联系人输入 = document.getElementById('emergencyContact');
  if (紧急联系人输入) 紧急联系人输入.value = 设置.紧急联系人 || '';
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
  const 紧急联系人输入 = document.getElementById('emergencyContact');
  应用数据.设置.紧急联系人 = 紧急联系人输入 ? 紧急联系人输入.value.trim() : '';
  保存数据();
  重置云服务状态();
}

/**
 * 立即同步老人用药数据到云端
 */
export async function 同步到云端() {
  保存云端配置();
  const 设置 = 应用数据.设置;

  const 初始化成功 = await 初始化云服务({
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

  const 初始化成功 = await 初始化云服务({
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

  结果区.innerHTML = '';

  const 头部 = document.createElement('div');
  头部.className = 'remote-view-header';

  const 标题 = document.createElement('h4');
  标题.textContent = '老人今日用药情况';
  头部.appendChild(标题);

  const 统计区 = document.createElement('div');
  统计区.className = 'remote-view-stats';

  const 创建统计 = (值, 标签) => {
    const 项 = document.createElement('div');
    项.className = 'remote-stat';
    const 强 = document.createElement('strong');
    强.textContent = String(值);
    const 文字 = document.createElement('span');
    文字.textContent = 标签;
    项.appendChild(强);
    项.appendChild(文字);
    return 项;
  };

  统计区.appendChild(创建统计(药品列表.length, '应服'));
  统计区.appendChild(创建统计(已服, '已服'));
  统计区.appendChild(创建统计(漏服, '漏服'));
  头部.appendChild(统计区);

  if (漏服 > 0) {
    const 预警 = document.createElement('div');
    预警.className = 'remote-alert';
    预警.textContent = '⚠️ 检测到漏服药品，请及时联系老人';
    头部.appendChild(预警);
  }

  const 药品容器 = document.createElement('div');
  药品容器.className = 'remote-med-list';

  const 排序列表 = [...药品列表].sort((a, b) => a.时间.localeCompare(b.时间));
  if (排序列表.length === 0) {
    const 空提示 = document.createElement('p');
    空提示.className = 'empty-tip';
    空提示.textContent = '暂无用药数据';
    药品容器.appendChild(空提示);
  } else {
    排序列表.forEach(药品 => {
      const 键 = `${药品.编号}_${今日}`;
      const 打卡信息 = 打卡记录[键];
      const 已打卡 = !!(打卡信息 === true || (打卡信息 && 打卡信息.时间戳));
      if (已打卡) {
        已服++;
      } else if (药品.时间 < 当前时间) {
        漏服++;
      }
      const 状态 = 已打卡 ? '已服' : (药品.时间 < 当前时间 ? '漏服' : '待服');

      const 卡片 = document.createElement('div');
      卡片.className = 'remote-med-card';

      const 图标 = document.createElement('div');
      图标.className = 'remote-med-icon';
      图标.textContent = 药品.图标 || '💊';

      const 信息 = document.createElement('div');
      信息.className = 'remote-med-info';

      const 名称 = document.createElement('div');
      名称.className = 'remote-med-name';
      名称.textContent = 药品.名称;

      const 详情 = document.createElement('div');
      详情.className = 'remote-med-detail';
      详情.textContent = `${药品.时间} · ${药品.剂量} · ${药品.备注}`;

      信息.appendChild(名称);
      信息.appendChild(详情);

      const 状态标 = document.createElement('span');
      状态标.className = `status-badge ${状态}`;
      状态标.textContent = 状态;

      卡片.appendChild(图标);
      卡片.appendChild(信息);
      卡片.appendChild(状态标);
      药品容器.appendChild(卡片);
    });
  }

  结果区.appendChild(头部);
  结果区.appendChild(药品容器);
  结果区.classList.remove('hidden');
}

/**
 * 清除所有用药数据并恢复默认
 */
export function 清除所有数据() {
  // 先自动导出备份
  const 备份 = 导出数据();
  const 备份Blob = new Blob([备份], { type: 'application/json' });
  const 备份URL = URL.createObjectURL(备份Blob);
  const 链接 = document.createElement('a');
  链接.href = 备份URL;
  链接.download = `智药伴备份_${获取今天日期()}.json`;
  链接.click();
  URL.revokeObjectURL(备份URL);

  if (confirm('已自动下载数据备份。确定要清除所有用药数据吗？此操作不可恢复。')) {
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

/**
 * 导出数据到文件
 */
export function 导出数据到文件() {
  const 数据 = 导出数据();
  const Blob对象 = new Blob([数据], { type: 'application/json' });
  const URL对象 = URL.createObjectURL(Blob对象);
  const 链接 = document.createElement('a');
  链接.href = URL对象;
  链接.download = `智药伴备份_${获取今天日期()}_${获取当前时间字符串().replace(':', '-')}.json`;
  链接.click();
  URL.revokeObjectURL(URL对象);
}

/**
 * 从文件导入数据
 * @param {File} 文件
 */
export function 从文件导入数据(文件) {
  if (!文件) return;
  const 读取器 = new FileReader();
  读取器.onload = function (e) {
    const 文本 = e.target.result;
    if (导入数据(文本)) {
      保存数据();
      渲染AI配置表单();
      渲染云端配置表单();
      渲染今日用药();
      alert('数据导入成功');
    } else {
      alert('数据导入失败，文件格式不正确');
    }
  };
  读取器.readAsText(文件);
}

/**
 * 切换高级操作区域显示
 */
export function 切换高级操作() {
  const 区域 = document.getElementById('advancedSettings');
  if (区域) {
    区域.classList.toggle('hidden');
  }
}

/**
 * 切换隐私政策弹窗
 */
export function 切换隐私政策(显示) {
  const 弹窗 = document.getElementById('privacyModal');
  if (弹窗) {
    弹窗.classList.toggle('hidden', !显示);
  }
}

/**
 * 同意隐私政策
 */
export function 同意隐私政策() {
  应用数据.设置.隐私已同意 = true;
  保存数据();
  切换隐私政策(false);
}
