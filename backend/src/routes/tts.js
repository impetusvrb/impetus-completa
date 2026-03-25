'use strict';

/**
 * Endpoint simples de TTS para testes.
 * - POST /api/tts/tts  { text, voice='alloy', speed } -> salva áudio em cache e retorna { url }
 * - GET  /api/tts/tts.mp3 -> serve o último áudio gerado
 *
 * Observação: no teu projeto principal já existe TTS via /dashboard/chat/voice/speak.
 * Este endpoint é só para "testar TTS" sem depender do fluxo de chat por voz.
 */
const express = require('express');
const voiceTts = require('../services/voiceTtsService');

const router = express.Router();

let lastMp3Buf = null;
let lastUpdatedAt = 0;

function pickVoice(v) {
  const allowed = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  return allowed.includes(v) ? v : 'alloy';
}

function pickSpeed(s) {
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return parseFloat(process.env.OPENAI_TTS_DEFAULT_SPEED) || 0.98;
  return Math.min(1.25, Math.max(0.75, n));
}

async function handleTtsPost(req, res) {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Texto é obrigatório' });
    }
    if (!voiceTts.getOpenaiAvailable()) {
      return res.status(503).json({ error: 'TTS indisponível (OpenAI não configurada)' });
    }

    const voice = pickVoice(req.body.voice);
    const speed = pickSpeed(req.body.speed);
    const buf = await voiceTts.synthesizeMp3(text, { voice, speed });
    if (!buf || !buf.length) {
      return res.status(502).json({ error: 'Erro no TTS' });
    }

    lastMp3Buf = buf;
    lastUpdatedAt = Date.now();

    // TTL simples do cache para não acumular memória
    setTimeout(() => {
      if (Date.now() - lastUpdatedAt >= 10 * 60 * 1000) lastMp3Buf = null;
    }, 10 * 60 * 1000);

    res.json({ url: '/api/tts/tts.mp3' });
  } catch (err) {
    console.error('[TTS route]', err?.message || err);
    res.status(500).json({ error: 'Erro no TTS' });
  }
}

// compatibilidade:
// - POST /api/tts      (como no snippet do frontend)
// - POST /api/tts/tts  (rota explícita)
router.post('/', express.json({ limit: '64kb' }), handleTtsPost);
router.post('/tts', express.json({ limit: '64kb' }), handleTtsPost);

router.get('/tts.mp3', (req, res) => {
  if (!lastMp3Buf || !lastMp3Buf.length) {
    return res.status(404).send('Sem áudio em cache');
  }
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  res.send(lastMp3Buf);
});

module.exports = router;

