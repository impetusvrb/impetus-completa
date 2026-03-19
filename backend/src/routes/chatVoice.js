/**
 * Rotas de voz do chat Impetus — Whisper STT, OpenAI TTS, format-alert, preferências
 * Montar: app.use('/api/dashboard/chat/voice', chatVoiceRouter);
 */
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const mediaProcessor = require('../services/mediaProcessorService');
const ai = require('../services/ai');
const voiceTts = require('../services/voiceTtsService');

const router = express.Router();
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname !== 'audio') return cb(new Error('Campo audio esperado'));
    cb(null, true);
  }
});

const rateBuckets = new Map();
function rateLimit(userId, max, windowMs) {
  const now = Date.now();
  let b = rateBuckets.get(userId);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + windowMs };
    rateBuckets.set(userId, b);
  }
  b.count++;
  return b.count <= max;
}

const ttsCache = new Map();
const formatAlertCache = new Map();
const TTS_TTL_MS = 60 * 1000;

function cleanTtsInput(text) {
  return String(text || '')
    .replace(/[*_`#]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4096);
}

let db;
try {
  db = require('../db');
} catch (_) {
  db = null;
}

router.post('/transcribe', requireAuth, upload.single('audio'), async (req, res) => {
  if (!rateLimit(req.user.id, 30, 60 * 1000)) {
    return res.status(429).json({ ok: false, error: 'Limite de transcrições. Aguarde 1 minuto.' });
  }
  const filePath = req.file?.path;
  if (!filePath) {
    return res.status(400).json({ ok: false, error: 'Arquivo audio obrigatório' });
  }
  let transcribePath = filePath;
  const ext = path.extname(filePath || '').toLowerCase();
  const okExt = ['.webm', '.mp3', '.m4a', '.wav', '.ogg', '.oga', '.mp4', '.mpeg'].includes(ext);
  if (!okExt) {
    transcribePath = `${filePath}.webm`;
    try {
      fs.renameSync(filePath, transcribePath);
    } catch (e) {
      try {
        fs.copyFileSync(filePath, transcribePath);
        fs.unlinkSync(filePath);
      } catch (_) {
        return res.status(400).json({ ok: false, error: 'Áudio inválido' });
      }
    }
  }
  try {
    const prompt = req.body.prompt || '';
    const result = await mediaProcessor.transcribeAudio(transcribePath, {
      language: (req.body.language || 'pt').slice(0, 5)
    });
    fs.unlink(transcribePath, () => {});
    if (!result.success) {
      return res.status(422).json({
        ok: false,
        transcript: '',
        confidence: 0,
        error: result.error || 'Transcrição falhou'
      });
    }
    res.json({
      ok: true,
      transcript: result.text || '',
      confidence: 0.95,
      language_detected: 'pt',
      prompt_hint: prompt.slice(0, 200)
    });
  } catch (err) {
    try { fs.unlinkSync(transcribePath); } catch (_) {}
    try { fs.unlinkSync(filePath); } catch (_) {}
    console.warn('[CHAT_VOICE transcribe]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/speak', requireAuth, express.json({ limit: '64kb' }), async (req, res) => {
  if (!rateLimit(req.user.id + ':tts', 60, 60 * 1000)) {
    return res.status(429).json({ ok: false, error: 'Limite TTS. Aguarde.' });
  }
  if (!voiceTts.getOpenaiAvailable()) {
    return res.status(503).json({ ok: false, error: 'TTS indisponível (OpenAI não configurada)' });
  }
  const text = cleanTtsInput(req.body.text);
  if (!text) {
    return res.status(400).json({ ok: false, error: 'Texto vazio' });
  }
  const voice = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(req.body.voice)
    ? req.body.voice
    : 'nova';
  const defSp = parseFloat(process.env.OPENAI_TTS_DEFAULT_SPEED) || 0.98;
  const speed = Math.min(1.25, Math.max(0.75, parseFloat(req.body.speed) || defSp));
  const modelTag = (process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts').slice(0, 32);

  const hash = crypto.createHash('sha256').update(text + voice + speed + modelTag).digest('hex');
  const cached = ttsCache.get(hash);
  if (cached && Date.now() < cached.exp) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.send(cached.buf);
  }

  try {
    const buf = await voiceTts.synthesizeMp3(text, { voice, speed });
    if (!buf || !buf.length) {
      return res.status(502).json({ ok: false, error: 'TTS falhou' });
    }
    ttsCache.set(hash, { buf, exp: Date.now() + TTS_TTL_MS });
    if (ttsCache.size > 200) {
      const old = [...ttsCache.entries()].filter(([, v]) => Date.now() > v.exp);
      old.forEach(([k]) => ttsCache.delete(k));
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.send(buf);
  } catch (err) {
    console.warn('[CHAT_VOICE speak]', err.message);
    res.status(502).json({ ok: false, error: err.message || 'TTS falhou' });
  }
});

router.post('/format-alert', requireAuth, express.json({ limit: '128kb' }), async (req, res) => {
  const alertData = req.body.alert_data;
  if (!alertData || typeof alertData !== 'object') {
    return res.status(400).json({ ok: false, error: 'alert_data obrigatório' });
  }
  const id = String(alertData.id || alertData.alert_id || JSON.stringify(alertData).slice(0, 80));
  const ck = `fa:${id}`;
  const cached = formatAlertCache.get(ck);
  if (cached && Date.now() < cached.exp) {
    return res.json({ ok: true, message: cached.msg });
  }
  if (!ai.chatCompletion) {
    const fallback = `Alerta: ${alertData.title || alertData.message || 'evento operacional'}. Verifique o painel.`;
    return res.json({ ok: true, message: fallback });
  }
  try {
    const prompt = `Formate este alerta industrial em 1-2 frases naturais para leitura em voz. Português BR, profissional, direto, sem jargão excessivo.

Dados: ${JSON.stringify(alertData).slice(0, 2000)}

Responda APENAS o texto falado, sem aspas.`;
    const msg = (await ai.chatCompletion(prompt, { max_tokens: 200 })).trim();
    formatAlertCache.set(ck, { msg, exp: Date.now() + 5 * 60 * 1000 });
    res.json({ ok: true, message: msg || 'Novo alerta no sistema.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

async function prefsQuery(userId) {
  if (!db) return null;
  try {
    const r = await db.query(
      `SELECT alerts_enabled, alert_min_priority, auto_speak_responses, voice_id, speed
       FROM voice_preferences WHERE user_id = $1`,
      [userId]
    );
    return r.rows[0] || null;
  } catch (e) {
    if (e.message?.includes('does not exist')) return null;
    throw e;
  }
}

router.get('/preferences', requireAuth, async (req, res) => {
  try {
    const row = await prefsQuery(req.user.id);
    res.json({
      ok: true,
      alerts_enabled: row?.alerts_enabled !== false,
      alert_min_priority: row?.alert_min_priority || 'P2',
      auto_speak_responses: row?.auto_speak_responses !== false,
      voice_id: row?.voice_id || 'nova',
      speed: row?.speed != null ? parseFloat(row.speed) : 0.98
    });
  } catch (err) {
    res.json({
      ok: true,
      alerts_enabled: true,
      alert_min_priority: 'P2',
      auto_speak_responses: true,
      voice_id: 'nova',
      speed: 0.98
    });
  }
});

router.put('/preferences', requireAuth, express.json(), async (req, res) => {
  if (!db) {
    return res.json({ ok: true, saved: false });
  }
  const b = req.body || {};
  try {
    const cur = await prefsQuery(req.user.id);
    const alerts_enabled = typeof b.alerts_enabled === 'boolean' ? b.alerts_enabled : cur?.alerts_enabled ?? true;
    const alert_min_priority = b.alert_min_priority || cur?.alert_min_priority || 'P2';
    const auto_speak_responses =
      typeof b.auto_speak_responses === 'boolean' ? b.auto_speak_responses : cur?.auto_speak_responses ?? true;
    const voice_id = b.voice_id || cur?.voice_id || 'nova';
    const speed =
      b.speed != null ? parseFloat(b.speed) : cur?.speed != null ? parseFloat(cur.speed) : 0.98;

    await db.query(
      `INSERT INTO voice_preferences (user_id, alerts_enabled, alert_min_priority, auto_speak_responses, voice_id, speed, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         alerts_enabled = EXCLUDED.alerts_enabled,
         alert_min_priority = EXCLUDED.alert_min_priority,
         auto_speak_responses = EXCLUDED.auto_speak_responses,
         voice_id = EXCLUDED.voice_id,
         speed = EXCLUDED.speed,
         updated_at = NOW()`,
      [req.user.id, alerts_enabled, alert_min_priority, auto_speak_responses, voice_id, speed]
    );
    res.json({ ok: true, saved: true });
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      return res.json({ ok: true, saved: false });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
