'use strict';

const express = require('express');
const router = express.Router();
const decisionEngine = require('../services/decisionEngineService');

// GET /api/decision-engine/criteria
router.get('/criteria', (req, res) => {
  res.json({
    weights: decisionEngine.CRITERIA_WEIGHTS,
    description: {
      people_safety: 'Segurança das pessoas — PRIORIDADE MÁXIMA (35%)',
      health_wellbeing: 'Saúde física e mental dos colaboradores (20%)',
      ethics_compliance: 'Ética e conformidade legal/normativa (15%)',
      financial: 'Proteção financeira da empresa (15%)',
      operational: 'Continuidade operacional (15%)',
    },
    principle: 'A melhor decisão não é a mais rápida ou a mais fácil, mas a que protege as pessoas, respeita a ética e gera o melhor resultado sustentável para a empresa.',
  });
});

// POST /api/decision-engine/analyze
router.post('/analyze', async (req, res) => {
  try {
    const { situation, context = {}, options } = req.body;
    if (!situation) {
      return res.status(400).json({ error: 'Campo "situation" é obrigatório.' });
    }

    const ctx = { ...context };
    if (options && Array.isArray(options) && options.length > 0) {
      ctx.options = options;
    }

    let aiService = null;
    try {
      const gemini = require('../services/geminiService');
      if (gemini && typeof gemini.generate === 'function') {
        aiService = gemini;
      }
    } catch (_) {}

    if (!aiService) {
      try {
        const claude = require('../services/claudeService');
        if (claude && typeof claude.generate === 'function') {
          aiService = claude;
        }
      } catch (_) {}
    }

    const result = await decisionEngine.analyzeWithAI(situation, ctx, aiService);

    res.json({
      success: true,
      engine: result.engine,
      timestamp: result.timestamp,
      situation: result.situation,
      decision: {
        chosen: result.chosen.label,
        justification: result.chosen.justification || result.chosen.reason,
        score: result.chosen._score,
        humanRisk: result.chosen.humanRisk,
      },
      options: result.options.map(o => ({
        label: o.label,
        reason: o.reason,
        score: o._score,
        humanRisk: o.humanRisk,
      })),
      explanation: result.explanation,
      aiEnhancement: result.aiEnhancement || null,
    });
  } catch (err) {
    console.error('[DECISION_ENGINE] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao processar decisão.', detail: err.message });
  }
});

module.exports = router;
