# 智药伴 - AI 老年人用药提醒

一款面向老年人的 AI 用药提醒 Web 应用，采用移动端优先设计，支持语音录入、拍照识别、用药计划、AI 用药助手、家属关怀等功能。

## 功能特性

- **今日用药**：按时间展示今日待服药品，支持一键打卡与完成进度统计。
- **添加药品**：支持语音录入、拍照识别、手动输入三种方式添加药品。
- **用药计划**：管理全部药品，支持删除。
- **AI 用药助手**：基于本地知识库或接入真实大模型 API，回答用药相关问题。
- **家属关怀**：展示老人今日用药统计与漏服预警。
- **到点提醒**：到服药时间自动弹窗提醒，漏服 30 分钟后再次提醒。
- **长辈模式**：一键切换大字体、高对比度，更适合老年人使用。
- **语音播报**：关键操作与提醒支持语音播报。

## 技术栈

- **前端框架**：原生 HTML5 + CSS3 + JavaScript（Vanilla JS）
- **构建工具**：[Vite](https://vitejs.dev/)
- **数据存储**：浏览器 `localStorage` 本地持久化
- **语音识别**：Web Speech API
- **语音合成**：Web Speech API
- **AI 接口**：OpenAI 风格 HTTP API（可选配置）

## 快速开始

### 环境要求

- Node.js >= 18
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

默认在 http://localhost:5173 打开应用。

### 构建生产版本

```bash
npm run build
```

构建产物输出到 `dist` 目录。

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
zhiyaoban-app/
├── index.html          # 应用入口页面
├── package.json        # 项目依赖与脚本
├── vite.config.js      # Vite 配置文件
├── README.md           # 项目说明
├── .gitignore          # Git 忽略规则
├── css/
│   └── style.css       # 全局样式
└── js/
    ├── main.js         # 应用入口，负责初始化
    ├── store.js        # 本地数据存储与默认数据
    ├── utils.js        # 通用工具函数
    ├── voice.js        # 语音识别与语音合成
    ├── router.js       # 页面路由切换
    ├── today.js        # 今日用药模块
    ├── add.js          # 添加药品模块（语音/拍照/手动）
    ├── schedule.js     # 用药计划模块
    ├── ai.js           # AI 用药助手模块
    ├── family.js       # 家属关怀模块
    ├── reminder.js     # 提醒与漏服检测
    └── settings.js     # 设置模块
```

## 开发说明

### 代码规范

- 变量与函数命名使用中文语义化名称，便于理解业务含义。
- 模块按功能拆分，单一职责。
- 避免在纯前端代码中硬编码敏感信息（如 API 密钥）。

### 配置真实 AI 接口

如需接入真实大模型，请在 `js/ai.js` 中修改 `AI配置`：

```javascript
const AI配置 = {
  启用真实API: true,
  API地址: 'https://api.example.com/v1/chat/completions',
  API密钥: 'your-api-key',
  模型: 'your-model-name'
};
```

> 注意：在生产环境中建议通过后端代理调用 AI 接口，避免在前端暴露 API 密钥。

### 拍照识别说明

当前拍照识别为演示实现，上传任意图片会固定识别为示例药品。后续可接入真实 OCR 或药品识别 API。

## 部署

本项目构建后为纯静态文件，可部署到任意静态网站托管服务，例如：

- GitHub Pages
- Vercel
- Netlify
- 腾讯云 COS / 阿里云 OSS

## 注意事项

- 浏览器需要支持 Web Speech API 才能使用语音识别与播报功能，推荐使用 Chrome 或 Edge。
- 数据存储在浏览器本地，清除浏览器数据会导致用药记录丢失，建议定期备份。
- 本应用提供的用药建议仅供参考，不能替代医生或药师的专业指导。

## 开源协议

MIT License
