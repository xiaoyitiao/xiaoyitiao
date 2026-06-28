/**
 * 安全工具模块
 * 提供 XSS 转义、密码哈希、敏感数据加密等前端安全能力
 *
 * 注意：前端加密仅能增加本地数据读取门槛，生产环境仍需后端代理保护 API 密钥，
 * 敏感数据应存储在服务端并由服务端管理密钥。
 */

/**
 * 将文本中的 HTML 特殊字符转义，防止 XSS
 * @param {string} 文本
 * @returns {string}
 */
export function 转义HTML(文本) {
  if (文本 == null) return '';
  return String(文本)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 使用 textContent 安全设置元素文本
 * @param {HTMLElement} 元素
 * @param {string} 文本
 */
export function 安全设置文本(元素, 文本) {
  if (!元素) return;
  元素.textContent = 文本 == null ? '' : String(文本);
}

/**
 * 生成随机盐
 * @param {number} 长度
 * @returns {string}
 */
export function 生成盐(长度 = 16) {
  const 字符集 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let 盐 = '';
  const 随机值 = new Uint8Array(长度);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(随机值);
    for (let i = 0; i < 长度; i++) {
      盐 += 字符集[随机值[i] % 字符集.length];
    }
  } else {
    for (let i = 0; i < 长度; i++) {
      盐 += 字符集[Math.floor(Math.random() * 字符集.length)];
    }
  }
  return 盐;
}

/**
 * 使用 SHA-256 对密码加盐哈希
 * @param {string} 密码
 * @param {string} 盐
 * @returns {Promise<string>} hex 格式哈希值
 */
export async function 哈希密码(密码, 盐) {
  const 编码器 = new TextEncoder();
  const 数据 = 编码器.encode(盐 + 密码);
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // 降级：非安全环境返回简单字符串（仅用于演示，生产不可用）
    return 简单哈希(盐 + 密码);
  }
  const 哈希缓冲区 = await crypto.subtle.digest('SHA-256', 数据);
  return 缓冲区转Hex(哈希缓冲区);
}

/**
 * 简单字符串哈希（降级方案）
 * @param {string} 文本
 * @returns {string}
 */
function 简单哈希(文本) {
  let 哈希 = 0;
  for (let i = 0; i < 文本.length; i++) {
    const 字符 = 文本.charCodeAt(i);
    哈希 = ((哈希 << 5) - 哈希) + 字符;
    哈希 |= 0;
  }
  return 文本.length.toString(16) + Math.abs(哈希).toString(16);
}

/**
 * 将 ArrayBuffer 转为十六进制字符串
 * @param {ArrayBuffer} 缓冲区
 * @returns {string}
 */
function 缓冲区转Hex(缓冲区) {
  return Array.from(new Uint8Array(缓冲区))
    .map(字节 => 字节.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 从密码短语派生 AES-GCM 密钥
 * @param {string} 密码短语
 * @param {Uint8Array} 盐
 * @returns {Promise<CryptoKey>}
 */
async function 派生密钥(密码短语, 盐) {
  const 编码器 = new TextEncoder();
  const 密钥材料 = await crypto.subtle.importKey(
    'raw',
    编码器.encode(密码短语),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: 盐,
      iterations: 100000,
      hash: 'SHA-256'
    },
    密钥材料,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 加密敏感文本
 * @param {string} 明文
 * @param {string} 密码短语 - 用于派生密钥的口令
 * @returns {Promise<string|null>} base64 格式密文，包含盐和 IV
 */
export async function 加密文本(明文, 密码短语) {
  if (!明文) return 明文;
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    console.warn('当前环境不支持 Web Crypto，敏感数据未加密存储');
    return 明文;
  }
  try {
    const 盐 = crypto.getRandomValues(new Uint8Array(16));
    const IV = crypto.getRandomValues(new Uint8Array(12));
    const 密钥 = await 派生密钥(密码短语, 盐);
    const 编码器 = new TextEncoder();
    const 密文 = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: IV },
      密钥,
      编码器.encode(明文)
    );
    const 包 = new Uint8Array(盐.length + IV.length + 密文.byteLength);
    包.set(盐, 0);
    包.set(IV, 盐.length);
    包.set(new Uint8Array(密文), 盐.length + IV.length);
    return btoa(String.fromCharCode(...包));
  } catch (错误) {
    console.error('加密失败:', 错误);
    return null;
  }
}

/**
 * 解密敏感文本
 * @param {string} 密文Base64
 * @param {string} 密码短语
 * @returns {Promise<string|null>}
 */
export async function 解密文本(密文Base64, 密码短语) {
  if (!密文Base64) return 密文Base64;
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return 密文Base64;
  }
  try {
    const 包 = Uint8Array.from(atob(密文Base64), c => c.charCodeAt(0));
    const 盐 = 包.slice(0, 16);
    const IV = 包.slice(16, 28);
    const 密文 = 包.slice(28);
    const 密钥 = await 派生密钥(密码短语, 盐);
    const 明文缓冲区 = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: IV },
      密钥,
      密文
    );
    return new TextDecoder().decode(明文缓冲区);
  } catch (错误) {
    console.error('解密失败:', 错误);
    return null;
  }
}

/**
 * 判断字符串是否为加密后的密文格式（简单启发式）
 * @param {string} 文本
 * @returns {boolean}
 */
export function 像是密文(文本) {
  return typeof 文本 === 'string' && 文本.length > 40 && /^[A-Za-z0-9+/=]+$/.test(文本);
}
