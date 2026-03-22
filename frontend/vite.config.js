import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const voiceRealtime =
    env.VITE_VOICE_REALTIME !== undefined && String(env.VITE_VOICE_REALTIME).trim() !== ''
      ? String(env.VITE_VOICE_REALTIME).trim()
      : 'true';
  const realtimeMeeting =
    env.VITE_REALTIME_MEETING !== undefined && String(env.VITE_REALTIME_MEETING).trim() !== ''
      ? String(env.VITE_REALTIME_MEETING).trim()
      : 'false';

  return {
  plugins: [react()],
  root: '.',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE || 'http://localhost:4000',
        changeOrigin: true,
      },
      '/impetus-realtime': {
        target: process.env.VITE_API_BASE || 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
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
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  define: {
    'import.meta.env.VITE_VOICE_REALTIME': JSON.stringify(voiceRealtime),
    'import.meta.env.VITE_REALTIME_MEETING': JSON.stringify(realtimeMeeting),
  },
};
});
