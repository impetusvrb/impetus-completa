// ⚠️ ARQUIVADO — NÃO USAR EM PRODUÇÃO
// archived_at: 2026-04-28
// reason: Router HTTP legado nunca montado em impetus_complete/src/app.js; sustentáculo duplicado do stack oficial
// replacement: backend/src/ai/cognitiveOrchestrator.js + serviços IA em backend/src/services + /api/cognitive-council
// status: descontinuado
// nota: caminhos relativos supõem impetus_complete/backend/src/routes/ — serviço aiOrchestratorService.js permanece no legado (ainda em uso)

/**
 * Rotas da Tríade de IAs - AI_ORCHESTRATOR
 * /api/ai/claude/analyze - análise de dados (Claude)
 * /api/ai/gemini/analyze - análise multimodal (Gemini)
 * /api/ai/chat/query - chat orquestrado (ChatGPT + Claude/Gemini)
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const aiOrchestrator = require('../services/aiOrchestratorService');
const claudeService = require('../services/claudeService');
const geminiService = require('../services/geminiService');

/**
 * POST /api/ai/claude/analyze
 * Análise de dados estruturados (produção, manutenção, custos, KPIs)
 */
router.post('/claude/analyze', requireAuth, async (req, res) => {
  try {
    if (!claudeService.isAvailable()) {
      return res.status(503).json({ ok: false, error: 'Claude não configurado (ANTHROPIC_API_KEY)' });
    }
    const { prompt, data } = req.body;
    const input = prompt || (data ? JSON.stringify(data) : '');
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ ok: false, error: 'prompt ou data obrigatório' });
    }
    const analysis = await aiOrchestrator.consultClaude(input, { companyId: req.user?.company_id });
    if (!analysis) {
      return res.status(503).json({ ok: false, error: 'Falha na análise' });
    }
    res.json({ ok: true, analysis });
  } catch (err) {
    console.error('[AI_CLAUDE]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/ai/gemini/analyze
 * Análise multimodal (imagem base64, vídeo)
 */
router.post('/gemini/analyze', requireAuth, async (req, res) => {
  try {
    if (!geminiService.isAvailable()) {
      return res.status(503).json({ ok: false, error: 'Gemini não configurado (GEMINI_API_KEY)' });
    }
    const { imageBase64, prompt } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ ok: false, error: 'imageBase64 obrigatório' });
    }
    const analysis = await aiOrchestrator.consultGemini(
      imageBase64,
      prompt || 'Analise esta imagem e descreva.'
    );
    if (!analysis) {
      return res.status(503).json({ ok: false, error: 'Falha na análise' });
    }
    res.json({ ok: true, analysis });
  } catch (err) {
    console.error('[AI_GEMINI]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/ai/gemini/analyze-sensor
 * Análise de dados de sensores IoT via Gemini
 */
router.post('/gemini/analyze-sensor', requireAuth, async (req, res) => {
  try {
    if (!geminiService.isAvailable()) {
      return res.status(503).json({ ok: false, error: 'Gemini não configurado (GEMINI_API_KEY)' });
    }
    const { sensorData, context } = req.body;
    if (!sensorData) {
      return res.status(400).json({ ok: false, error: 'sensorData obrigatório' });
    }
    const result = await geminiService.analyzeSensorData?.(sensorData, context || {});
    if (!result) {
      return res.status(503).json({ ok: false, error: 'Falha na análise de sensores' });
    }
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[AI_GEMINI_SENSOR]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/ai/chat/query
 * Chat orquestrado: classifica pergunta, consulta Claude/Gemini, ChatGPT responde
 */
router.post('/chat/query', requireAuth, async (req, res) => {
  try {
    const { message, history = [], imageBase64 } = req.body;
    if (!message && !imageBase64) {
      return res.status(400).json({ ok: false, error: 'message ou imageBase64 obrigatório' });
    }
    const userName = req.user?.name || 'Usuário';
    const reply = await aiOrchestrator.processWithOrchestrator({
      message: message || '',
      history,
      imageBase64: imageBase64 || null,
      companyId: req.user?.company_id,
      userName
    });
    const isFallback = (reply || '').startsWith('FALLBACK:');
    res.json({
      ok: !isFallback,
      reply: isFallback ? 'Resposta temporariamente indisponível. Tente novamente.' : reply,
      fallback: isFallback ? reply : undefined
    });
  } catch (err) {
    console.error('[AI_CHAT_QUERY]', err.message);
    res.status(500).json({
      ok: false,
      error: err.message,
      fallback: 'Erro ao processar. Tente novamente.'
    });
  }
});

module.exports = router;
