import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
<<<<<<< HEAD
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
=======
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
>>>>>>> 69a0e341ce405218b402fdd9ef91e2bd110c65e3
});
