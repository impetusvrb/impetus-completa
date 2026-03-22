/**
 * Proxy WebSocket OpenAI Realtime: o browser conecta em /impetus-realtime com ?token=JWT;
 * o servidor abre wss://api.openai.com/v1/realtime com Authorization: Bearer (OPENAI_API_KEY).
 *
 * Integração no servidor HTTP existente (após criar o server):
 *   const { Server } = require('socket.io');
 *   const { registerAvatarLipsyncNamespace } = require('./services/avatarLipsyncSocket');
 *   const io = new Server(httpServer, { path: '/socket.io', cors: { origin: true, credentials: true } });
 *   const avatarNsp = io.of('/impetus-avatar');
 *   registerAvatarLipsyncNamespace(avatarNsp);
 *   const { attachRealtimeOpenaiProxy } = require('./services/realtimeOpenaiProxy');
 *   attachRealtimeOpenaiProxy(httpServer, { avatarLipsyncNamespace: avatarNsp });
 *
 * .env: IMPETUS_REALTIME_PROXY_ENABLED=true, OPENAI_API_KEY=sk-...
 * Opcional: OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview, IMPETUS_REALTIME_WS_PATH=/impetus-realtime
 *
 * Wav2Lip (somente com proxy — o áudio só passa no servidor aqui):
 *   IMPETUS_REALTIME_LIPSYNC_ENABLED=true
 *   IMPETUS_LIPSYNC_URL=http://127.0.0.1:5001/lipsync
 *   IMPETUS_LIPSYNC_FACE_VIDEO=/caminho/impetus-speaking.mp4 (opcional; padrão frontend/public/…)
 *   IMPETUS_REALTIME_OUTPUT_AUDIO_HZ=24000
 *   IMPETUS_LIPSYNC_MIN_PCM_BYTES=24000 (ignora áudio muito curto, ex. bips)
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const {
  createRealtimeResponseLipsyncTap,
  isLipsyncEnabled
} = require('./realtimeResponseLipsyncTap');

const DEFAULT_PATH = String(
  process.env.IMPETUS_REALTIME_WS_PATH || '/impetus-realtime'
).replace(/\/$/, '') || '/impetus-realtime';

function isProxyEnabled() {
  const v = String(process.env.IMPETUS_REALTIME_PROXY_ENABLED || '').toLowerCase().trim();
  return v === 'true' || v === '1' || v === 'yes';
}

function defaultModel() {
  return (
    String(process.env.OPENAI_REALTIME_MODEL || '').trim() || 'gpt-4o-realtime-preview'
  );
}

/**
 * @param {import('http').Server} httpServer
 * @param {{
 *   path?: string,
 *   avatarLipsyncNamespace?: import('socket.io').Namespace
 * }} [options]
 * @returns {boolean} true se o handler de upgrade foi registrado
 */
function attachRealtimeOpenaiProxy(httpServer, options = {}) {
  if (!isProxyEnabled()) {
    return false;
  }

  const path = (options.path || DEFAULT_PATH).replace(/\/$/, '') || '/impetus-realtime';
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    console.error('[realtime-proxy] OPENAI_API_KEY ausente; proxy não ativo.');
    return false;
  }

  const wss = new WebSocket.Server({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    let host;
    try {
      host = request.headers.host || 'localhost';
    } catch {
      socket.destroy();
      return;
    }

    let pathname;
    let searchParams;
    try {
      const u = new URL(request.url || '/', `http://${host}`);
      pathname = u.pathname.replace(/\/$/, '') || '/';
      searchParams = u.searchParams;
    } catch {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    if (pathname !== path) {
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const modelParam = String(searchParams.get('model') || '').trim();
    const model = modelParam || defaultModel();
    const upstreamUrl = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;

    wss.handleUpgrade(request, socket, head, (clientWs) => {
      const pending = [];
      let cleaned = false;
      const lipsyncTap = createRealtimeResponseLipsyncTap(
        options.avatarLipsyncNamespace || null
      );

      const upstream = new WebSocket(upstreamUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        try {
          lipsyncTap.reset();
        } catch (_) {}
        try {
          clientWs.close();
        } catch (_) {}
        try {
          upstream.close();
        } catch (_) {}
      };

      clientWs.on('message', (data, isBinary) => {
        if (upstream.readyState === WebSocket.OPEN) {
          upstream.send(data, { binary: !!isBinary });
        } else if (upstream.readyState === WebSocket.CONNECTING) {
          pending.push({ data, isBinary: !!isBinary });
        }
      });

      upstream.on('open', () => {
        for (const p of pending) {
          if (upstream.readyState === WebSocket.OPEN) {
            upstream.send(p.data, { binary: p.isBinary });
          }
        }
        pending.length = 0;
      });

      upstream.on('message', (data, isBinary) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data, { binary: !!isBinary });
        }
        if (
          !isBinary &&
          options.avatarLipsyncNamespace &&
          isLipsyncEnabled()
        ) {
          try {
            const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
            const msg = JSON.parse(text);
            lipsyncTap.feedFromUpstreamMessage(msg);
          } catch (_) {}
        }
      });

      upstream.on('error', (err) => {
        console.error('[realtime-proxy] upstream', err.message);
        cleanup();
      });
      clientWs.on('error', () => cleanup());
      upstream.on('close', cleanup);
      clientWs.on('close', cleanup);
    });
  });

  console.log('[realtime-proxy] ativo em', path, '(modelo padrão:', defaultModel() + ')');
  return true;
}

module.exports = {
  attachRealtimeOpenaiProxy,
  isProxyEnabled,
  DEFAULT_PATH,
  isLipsyncEnabled
};
