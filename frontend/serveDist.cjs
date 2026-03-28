/**
 * Produção: serve `dist/` + proxy /api (PM2: npm run preview:prod).
 * Unity WebGL com ficheiros *.br: é obrigatório enviar `Content-Encoding: br` para o browser
 * descomprimir antes do loader JS (ver createUnityInstance no .loader.js). Sem isso o Unity
 * aborta com "still brotli-compressed". Não usar middleware `compression()` em cima destes ficheiros.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const distDir = path.join(__dirname, 'dist');
const unitySentinel = path.resolve(distDir, 'unity', 'manu-ia-viewer');

const API_TARGET = process.env.VITE_API_BASE || process.env.API_PROXY_TARGET || 'http://127.0.0.1:4000';

const socketIoProxy = createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  ws: true
});
const realtimeProxy = createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  ws: true
});

/**
 * MIME + Content-Encoding: builds Brotli (*.br) precisam de Content-Encoding: br;
 * builds sem compressão não devem ter Content-Encoding (wasm precisa de application/wasm).
 */
function setUnityBuildHeaders(res, filePath) {
  const base = path.basename(filePath);
  if (base.endsWith('.wasm.br')) {
    res.setHeader('Content-Type', 'application/wasm');
    res.setHeader('Content-Encoding', 'br');
  } else if (base.endsWith('.wasm')) {
    res.setHeader('Content-Type', 'application/wasm');
  } else if (base.endsWith('.framework.js.br')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Content-Encoding', 'br');
  } else if (base.endsWith('.framework.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  } else if (base.endsWith('.data.br')) {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Encoding', 'br');
  } else if (base.endsWith('.data')) {
    res.setHeader('Content-Type', 'application/octet-stream');
  } else if (base.endsWith('.loader.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  }
}

app.use((req, res, next) => {
  const u = (req.path || '').split('?')[0];
  if (u.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(
  '/api',
  createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
    /* req.url no mount perde o prefixo /api; o backend espera /api/... */
    pathRewrite: (path) => `/api${path.startsWith('/') ? path : `/${path}`}`
  })
);
app.use('/impetus-realtime', realtimeProxy);
app.use('/socket.io', socketIoProxy);

const unityBuildBr = path.resolve(distDir, 'unity/manu-ia-viewer/Build');
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (!/^\/unity\/manu-ia-viewer\/Build\/[^/]+\.br$/i.test(req.path)) return next();
  const rel = req.path.replace(/^\/+/, '');
  const fp = path.resolve(distDir, rel);
  if (!fp.startsWith(unityBuildBr)) {
    res.status(403).end();
    return;
  }
  fs.stat(fp, (err, st) => {
    if (err || !st.isFile()) return next();
    setUnityBuildHeaders(res, fp);
    res.sendFile(fp, { acceptRanges: false, maxAge: 0, immutable: false }, (e) => {
      if (e) next(e);
    });
  });
});

app.use(
  express.static(distDir, {
    index: false,
    setHeaders: (res, filePath) => {
      const rel = path.relative(distDir, filePath);
      if (rel.startsWith('..')) return;
      const norm = rel.replace(/\\/g, '/');
      if (norm.startsWith('unity/manu-ia-viewer/Build/')) {
        setUnityBuildHeaders(res, filePath);
      }
    }
  })
);

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next();
    return;
  }
  const pathname = (req.path || '').split('?')[0];
  if (pathname.startsWith('/unity/manu-ia-viewer/')) {
    const rel = pathname.replace(/^\/+/, '');
    const fp = path.resolve(distDir, rel);
    if (!fp.startsWith(unitySentinel)) {
      res.status(403).type('text/plain').send('Forbidden');
      return;
    }
    /* express.static já serviu se existia; aqui = ficheiro em falta */
    res.status(404).type('text/plain').send('Not found');
    return;
  }
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next(err);
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`[serveDist] http://${HOST}:${PORT}/ (root=${distDir})`);
  console.log(`[serveDist] proxy -> ${API_TARGET} (/api, /socket.io, /impetus-realtime)`);
});

server.on('upgrade', (req, socket, head) => {
  const u = req.url || '';
  if (u.startsWith('/socket.io')) {
    socketIoProxy.upgrade(req, socket, head);
  } else if (u.startsWith('/impetus-realtime')) {
    realtimeProxy.upgrade(req, socket, head);
  }
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
if (typeof server.requestTimeout === 'number' || server.requestTimeout === undefined) {
  server.requestTimeout = 0;
}
