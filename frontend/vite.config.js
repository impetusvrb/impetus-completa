import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Evita que o fallback SPA do Vite (preview + dev) sirva index.html em vez de 404
 * para .loader.js / .wasm / etc. em /unity/manu-ia-viewer/ quando o build ainda não foi copiado.
 */
function unityManuIaViewerStrict404() {
  const prefix = '/unity/manu-ia-viewer/';
  const addMw = (middlewares, baseDir) => {
    const sentinel = path.resolve(baseDir, 'unity/manu-ia-viewer');
    middlewares.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      let pathname;
      try {
        pathname = decodeURIComponent((req.url || '').split('?')[0] || '');
      } catch {
        next();
        return;
      }
      if (!pathname.startsWith(prefix)) {
        next();
        return;
      }
      const rel = pathname.replace(/^\/+/, '');
      const filePath = path.resolve(baseDir, rel);
      if (!filePath.startsWith(sentinel)) {
        next();
        return;
      }
      fs.stat(filePath, (err, st) => {
        if (err || !st.isFile()) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Not found');
          return;
        }
        next();
      });
    });
  };
  return {
    name: 'unity-manu-ia-viewer-strict-404',
    configureServer(server) {
      addMw(server.middlewares, path.resolve(server.config.root, 'public'));
    },
    configurePreviewServer(server) {
      addMw(
        server.middlewares,
        path.resolve(server.config.root, server.config.build.outDir)
      );
    }
  };
}

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
  plugins: [unityManuIaViewerStrict404(), react(), htmlNoCachePlugin()],
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
      '/uploads': {
        target: process.env.VITE_API_BASE || 'http://localhost:4000',
        changeOrigin: true,
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
      '/uploads': {
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
