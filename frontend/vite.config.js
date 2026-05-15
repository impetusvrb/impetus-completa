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

/**
 * Vite remove filhos personalizados de #root no HTML final da build; injectamos splash fixo
 * antes do root para haver feedback visível até ao primeiro paint do React (evita “só grade”).
 */
function injectBootSplashPlugin() {
  const splashBlock = `    <div
      id="impetus-boot-splash"
      style="position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#070c14;color:rgba(232,244,255,0.92);font-family:system-ui,sans-serif;"
    >
      <div
        style="width:44px;height:44px;border:3px solid rgba(0,212,255,0.18);border-top-color:#00d4ff;border-radius:50%;box-shadow:0 0 14px rgba(0,212,255,0.35);animation:impetus-boot-spin 0.85s linear infinite;"
      ></div>
      <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.88;">A carregar o sistema…</p>
    </div>
    <style>
      @keyframes impetus-boot-spin { to { transform: rotate(360deg); } }
    </style>
    <noscript>
      <div style="padding:2rem;background:#070c14;color:#e8f4ff;font-family:system-ui,sans-serif;">
        Ative JavaScript para utilizar o Impetus.
      </div>
    </noscript>`;

  return {
    name: 'inject-boot-splash',
    transformIndexHtml(html) {
      if (html.includes('id="impetus-boot-splash"')) return html;
      let out = html;
      if (!/style\s*=\s*["']margin:0;background:#070c14/.test(out)) {
        out = out.replace('<body>', '<body style="margin:0;background:#070c14;">');
      }
      out = out.replace('<div id="root"></div>', `${splashBlock}\n    <div id="root"></div>`);
      return out;
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
  plugins: [unityManuIaViewerStrict404(), react(), injectBootSplashPlugin(), htmlNoCachePlugin()],
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
