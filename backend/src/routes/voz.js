/**
 * IMPETUS - API de voz (TTS via OpenAI)
 * POST /api/voz - gera áudio apenas quando falar=true
 */
const express = require('express');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const router = express.Router();

const transcreverUpload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 12 * 1024 * 1024 }
});
const { requireAuth } = require('../middleware/auth');
const { requireCompanyActive } = require('../middleware/multiTenant');
const { promptFirewall } = require('../middleware/promptFirewall');
const { userRateLimit } = require('../middleware/userRateLimit');
const openaiTts = require('../services/openaiVozService');
const impetusVoiceChat = require('../services/impetusVoiceChatService');

router.get('/status', requireAuth, async (req, res) => {
  try {
    const hasOpenAI = !!(process.env.OPENAI_API_KEY || '').trim();
    const bufOpenAI = hasOpenAI ? await openaiTts.gerarAudio('Ok') : null;

    return res.json({
      ok: true,
      openai: !!(bufOpenAI && bufOpenAI.length > 0),
    });
  } catch (e) {
    return res.json({ ok: true, openai: false, error: String(e?.message || e) });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { texto, falar } = req.body || {};
    if (!texto || falar !== true) {
      return res.json({ ok: true, audio: null });
    }

    const t = String(texto);
    const buffer = await openaiTts.gerarAudio(t);

    if (!buffer || buffer.length === 0) {
      console.warn('[VOZ] TTS falhou (OpenAI)');
      return res.status(502).json({
        ok: false,
        error: 'Serviço de voz indisponível. Verifique OPENAI_API_KEY.',
      });
    }

    const base64 = buffer.toString('base64');
    res.json({ ok: true, audio: base64 });
  } catch (e) {
    console.error('[VOZ]', e);
    res.status(500).json({ ok: false, error: 'Erro ao gerar áudio.' });
  }
});

/**
 * GET /api/voz/alertas
 * Não existe fonte operacional de alertas configurada para este endpoint.
 */
router.get('/alertas', requireAuth, (req, res) => {
  return res.status(503).json({
    ok: false,
    status: 'not_configured',
    code: 'VOICE_OPERATIONAL_SOURCE_NOT_CONFIGURED',
    alerta: null,
    mensagem: null
  });
});

/**
 * POST /api/voz/comando
 * Não processa comandos operacionais sem uma fonte de dados configurada.
 * Body: { comando: string, falar?: boolean }
 */
router.post('/comando', requireAuth, (req, res) => {
  return res.status(503).json({
    ok: false,
    status: 'not_configured',
    code: 'VOICE_OPERATIONAL_SOURCE_NOT_CONFIGURED',
    resposta: null,
    audio: null
  });
});

/**
 * POST /api/voz/transcrever
 * Áudio gravado no navegador → Whisper (OpenAI) → texto.
 * Funciona mesmo quando Web Speech API não responde (ex.: HTTP + IP).
 */
router.post(
  '/transcrever',
  requireAuth,
  requireCompanyActive,
  userRateLimit('ai_chat'),
  transcreverUpload.single('audio'),
  async (req, res) => {
    if (!req.file?.path) {
      return res.status(400).json({ ok: false, error: 'Nenhum áudio recebido.' });
    }
    const base = req.file.path;
    const webmPath = base + '.webm';
    try {
      try {
        fs.renameSync(base, webmPath);
      } catch {
        fs.copyFileSync(base, webmPath);
        try {
          fs.unlinkSync(base);
        } catch (unlinkErr) {
          console.warn('[routes/voz][cleanup_after_rename]', unlinkErr?.message ?? unlinkErr);
        }
      }
      const mediaProcessor = require('../services/mediaProcessorService');
      const out = await mediaProcessor.transcribeAudio(webmPath, { language: 'pt' });
      try {
        fs.unlinkSync(webmPath);
      } catch (unlinkErr) {
        console.warn('[routes/voz][cleanup_webm_after_transcribe]', unlinkErr?.message ?? unlinkErr);
      }
      if (!out.success || !String(out.text || '').trim()) {
        return res.status(502).json({
          ok: false,
          error: out.error || 'Não foi possível entender o áudio. Fale mais perto ou mais alto.'
        });
      }
      return res.json({ ok: true, text: String(out.text).trim() });
    } catch (e) {
      try {
        fs.unlinkSync(webmPath);
      } catch (unlinkErr) {
        console.warn('[routes/voz][cleanup_webm_on_error]', unlinkErr?.message ?? unlinkErr);
      }
      try {
        fs.unlinkSync(base);
      } catch (unlinkErr) {
        console.warn('[routes/voz][cleanup_base_on_error]', unlinkErr?.message ?? unlinkErr);
      }
      console.error('[VOZ_TRANSCREVER]', e);
      return res.status(500).json({ ok: false, error: 'Erro ao transcrever.' });
    }
  }
);

/**
 * POST /api/voz/conversa
 * Modo conversa Impetus IA: memória curta (servidor) + resposta + TTS OpenAI.
 * Body: { message: string, reset?: boolean, falar?: boolean }
 */
router.post(
  '/conversa',
  requireAuth,
  requireCompanyActive,
  promptFirewall,
  userRateLimit('ai_chat'),
  async (req, res) => {
    if (req.promptFirewall?.blocked) {
      return res.status(403).json({
        ok: false,
        error: req.promptFirewall.message || 'Conteúdo não permitido.',
        code: 'PROMPT_BLOCKED'
      });
    }
    try {
      const { message, reset, falar } = req.body || {};
      const out = await impetusVoiceChat.processVoiceTurn(req.user, message, {
        reset: !!reset
      });
      if (out.cleared) {
        return res.json({ ok: true, cleared: true, reply: '', audio: null });
      }
      const { reply, audio } = out;
      if (falar === false) {
        return res.json({ ok: true, reply, audio: null });
      }
      return res.json({
        ok: true,
        reply,
        audio: audio || null
      });
    } catch (e) {
      console.error('[VOZ_CONVERSA]', e);
      return res.status(500).json({
        ok: false,
        error: 'Erro no modo conversa.',
        reply: 'Algo deu errado. Tente de novo.',
        audio: null
      });
    }
  }
);

module.exports = router;
