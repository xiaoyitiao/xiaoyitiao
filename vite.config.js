import { defineConfig } from 'vite';

// Vite 配置文件
export default defineConfig({
  // 开发服务器配置
  server: {
    port: 5173,
    open: true
  },
  // 生产构建配置
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
