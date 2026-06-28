/**
 * 首次使用引导模块
 *
 * 改进：
 * 1. 首次进入为空状态，不显示默认药品。
 * 2. 引导用户选择身份、开启长辈模式、添加第一味药。
 * 3. 首次使用需同意隐私政策。
 */

import { 应用数据, 保存数据 } from './store.js';
import { 切换页面 } from './router.js';

/**
 * 显示首次使用引导弹窗
 */
export function 显示首次引导() {
  const 弹窗 = document.getElementById('onboardingModal');
  if (!弹窗) return;

  // 初始化引导表单状态
  const 长辈模式开关 = document.getElementById('onboardingElderlyMode');
  if (长辈模式开关) {
    长辈模式开关.checked = true;
  }

  弹窗.classList.remove('hidden');
}

/**
 * 完成首次引导
 */
export function 完成首次引导() {
  const 弹窗 = document.getElementById('onboardingModal');
  if (弹窗) 弹窗.classList.add('hidden');

  // 保存长辈模式选择
  const 长辈模式开关 = document.getElementById('onboardingElderlyMode');
  if (长辈模式开关) {
    应用数据.设置.长辈模式 = 长辈模式开关.checked;
    document.body.classList.toggle('elderly-mode', 应用数据.设置.长辈模式);
  }

  // 保存身份选择
  const 身份选择 = document.querySelector('input[name="onboardingRole"]:checked');
  if (身份选择) {
    应用数据.设置.当前角色 = 身份选择.value; // 'elder' 或 'family'
  }

  应用数据.首次使用 = false;
  应用数据.设置.隐私已同意 = true;
  保存数据();
}
