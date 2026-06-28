/**
 * 今日用药模块
 */

import { 应用数据, 保存数据 } from './store.js';
import { 获取今天日期, 格式化日期 } from './utils.js';
import { 播报语音 } from './voice.js';
import { 检查列表相互作用 } from './interaction-db.js';
import { 打卡API, 计划API } from './api.js';
import { 已登录 } from './auth.js';

/**
 * 渲染今日用药列表与进度
 */
export async function 渲染今日用药() {
  const 列表容器 = document.getElementById('todayList');
  const 空状态 = document.getElementById('todayEmpty');
  const 日期元素 = document.getElementById('todayDate');
  const 今日 = 获取今天日期();

  日期元素.textContent = 格式化日期(new Date());
  列表容器.innerHTML = '';

  // 登录状态下优先从后端拉取最新数据
  if (已登录()) {
    try {
      const data = await 计划API.今日(今日);
      应用数据.药品列表 = (data.medicines || []).map(药 => ({
        编号: String(药.id),
        名称: 药.name,
        剂量: 药.dose,
        实际剂量: 药.actualDose || 药.dose,
        时间: 药.time,
        频率: 药.frequency,
        周几: 药.weekDays ? 药.weekDays.split(',').map(Number) : [],
        间隔天数: 药.intervalDays || 1,
        开始日期: 药.startDate || '',
        结束日期: 药.endDate || '',
        库存: 药.stock || 0,
        备注: 药.note || '',
        图标: 药.icon || '💊'
      }));
      应用数据.打卡记录 = {};
      (data.checkIns || []).forEach(记录 => {
        const key = `${记录.medicineId}_${记录.date}`;
        应用数据.打卡记录[key] = {
          时间戳: new Date(记录.takenAt).getTime(),
          剂量: 记录.dose || ''
        };
      });
      await 保存数据(true);
    } catch (错误) {
      console.error('获取今日计划失败:', 错误);
    }
  }

  if (应用数据.药品列表.length === 0) {
    列表容器.classList.add('hidden');
    空状态.classList.remove('hidden');
    更新进度(0, 0);
    return;
  }

  列表容器.classList.remove('hidden');
  空状态.classList.add('hidden');

  // 检查全局相互作用并在顶部提示
  const 相互作用 = 检查列表相互作用(应用数据.药品列表.map(药 => 药.名称));
  if (相互作用.有风险) {
    const 警告条 = document.createElement('div');
    警告条.className = 'interaction-warning';
    警告条.textContent = '⚠️ ' + 相互作用.警告 + ' 请咨询医生。';
    列表容器.appendChild(警告条);
  }

  let 已完成 = 0;
  const 今日列表 = 应用数据.药品列表.map(药品 => {
    const 键 = `${药品.编号}_${今日}`;
    const 打卡信息 = 应用数据.打卡记录[键];
    const 已打卡 = !!(打卡信息 === true || (打卡信息 && 打卡信息.时间戳));
    if (已打卡) 已完成++;
    return { ...药品, 已打卡 };
  }).sort((a, b) => a.时间.localeCompare(b.时间));

  今日列表.forEach(药品 => {
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
    详情.textContent = `${药品.时间} · ${药品.剂量} · ${药品.备注}`;

    信息区.appendChild(名称);
    信息区.appendChild(详情);
    项目.appendChild(图标);
    项目.appendChild(信息区);

    if (药品.已打卡) {
      const 状态 = document.createElement('span');
      状态.className = 'status-badge 已服';
      状态.textContent = '已服';
      项目.appendChild(状态);
    } else {
      const 按钮 = document.createElement('button');
      按钮.className = 'check-btn';
      按钮.dataset.id = 药品.编号;
      按钮.setAttribute('aria-label', `打卡：${药品.名称}`);
      按钮.textContent = '✓';
      项目.appendChild(按钮);
    }

    列表容器.appendChild(项目);
  });

  // 绑定打卡按钮
  列表容器.querySelectorAll('.check-btn').forEach(按钮 => {
    按钮.addEventListener('click', function () {
      药品打卡(this.dataset.id);
    });
  });

  更新进度(已完成, 应用数据.药品列表.length);
}

/**
 * 更新今日完成进度条
 */
function 更新进度(已完成, 总数) {
  document.getElementById('progressText').textContent = `${已完成} / ${总数}`;
  const 百分比 = 总数 === 0 ? 0 : Math.round((已完成 / 总数) * 100);
  document.getElementById('progressFill').style.width = 百分比 + '%';
}

/**
 * 标记药品已服用，同步到后端
 */
export async function 药品打卡(药品编号) {
  const 今日 = 获取今天日期();
  const 键 = `${药品编号}_${今日}`;
  const 药品 = 应用数据.药品列表.find(药 => 药.编号 === 药品编号);

  应用数据.打卡记录[键] = {
    时间戳: Date.now(),
    剂量: 药品 ? (药品.实际剂量 || 药品.剂量) : ''
  };

  // 归档到用药历史
  if (!应用数据.用药历史) 应用数据.用药历史 = {};
  if (!应用数据.用药历史[今日]) 应用数据.用药历史[今日] = {};
  应用数据.用药历史[今日][药品编号] = { ...应用数据.打卡记录[键] };

  // 更新连续打卡天数
  更新连续打卡统计();

  // 同步到后端
  if (已登录()) {
    try {
      await 打卡API.打卡({
        medicineId: Number(药品编号),
        date: 今日,
        dose: 应用数据.打卡记录[键].剂量
      });
    } catch (错误) {
      console.error('打卡同步到后端失败:', 错误);
      alert('打卡同步失败，请检查网络');
      return;
    }
  }

  await 保存数据(true);

  if (药品) {
    播报语音(`已记录${药品.名称}服用`);
  }

  渲染今日用药();
}

/**
 * 更新连续打卡天数统计
 */
function 更新连续打卡统计() {
  const 统计 = 应用数据.用药统计 || { 连续打卡天数: 0, 最近打卡日期: '' };
  const 今日 = 获取今天日期();
  const 昨天 = new Date();
  昨天.setDate(昨天.getDate() - 1);
  const 昨天字符串 = `${昨天.getFullYear()}-${String(昨天.getMonth() + 1).padStart(2, '0')}-${String(昨天.getDate()).padStart(2, '0')}`;

  if (统计.最近打卡日期 === 昨天字符串 || 统计.最近打卡日期 === 今日) {
    if (统计.最近打卡日期 !== 今日) {
      统计.连续打卡天数 += 1;
    }
  } else {
    统计.连续打卡天数 = 1;
  }
  统计.最近打卡日期 = 今日;
  应用数据.用药统计 = 统计;
}
