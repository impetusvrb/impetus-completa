import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/** Cache-Control: no-store só em *.html (avatar-impetus.html sempre fresco). */
function htmlNoCachePlugin() {
  const set = (_req, res, next) => {
    const raw = _req.url || '';
    const u = raw.split('?')[0] || '';
    if (u.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  };
  return {
    name: 'html-no-cache',
    configureServer(server) {
      server.middlewares.use(set);
    },
    configurePreviewServer(server) {
      server.middlewares.use(set);
    },
  };
}

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

  const devPort = Number(process.env.PORT || env.VITE_DEV_PORT || 3000);

  return {
  plugins: [react(), htmlNoCachePlugin()],
  root: '.',
  publicDir: 'public',
  server: {
    port: devPort,
    strictPort: false,
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
      '/socket.io': {
        target: process.env.VITE_API_BASE || 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    port: devPort,
    strictPort: false,
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
      '/socket.io': {
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
