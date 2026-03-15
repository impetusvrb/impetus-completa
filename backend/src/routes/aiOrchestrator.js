/**
 * Rotas da Tríade de IAs - AI_ORCHESTRATOR
 * /api/ai/claude/analyze - análise de dados (Claude)
 * /api/ai/gemini/analyze - análise multimodal (Gemini)
 * /api/ai/chat/query - chat orquestrado
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const aiOrchestrator = require('../services/aiOrchestrator');

function safeRequire(modulePath, fallback = null) {
  try {
    return require(modulePath);
  } catch {
    return fallback;
  }
}
const claudeService = safeRequire('../services/claudeService');
const geminiService = safeRequire('../services/geminiService');

router.post('/claude/analyze', requireAuth, async (req, res) => {
  try {
    if (claudeService && !claudeService.isAvailable?.()) {
      return res.status(503).json({ ok: false, error: 'Claude não configurado (ANTHROPIC_API_KEY)' });
    }
    const { prompt, data } = req.body;
    const input = prompt || (data ? JSON.stringify(data) : '');
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ ok: false, error: 'prompt ou data obrigatório' });
    }
    const result = await aiOrchestrator.analyzeDataViaClaude(
      { data: typeof data === 'object' ? data : {}, context: {}, query: input },
      req.user?.company_id
    );
    if (!result || result.fallback) {
      return res.status(503).json({ ok: false, error: result?.error || 'Falha na análise' });
    }
    res.json({ ok: true, analysis: result });
  } catch (err) {
    console.error('[AI_CLAUDE]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/gemini/analyze', requireAuth, async (req, res) => {
  try {
    if (geminiService && !geminiService.isAvailable?.()) {
      return res.status(503).json({ ok: false, error: 'Gemini não configurado (GEMINI_API_KEY)' });
    }
    const { imageBase64, prompt } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ ok: false, error: 'imageBase64 obrigatório' });
    }
    const result = await aiOrchestrator.analyzeMultimodalViaGemini(
      { imageBase64, prompt: prompt || 'Analise esta imagem e descreva.' },
      req.user?.company_id
    );
    if (!result || result.fallback) {
      return res.status(503).json({ ok: false, error: result?.error || 'Falha na análise' });
    }
    res.json({ ok: true, analysis: result });
  } catch (err) {
    console.error('[AI_GEMINI]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/gemini/analyze-sensor', requireAuth, async (req, res) => {
  try {
    if (geminiService && !geminiService.isAvailable?.()) {
      return res.status(503).json({ ok: false, error: 'Gemini não configurado (GEMINI_API_KEY)' });
    }
    const { sensorData, context } = req.body;
    if (!sensorData) {
      return res.status(400).json({ ok: false, error: 'sensorData obrigatório' });
    }
    const result = await aiOrchestrator.analyzeMultimodalViaGemini(
      { sensorData, context: context || {} },
      req.user?.company_id
    );
    if (!result) {
      return res.status(503).json({ ok: false, error: 'Falha na análise de sensores' });
    }
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[AI_GEMINI_SENSOR]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/chat/query', requireAuth, async (req, res) => {
  try {
    const { message, history = [], imageBase64 } = req.body;
    if (!message && !imageBase64) {
      return res.status(400).json({ ok: false, error: 'message ou imageBase64 obrigatório' });
    }
    let reply = '';
    if (imageBase64 && geminiService?.isAvailable?.()) {
      const r = await aiOrchestrator.analyzeMultimodalViaGemini(
        { imageBase64, prompt: message || 'Descreva esta imagem.' },
        req.user?.company_id
      );
      reply = r?.descricao || r?.insights?.join?.(' ') || JSON.stringify(r) || 'Não foi possível analisar.';
    } else {
      const messages = Array.isArray(history) ? [...history] : [];
      if (message) messages.push({ role: 'user', content: message });
      const result = await aiOrchestrator.chatViaGPT(messages, {
        companyId: req.user?.company_id,
        query: message,
        consultOrchestrator: true
      });
      reply = typeof result === 'string' ? result : (result?.content || result?.text || '');
    }
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
