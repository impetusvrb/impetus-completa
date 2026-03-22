/**
 * Bridge Socket.IO + HTTP para enviar MP4 ao avatar-impetus.html.
 *
 * 1) npm install (nesta pasta)
 * 2) node bridge.mjs
 *
 * O frontend ativa com:
 *   localStorage.setItem('impetus_avatar_lipsync', '1');
 *   localStorage.setItem('impetus_lipsync_io_url', 'http://127.0.0.1:4010');
 *
 * Emitir MP4 para todos os clientes na sala:
 *   curl -X POST http://127.0.0.1:4010/emit-lipsync --data-binary @out.mp4 -H "Content-Type: application/octet-stream"
 *
 * Ou JSON base64:
 *   curl -X POST http://127.0.0.1:4010/emit-lipsync-json -H "Content-Type: application/json" -d '{"base64":"..."}'
 */

import http from 'http';
import { Server } from 'socket.io';
import express from 'express';

const PORT = Number(process.env.LIPSYNC_BRIDGE_PORT || 4010);
const app = express();
app.use(express.json({ limit: '80mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '80mb' }));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
});

io.on('connection', (socket) => {
  socket.on('join_avatar', () => {
    socket.join('avatar_clients');
  });
});

function broadcastMp4(buffer) {
  io.to('avatar_clients').emit('lipsync_mp4', buffer);
}

app.post('/emit-lipsync', (req, res) => {
  const body = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    return res.status(400).json({ ok: false, error: 'Corpo binário MP4 obrigatório' });
  }
  broadcastMp4(body);
  res.json({ ok: true, bytes: body.length });
});

app.post('/emit-lipsync-json', (req, res) => {
  const b64 = req.body && req.body.base64;
  if (!b64 || typeof b64 !== 'string') {
    return res.status(400).json({ ok: false, error: 'JSON { base64 } obrigatório' });
  }
  const buf = Buffer.from(b64, 'base64');
  broadcastMp4(buf);
  res.json({ ok: true, bytes: buf.length });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'lipsync-bridge' });
});

httpServer.listen(PORT, () => {
  console.log(`[lipsync-bridge] http://127.0.0.1:${PORT}  (Socket.IO + /emit-lipsync)`);
});
