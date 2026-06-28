/**
 * 拍照识别与药品信息解析模块
 * 使用 Tesseract.js 识别药盒文字，再通过本地库匹配或 AI 解析提取药品信息
 *
 * 改进：
 * 1. Tesseract.js 改为动态 import，失败时给出降级提示。
 * 2. 首次加载显示语言包下载进度。
 * 3. AI 解析结果做字段校验，避免直接渲染未经验证的内容。
 * 4. 远程/AI 内容渲染前转义。
 */

import { 匹配药品 } from './medicine-db.js';
import { 请求AI解析 } from './ai.js';
import { 安全Fetch, 重试执行 } from './utils.js';

let TesseractWorker = null;
let 语言包已加载 = false;

/**
 * 动态加载 Tesseract.js，支持重试
 * @returns {Promise<Object>}
 */
async function 获取Tesseract() {
  if (TesseractWorker) return { createWorker: TesseractWorker };

  return await 重试执行(async () => {
    const 模块 = await import('tesseract.js');
    const createWorker = 模块.createWorker;
    if (!createWorker) throw new Error('Tesseract.js 加载异常');
    return { createWorker };
  }, 1, 2000);
}

/**
 * 识别图片中的文字
 * @param {string} 图片数据 - Data URL 格式的图片
 * @param {Function} 进度回调 - 接收识别进度信息
 * @returns {Promise<string>} 识别到的文字
 */
export async function 识别图片文字(图片数据, 进度回调 = null) {
  let 工作进程 = null;
  try {
    const { createWorker } = await 获取Tesseract();
    工作进程 = await createWorker('chi_sim', undefined, {
      logger: (消息) => {
        if (进度回调 && 消息.status) {
          // 首次下载语言包时展示进度
          if (消息.status === 'loading language traineddata' && 消息.progress) {
            const 百分比 = Math.round(消息.progress * 100);
            进度回调({ status: 'downloading lang pack', progress: 消息.progress });
            if (!语言包已加载 && 百分比 < 100) {
              console.log(`语言包下载进度: ${百分比}%`);
            }
          }
          if (消息.status === 'recognizing text') {
            进度回调(消息);
          }
        }
      },
      errorHandler: (错误) => {
        console.error('文字识别错误:', 错误);
      }
    });

    语言包已加载 = true;
    const 结果 = await 工作进程.recognize(图片数据);
    return 结果.data.text || '';
  } catch (错误) {
    console.error('OCR 识别失败:', 错误);
    throw new Error('拍照识别服务加载失败，建议改用语音或手动输入');
  } finally {
    if (工作进程) {
      try {
        await 工作进程.terminate();
      } catch (错误) {
        console.error('终止 OCR 工作进程失败:', 错误);
      }
    }
  }
}

/**
 * 校验药品信息字段类型
 * @param {Object} 信息
 * @returns {boolean}
 */
function 是有效药品信息(信息) {
  return 信息 &&
    typeof 信息.名称 === 'string' && 信息.名称.length > 0 &&
    typeof 信息.剂量 === 'string' &&
    typeof 信息.时间 === 'string' && /^\d{2}:\d{2}$/.test(信息.时间);
}

/**
 * 从识别文字中提取药品信息
 * 优先匹配本地药品库，未匹配时尝试 AI 解析
 * @param {string} 识别文字
 * @returns {Promise<Object|null>} 药品信息对象
 */
export async function 解析药品信息(识别文字) {
  if (!识别文字 || !识别文字.trim()) {
    return null;
  }

  // 第一步：本地药品库模糊匹配
  const 本地匹配 = 匹配药品(识别文字);
  if (本地匹配) {
    return {
      名称: 本地匹配.名称,
      剂量: 本地匹配.剂量,
      实际剂量: 本地匹配.剂量,
      时间: 本地匹配.时间,
      频率: 'daily',
      备注: 本地匹配.备注
    };
  }

  // 第二步：如果配置了 AI 接口，使用 AI 智能解析
  const 系统提示 = `你是一位药品信息解析助手。请从用户提供的药品包装盒文字中，提取以下信息并返回标准 JSON 格式：
{
  "名称": "药品通用名或商品名",
  "剂量": "每次服用剂量，如 1片、2粒、5毫升",
  "时间": "建议服药时间，格式为 HH:MM，如 08:00",
  "备注": "服用注意事项，如 饭后服用、睡前服用、空腹服用"
}
如果某项无法确定，请给出最合理的默认值。只返回 JSON，不要返回其他说明文字。`;

  try {
    const AI结果 = await 请求AI解析(识别文字, 系统提示);
    if (AI结果) {
      const JSON文本 = AI结果.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const 解析结果 = JSON.parse(JSON文本);
      const 药品信息 = {
        名称: String(解析结果.名称 || 解析结果.name || '未识别药品').trim(),
        剂量: String(解析结果.剂量 || 解析结果.dose || '1片').trim(),
        实际剂量: String(解析结果.剂量 || 解析结果.dose || '1片').trim(),
        时间: String(解析结果.时间 || 解析结果.time || '08:00').trim(),
        频率: 'daily',
        备注: String(解析结果.备注 || 解析结果.note || '请遵医嘱').trim()
      };
      if (是有效药品信息(药品信息)) {
        return 药品信息;
      }
    }
  } catch (错误) {
    console.error('AI解析结果解析失败:', 错误);
  }

  // 第三步：本地规则提取作为兜底
  return 本地规则提取(识别文字);
}

/**
 * 使用本地规则从文字中提取药品信息
 * @param {string} 识别文字
 * @returns {Object|null}
 */
function 本地规则提取(识别文字) {
  const 文本 = 识别文字.replace(/\s+/g, '');

  // 提取药品名：尝试匹配常见后缀
  const 药品名匹配 = 文本.match(/([\u4e00-\u9fa5]{2,}(?:片|胶囊|颗粒|口服液|滴剂|肠溶片|缓释片|控释片))/);
  const 名称 = 药品名匹配 ? 药品名匹配[1] : '未识别药品';

  // 提取剂量
  const 剂量匹配 = 文本.match(/(\d+)(片|粒|袋|毫升|mg|g)/);
  const 剂量 = 剂量匹配 ? `${剂量匹配[1]}${剂量匹配[2]}` : '1片';

  // 提取时间
  const 时间匹配 = 文本.match(/(\d{1,2})[:：点](\d{0,2})?/);
  let 时间 = '08:00';
  if (时间匹配) {
    const 时 = 时间匹配[1].padStart(2, '0');
    const 分 = (时间匹配[2] || '00').padStart(2, '0');
    时间 = `${时}:${分}`;
  } else if (文本.includes('睡前')) {
    时间 = '21:00';
  } else if (文本.includes('早上') || 文本.includes('晨起')) {
    时间 = '08:00';
  } else if (文本.includes('中午')) {
    时间 = '12:00';
  } else if (文本.includes('晚上')) {
    时间 = '18:00';
  }

  // 提取备注
  let 备注 = '请遵医嘱';
  if (文本.includes('饭后')) 备注 = '饭后服用';
  else if (文本.includes('饭前')) 备注 = '饭前服用';
  else if (文本.includes('睡前')) 备注 = '睡前服用';
  else if (文本.includes('空腹')) 备注 = '空腹服用';

  const 结果 = { 名称, 剂量, 实际剂量: 剂量, 时间, 频率: 'daily', 备注 };
  return 是有效药品信息(结果) ? 结果 : null;
}
