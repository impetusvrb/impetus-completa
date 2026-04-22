/**
 * Voz do chat — Whisper STT, OpenAI TTS, preferências
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
const googleTtsCore = require('../services/googleTtsCore');
const ttsWelcomeTemplate = require('../services/ttsWelcomeTemplate');

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
const MIN_MP3_BYTES = 1500;

function cleanTtsInput(text) {
  return String(text || '')
    .replace(/[*_`#]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4096);
}

const db = require('../db');
const billingTokenService = require('../services/billingTokenService');
const humanValidationClosureService = require('../services/humanValidationClosureService');

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
    let billQty = 0;
    if (result.success && req.user?.company_id) {
      try {
        const st = fs.statSync(transcribePath);
        billQty = Math.max(1, Math.round(st.size / 8000));
      } catch (_) {}
    }
    fs.unlink(transcribePath, () => {});
    if (!result.success) {
      return res.status(422).json({
        ok: false,
        transcript: '',
        confidence: 0,
        error: result.error || 'Transcrição falhou'
      });
    }
    if (billQty && result.text) {
      billingTokenService.registrarUsoSafe(req.user.company_id, req.user.id, 'outro', billQty);
    }
    if (result.text && String(result.text).trim()) {
      humanValidationClosureService
        .tryClosePendingValidation({
          user: req.user,
          utterance: result.text,
          modality: 'VOICE'
        })
        .catch(() => {});
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
  if (!rateLimit(String(req.user.id) + ':tts', 60, 60 * 1000)) {
    return res.status(429).json({ ok: false, error: 'Limite TTS. Aguarde.' });
  }
  if (!voiceTts.getTtsAvailable()) {
    return res.status(503).json({
      ok: false,
      error: 'TTS indisponível (Google: config/google-tts.json ou OpenAI no .env)'
    });
  }
  const text = cleanTtsInput(req.body.text);
  if (!text) {
    return res.status(400).json({ ok: false, error: 'Texto vazio' });
  }
  const userDisplayName = voiceTts.firstNameFromDisplay(
    String(req.body.userDisplayName || req.user?.name || '').trim()
  );
  const voice = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(req.body.voice)
    ? req.body.voice
    : 'nova';
  const defSp = parseFloat(process.env.OPENAI_TTS_DEFAULT_SPEED) || 1.02;
  const speed = Math.min(1.25, Math.max(0.75, parseFloat(req.body.speed) || defSp));
  const effective = voiceTts.getEffectiveTtsConfig({ voice, speed });
  const engineTag = voiceTts.ttsEngineFingerprint();
  const sentimentContext = req.body?.sentimentContext || null;

  const hash = crypto
    .createHash('sha256')
    .update(
      text +
        userDisplayName +
        effective.voice +
        effective.speed +
        engineTag +
        JSON.stringify(sentimentContext || {})
    )
    .digest('hex');
  const cached = ttsCache.get(hash);
  if (cached && Date.now() < cached.exp) {
    res.setHeader('Content-Type', 'audio/mpeg');
    // Evita reutilização pelo browser em testes de voz (Wavenet/Neural/etc).
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-TTS-Engine', engineTag);
    if (voiceTts.usesGoogleCloudTts()) res.setHeader('X-TTS-Voice-Google', googleTtsCore.getVoiceName());
    return res.send(cached.buf);
  }

  try {
    const buf = await voiceTts.synthesizeMp3(text, {
      voice: effective.voice,
      speed: effective.speed,
      sentimentContext,
      userDisplayName: userDisplayName || undefined
    });
    if (!buf || buf.length < MIN_MP3_BYTES) {
      return res.status(502).json({ ok: false, error: 'TTS falhou' });
    }
    ttsCache.set(hash, { buf, exp: Date.now() + TTS_TTL_MS });
    if (ttsCache.size > 200) {
      [...ttsCache.entries()].filter(([, v]) => Date.now() > v.exp).forEach(([k]) => ttsCache.delete(k));
    }
    if (req.user?.company_id && text.length) {
      billingTokenService.registrarUsoSafe(req.user.company_id, req.user.id, 'tts', text.length, 'chars');
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    // Evita reutilização pelo browser em testes de voz (Wavenet/Neural/etc).
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-TTS-Engine', engineTag);
    if (voiceTts.usesGoogleCloudTts()) res.setHeader('X-TTS-Voice-Google', googleTtsCore.getVoiceName());
    res.send(buf);
  } catch (err) {
    console.warn('[CHAT_VOICE speak]', err.message);
    res.status(502).json({ ok: false, error: err.message || 'TTS falhou' });
  }
});

/**
 * Boas-vindas com SSML multi-prosody (template Impetus + Chirp3).
 * Body: { variant?: 'full'|'short', userDisplayName?, speed?, spellName?: boolean }
 */
router.post('/welcome', requireAuth, express.json({ limit: '8kb' }), async (req, res) => {
  if (!rateLimit(String(req.user.id) + ':tts:welcome', 20, 60 * 1000)) {
    return res.status(429).json({ ok: false, error: 'Limite TTS. Aguarde.' });
  }
  if (!voiceTts.getTtsAvailable()) {
    return res.status(503).json({
      ok: false,
      error: 'TTS indisponível (Google: config/google-tts.json ou OpenAI no .env)'
    });
  }
  const userDisplayName = voiceTts.firstNameFromDisplay(
    String(req.body.userDisplayName || req.user?.name || '').trim()
  );
  const variant = req.body.variant === 'short' ? 'short' : 'full';
  const spellWelcome =
    typeof req.body.spellName === 'boolean'
      ? req.body.spellName
      : process.env.GOOGLE_TTS_WELCOME_SPELL_NAME === 'true';
  const voice = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(req.body.voice)
    ? req.body.voice
    : 'nova';
  const defSp = parseFloat(process.env.OPENAI_TTS_DEFAULT_SPEED) || 1.02;
  const speed = Math.min(1.25, Math.max(0.75, parseFloat(req.body.speed) || defSp));
  const effective = voiceTts.getEffectiveTtsConfig({ voice, speed });
  const engineTag = voiceTts.ttsEngineFingerprint();
  const welcomeOpts = { variant, spellName: spellWelcome };
  const welcomeInput = voiceTts.usesGoogleCloudTts()
    ? ttsWelcomeTemplate.buildWelcomeSsml(userDisplayName, welcomeOpts)
    : ttsWelcomeTemplate.buildWelcomePlainText(userDisplayName, welcomeOpts);

  const hash = crypto
    .createHash('sha256')
    .update(
      `welcome:${variant}:${spellWelcome}:${userDisplayName}:${effective.voice}:${effective.speed}:${engineTag}`
    )
    .digest('hex');
  const cached = ttsCache.get(hash);
  if (cached && Date.now() < cached.exp) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-TTS-Engine', engineTag);
    res.setHeader('X-TTS-Template', `welcome:${variant}`);
    if (voiceTts.usesGoogleCloudTts()) res.setHeader('X-TTS-Voice-Google', googleTtsCore.getVoiceName());
    return res.send(cached.buf);
  }

  try {
    const buf = await voiceTts.synthesizeMp3(welcomeInput, {
      voice: effective.voice,
      speed: effective.speed,
      userDisplayName: undefined
    });
    if (!buf || buf.length < MIN_MP3_BYTES) {
      return res.status(502).json({ ok: false, error: 'TTS falhou' });
    }
    ttsCache.set(hash, { buf, exp: Date.now() + TTS_TTL_MS });
    if (ttsCache.size > 200) {
      [...ttsCache.entries()].filter(([, v]) => Date.now() > v.exp).forEach(([k]) => ttsCache.delete(k));
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-TTS-Engine', engineTag);
    res.setHeader('X-TTS-Template', `welcome:${variant}`);
    if (voiceTts.usesGoogleCloudTts()) res.setHeader('X-TTS-Voice-Google', googleTtsCore.getVoiceName());
    res.send(buf);
  } catch (err) {
    console.warn('[CHAT_VOICE welcome]', err.message);
    res.status(502).json({ ok: false, error: err.message || 'TTS falhou' });
  }
});

router.get('/debug', requireAuth, (req, res) => {
  const defaultVoice = 'nova';
  const defaultSpeed = parseFloat(process.env.OPENAI_TTS_DEFAULT_SPEED) || 1.02;
  const effective = voiceTts.getEffectiveTtsConfig({ voice: defaultVoice, speed: defaultSpeed });
  return res.json({
    ok: true,
    tts: {
      ...effective,
      openai_available: voiceTts.getTtsAvailable(),
      tts_provider: voiceTts.usesGoogleCloudTts() ? 'google' : 'openai',
      tts_engine: voiceTts.ttsEngineFingerprint()
    }
  });
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
Varie o início entre confirmação curta ("Atenção", "Alerta", "Registro") — nunca use sempre a mesma palavra de abertura. Última frase com tom de conclusão.

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
      speed: row?.speed != null ? parseFloat(row.speed) : 1.02
    });
  } catch (err) {
    res.json({
      ok: true,
      alerts_enabled: true,
      alert_min_priority: 'P2',
      auto_speak_responses: true,
      voice_id: 'nova',
      speed: 1.02
    });
  }
});

router.put('/preferences', requireAuth, express.json(), async (req, res) => {
  const b = req.body || {};
  try {
    const cur = await prefsQuery(req.user.id);
    const alerts_enabled = typeof b.alerts_enabled === 'boolean' ? b.alerts_enabled : cur?.alerts_enabled ?? true;
    const alert_min_priority = b.alert_min_priority || cur?.alert_min_priority || 'P2';
    const auto_speak_responses =
      typeof b.auto_speak_responses === 'boolean' ? b.auto_speak_responses : cur?.auto_speak_responses ?? true;
    const voice_id = b.voice_id || cur?.voice_id || 'nova';
    const speed =
      b.speed != null ? parseFloat(b.speed) : cur?.speed != null ? parseFloat(cur.speed) : 1.02;

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
