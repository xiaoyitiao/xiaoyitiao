/**
 * 云端同步模块
 * 使用 LeanCloud 实现老人端数据上传与家属端远程查看
 */

import AV from 'leancloud-storage';

// 云服务初始化状态
let 已初始化 = false;

/**
 * 初始化 LeanCloud 云服务
 * @param {Object} 配置
 * @returns {boolean}
 */
export function 初始化云服务(配置) {
  if (!配置 || !配置.应用ID || !配置.应用密钥) {
    return false;
  }
  if (已初始化) {
    return true;
  }

  try {
    AV.init({
      appId: 配置.应用ID,
      appKey: 配置.应用密钥,
      serverURL: 配置.服务地址 || undefined
    });
    已初始化 = true;
    return true;
  } catch (错误) {
    console.error('云服务初始化失败:', 错误);
    return false;
  }
}

/**
 * 获取当前云服务初始化状态
 * @returns {boolean}
 */
export function 云服务已初始化() {
  return 已初始化;
}

/**
 * 上传老人用药数据到云端
 * @param {string} 家庭编号
 * @param {string} 查看密码
 * @param {Object} 数据
 * @returns {Promise<{成功: boolean, 错误?: string}>}
 */
export async function 上传家庭数据(家庭编号, 查看密码, 数据) {
  if (!已初始化) {
    return { 成功: false, 错误: '云服务未初始化，请先在设置中配置' };
  }
  if (!家庭编号 || !查看密码) {
    return { 成功: false, 错误: '家庭编号和查看密码不能为空' };
  }

  try {
    // 查询是否已存在该家庭编号的数据
    const 查询 = new AV.Query('FamilyData');
    查询.equalTo('familyId', 家庭编号);
    const 已有对象 = await 查询.first();

    let 数据对象;
    if (已有对象) {
      数据对象 = 已有对象;
    } else {
      const FamilyData = AV.Object.extend('FamilyData');
      数据对象 = new FamilyData();
      数据对象.set('familyId', 家庭编号);
    }

    数据对象.set('password', 查看密码);
    数据对象.set('data', JSON.stringify(数据));
    await 数据对象.save();

    return { 成功: true };
  } catch (错误) {
    console.error('上传家庭数据失败:', 错误);
    return { 成功: false, 错误: 错误.message || '上传失败' };
  }
}

/**
 * 家属从云端查询老人用药数据
 * @param {string} 家庭编号
 * @param {string} 查看密码
 * @returns {Promise<{成功: boolean, 数据?: Object, 错误?: string}>}
 */
export async function 查询家庭数据(家庭编号, 查看密码) {
  if (!已初始化) {
    return { 成功: false, 错误: '云服务未初始化' };
  }
  if (!家庭编号 || !查看密码) {
    return { 成功: false, 错误: '请输入家庭编号和查看密码' };
  }

  try {
    const 查询 = new AV.Query('FamilyData');
    查询.equalTo('familyId', 家庭编号);
    查询.equalTo('password', 查看密码);
    const 结果 = await 查询.first();

    if (!结果) {
      return { 成功: false, 错误: '家庭编号或查看密码错误，请检查后重试' };
    }

    const 数据文本 = 结果.get('data') || '{}';
    const 数据 = JSON.parse(数据文本);
    return { 成功: true, 数据 };
  } catch (错误) {
    console.error('查询家庭数据失败:', 错误);
    return { 成功: false, 错误: 错误.message || '查询失败' };
  }
}
