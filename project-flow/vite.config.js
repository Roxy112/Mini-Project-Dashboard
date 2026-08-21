import { defineConfig } from 'vite';

export default defineConfig({
  // 本地开发服务器配置
  server: {
    port: 3000,
    open: true,
  },

  // 生产环境打包配置
  build: {
    outDir: 'dist',
  },

  // 静态资源基础路径
  base: './',
});
