import { defineConfig } from 'vite';

// Vite 配置文件
export default defineConfig({
  // 部署基础路径（GitHub Pages 使用 /xiaoyitiao/）
  base: '/xiaoyitiao/',
  
  // 开发服务器配置
  server: {
    port: 5173,
    open: true,
    proxy: {
      // 开发环境将 /api 转发到后端 Spring Boot 服务
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  // 生产构建配置
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
