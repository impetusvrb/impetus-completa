import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/painel/',
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:4000',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 5174,
    host: '127.0.0.1',
    strictPort: true,
    allowedHosts: ['srv1422313.hstgr.cloud', 'plataformaimpetus.com', 'www.plataformaimpetus.com', 'localhost']
  }
});
