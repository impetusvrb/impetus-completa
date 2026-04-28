/**
 * WebSocket namespace /impetus-voice — streaming de áudio TTS em tempo real.
 * Cliente: emit voice:speak_stream { text, voice, speed } → recebe voice:mp3 { i, n, b64 } … voice:stream_end
 * Interromper: emit voice:cancel
 */
'use strict';
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const voiceTts = require('../services/voiceTtsService');

function voiceFirstName(payloadName, socketName) {
  return voiceTts.firstNameFromDisplay(String(payloadName || socketName || '').trim());
}

const MAX_CHUNKS_PER_STREAM = 24;
const STREAM_COOLDOWN_MS = 800;
const MIN_MP3_BYTES = 1500;
const lastStreamBySocket = new WeakMap();

function initVoiceStreamSocket(io) {
  const nsp = io.of('/impetus-voice');

  nsp.use((socket, next) => {
    const token =
      (socket.handshake.auth && socket.handshake.auth.token) ||
      (socket.handshake.query && socket.handshake.query.token);
    if (!token) return next(new Error('Token não fornecido'));
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  nsp.on('connection', (socket) => {
    socket.on('error', (err) => {
      console.warn('[impetus-voice] socket error:', err?.message || err);
    });

    if (!voiceTts.getOpenaiAvailable()) {
      socket.emit('voice:error', { error: 'TTS indisponível' });
    }

    socket.on('voice:cancel', () => {
      try {
        socket._voiceTtsAbort?.abort();
      } catch (err) {
        console.warn(
          '[VOICE_WS][cancel_abort]',
          err && err.message ? err.message : err
        );
      }
    });

    socket.on('voice:speak_stream', async (payload) => {
      try {
        if (!voiceTts.getOpenaiAvailable()) {
          socket.emit('voice:error', { error: 'OpenAI não configurada' });
          return;
        }
        const now = Date.now();
        if (now - (lastStreamBySocket.get(socket) || 0) < STREAM_COOLDOWN_MS) {
          socket.emit('voice:error', { error: 'Aguarde um instante.' });
          return;
        }
        lastStreamBySocket.set(socket, now);

        try {
          socket._voiceTtsAbort?.abort();
        } catch (err) {
          console.warn(
            '[VOICE_WS][speak_stream_abort_prev]',
            err && err.message ? err.message : err
          );
        }
        const ac = new AbortController();
        socket._voiceTtsAbort = ac;
        const { signal } = ac;

        const text = (payload && payload.text) || '';
        const voice = payload.voice;
        const speed = payload.speed;
        const sentimentContext = payload?.sentimentContext || null;
        const userDisplayName = voiceFirstName(payload?.userDisplayName, socket.user?.name);

        const parts = voiceTts.splitForNaturalTts(text).slice(0, MAX_CHUNKS_PER_STREAM);
        if (!parts.length) {
          socket.emit('voice:stream_end', { ok: true, empty: true });
          return;
        }

        const n = parts.length;
        for (let i = 0; i < n; i++) {
          if (signal.aborted) {
            socket.emit('voice:stream_aborted', { at: i });
            return;
          }
          const buf = await voiceTts.synthesizeMp3(parts[i], {
            voice,
            speed,
            sentimentContext: i === 0 ? sentimentContext : null,
            streamChunkIndex: i,
            userDisplayName: userDisplayName || undefined
          });
          if (signal.aborted) {
            socket.emit('voice:stream_aborted', { at: i });
            return;
          }
          if (buf && buf.length >= MIN_MP3_BYTES) {
            socket.emit('voice:mp3', {
              i,
              n,
              b64: buf.toString('base64'),
              text: parts[i]
            });
          } else {
            socket.emit('voice:warn', { i, reason: 'chunk_too_small' });
          }
        }
        if (!signal.aborted) {
          socket.emit('voice:stream_end', { ok: true });
        }
      } catch (e) {
        console.warn('[impetus-voice] speak_stream:', e?.message || e);
        try {
          socket.emit('voice:error', { error: 'Falha no stream de voz' });
        } catch (err) {
          console.warn(
            '[VOICE_WS][emit_error_fallback]',
            err && err.message ? err.message : err
          );
        }
      }
    });
  });

  console.info('[VOICE_WS] Namespace /impetus-voice ativo');
}

module.exports = { initVoiceStreamSocket };
