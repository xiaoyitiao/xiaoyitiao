/**
 * 家属关怀模块
 *
 * 改进：
 * 1. 家属关怀页优先展示已绑定的云端老人数据。
 * 2. 未配置绑定信息时，显示引导绑定入口。
 * 3. 支持在关怀页直接输入家庭编号和密码查看老人数据。
 */

import { 应用数据 } from './store.js';
import { 获取今天日期, 获取当前时间字符串 } from './utils.js';
import { 初始化云服务, 查询家庭数据 } from './cloud.js';

// 当前是否正在显示云端数据
let 正在显示云端数据 = false;
let 当前云端数据 = null;

/**
 * 渲染家属关怀页面统计与列表
 */
export async function 渲染家属关怀() {
  const 列表容器 = document.getElementById('familyList');
  列表容器.innerHTML = '';

  // 如果已经绑定过家庭编号，直接拉取云端数据
  const 设置 = 应用数据.设置;
  if (设置.家庭编号 && 设置.查看密码 && 设置.应用ID && 设置.应用密钥) {
    await 拉取并显示云端数据(设置.家庭编号, 设置.查看密码);
    return;
  }

  // 否则显示本地数据（老人自己查看）或绑定引导
  正在显示云端数据 = false;
  当前云端数据 = null;
  渲染本地关怀();
  渲染绑定引导();
}

/**
 * 渲染本地关怀数据（老人端自己查看）
 */
function 渲染本地关怀() {
  const 今日 = 获取今天日期();
  const 总数 = 应用数据.药品列表.length;
  let 已服 = 0;
  let 漏服 = 0;

  const 列表容器 = document.getElementById('familyList');
  const 当前时间 = 获取当前时间字符串();

  const 排序列表 = [...应用数据.药品列表].sort((a, b) => a.时间.localeCompare(b.时间));
  排序列表.forEach(药品 => {
    const 键 = `${药品.编号}_${今日}`;
    const 打卡信息 = 应用数据.打卡记录[键];
    const 已打卡 = !!(打卡信息 === true || (打卡信息 && 打卡信息.时间戳));
    if (已打卡) {
      已服++;
    } else if (药品.时间 < 当前时间) {
      漏服++;
    }

    const 状态 = 已打卡 ? '已服' : (药品.时间 < 当前时间 ? '漏服' : '待服');
    const 项目 = document.createElement('div');
    项目.className = 'med-card';

    const 图标 = document.createElement('div');
    图标.className = 'med-icon';
    图标.textContent = 药品.图标;

    const 信息区 = document.createElement('div');
    信息区.className = 'med-info';

    const 名称 = document.createElement('div');
    名称.className = 'med-name';
    名称.textContent = 药品.名称;

    const 详情 = document.createElement('div');
    详情.className = 'med-detail';
    详情.textContent = `${药品.时间} · ${药品.剂量}`;

    信息区.appendChild(名称);
    信息区.appendChild(详情);

    const 状态标签 = document.createElement('span');
    状态标签.className = `status-badge ${状态}`;
    状态标签.textContent = 状态;

    项目.appendChild(图标);
    项目.appendChild(信息区);
    项目.appendChild(状态标签);
    列表容器.appendChild(项目);
  });

  document.getElementById('familyTotal').textContent = 总数;
  document.getElementById('familyTaken').textContent = 已服;
  document.getElementById('familyMissed').textContent = 漏服;

  const 预警框 = document.getElementById('familyAlert');
  if (漏服 > 0) {
    预警框.classList.remove('hidden');
  } else {
    预警框.classList.add('hidden');
  }

  const 最后活跃 = localStorage.getItem('智药伴最后活跃');
  document.getElementById('lastActive').textContent = 最后活跃 || '今日未登录';
}

/**
 * 渲染家属绑定引导
 */
function 渲染绑定引导() {
  const 列表容器 = document.getElementById('familyList');

  const 绑定卡片 = document.createElement('div');
  绑定卡片.className = 'family-bind-card';

  const 标题 = document.createElement('h3');
  标题.textContent = '绑定老人账号';

  const 说明 = document.createElement('p');
  说明.textContent = '输入老人提供的家庭编号和查看密码，即可远程查看用药情况。';

  const 编号输入 = document.createElement('input');
  编号输入.type = 'text';
  编号输入.id = 'bindFamilyId';
  编号输入.placeholder = '家庭编号';
  编号输入.className = 'form-input';

  const 密码输入 = document.createElement('input');
  密码输入.type = 'password';
  密码输入.id = 'bindFamilyPassword';
  密码输入.placeholder = '查看密码';
  密码输入.className = 'form-input';

  const 按钮 = document.createElement('button');
  按钮.className = 'btn-primary btn-full';
  按钮.textContent = '查看老人用药情况';
  按钮.addEventListener('click', () => {
    const 编号 = document.getElementById('bindFamilyId').value.trim();
    const 密码 = document.getElementById('bindFamilyPassword').value.trim();
    if (!编号 || !密码) {
      alert('请输入家庭编号和查看密码');
      return;
    }
    拉取并显示云端数据(编号, 密码);
  });

  绑定卡片.appendChild(标题);
  绑定卡片.appendChild(说明);
  绑定卡片.appendChild(编号输入);
  绑定卡片.appendChild(密码输入);
  绑定卡片.appendChild(按钮);
  列表容器.appendChild(绑定卡片);
}

/**
 * 拉取云端数据并渲染
 * @param {string} 家庭编号
 * @param {string} 查看密码
 */
async function 拉取并显示云端数据(家庭编号, 查看密码) {
  const 设置 = 应用数据.设置;
  const 列表容器 = document.getElementById('familyList');
  列表容器.innerHTML = '<p class="loading-tip">正在拉取云端数据...</p>';

  const 初始化成功 = await 初始化云服务({
    应用ID: 设置.应用ID,
    应用密钥: 设置.应用密钥,
    服务地址: 设置.服务地址
  });

  if (!初始化成功) {
    列表容器.innerHTML = '<p class="error-tip">云服务初始化失败，请先在设置中配置应用 ID 和 Key。</p>';
    return;
  }

  const 结果 = await 查询家庭数据(家庭编号, 查看密码);
  if (!结果.成功) {
    列表容器.innerHTML = `<p class="error-tip">查询失败：${结果.错误}</p>`;
    return;
  }

  正在显示云端数据 = true;
  当前云端数据 = 结果.数据;
  渲染云端关怀(结果.数据);
}

/**
 * 渲染云端老人数据
 * @param {Object} 远程数据
 */
function 渲染云端关怀(远程数据) {
  const 今日 = 获取今天日期();
  const 药品列表 = 远程数据.药品列表 || [];
  const 打卡记录 = 远程数据.打卡记录 || {};
  const 当前时间 = 获取当前时间字符串();

  const 列表容器 = document.getElementById('familyList');
  列表容器.innerHTML = '';

  let 已服 = 0;
  let 漏服 = 0;

  const 排序列表 = [...药品列表].sort((a, b) => a.时间.localeCompare(b.时间));
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
    const 项目 = document.createElement('div');
    项目.className = 'med-card';

    const 图标 = document.createElement('div');
    图标.className = 'med-icon';
    图标.textContent = 药品.图标 || '💊';

    const 信息区 = document.createElement('div');
    信息区.className = 'med-info';

    const 名称 = document.createElement('div');
    名称.className = 'med-name';
    名称.textContent = 药品.名称;

    const 详情 = document.createElement('div');
    详情.className = 'med-detail';
    详情.textContent = `${药品.时间} · ${药品.剂量} · ${药品.备注}`;

    信息区.appendChild(名称);
    信息区.appendChild(详情);

    const 状态标签 = document.createElement('span');
    状态标签.className = `status-badge ${状态}`;
    状态标签.textContent = 状态;

    项目.appendChild(图标);
    项目.appendChild(信息区);
    项目.appendChild(状态标签);
    列表容器.appendChild(项目);
  });

  document.getElementById('familyTotal').textContent = 药品列表.length;
  document.getElementById('familyTaken').textContent = 已服;
  document.getElementById('familyMissed').textContent = 漏服;

  const 预警框 = document.getElementById('familyAlert');
  if (漏服 > 0) {
    预警框.classList.remove('hidden');
  } else {
    预警框.classList.add('hidden');
  }

  document.getElementById('lastActive').textContent = '已连接云端老人数据';
}
