'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

function safeRequire(path) {
  try { return require(path); } catch (_) { return null; }
}

const intelligentDecisionEngine = safeRequire('../services/intelligentDecisionEngine');
const decisionEngineService = safeRequire('../services/decisionEngineService');

// GET /api/decision-engine/criteria
router.get('/criteria', (req, res) => {
  if (intelligentDecisionEngine) {
    return res.json({
      principle: 'A melhor decisão não é a mais rápida ou a mais fácil, mas a que protege as pessoas, respeita a ética e gera o melhor resultado sustentável para a empresa.',
      criteria_order: intelligentDecisionEngine.CRITERIA_ORDER,
      weights: intelligentDecisionEngine.CRITERIA_WEIGHTS,
      description: {
        seguranca_pessoas: 'Segurança das pessoas — PRIORIDADE MÁXIMA (35%)',
        saude_colaboradores: 'Saúde física e mental dos colaboradores (20%)',
        etica_conformidade: 'Ética e conformidade legal/normativa (15%)',
        protecao_financeira: 'Proteção financeira da empresa (15%)',
        continuidade_operacional: 'Continuidade operacional (15%)'
      }
    });
  }
  if (decisionEngineService) {
    return res.json({
      weights: decisionEngineService.CRITERIA_WEIGHTS,
      description: {
        people_safety: 'Segurança das pessoas — PRIORIDADE MÁXIMA (35%)',
        health_wellbeing: 'Saúde física e mental dos colaboradores (20%)',
        ethics_compliance: 'Ética e conformidade legal/normativa (15%)',
        financial: 'Proteção financeira da empresa (15%)',
        operational: 'Continuidade operacional (15%)'
      },
      principle: 'A melhor decisão não é a mais rápida ou a mais fácil, mas a que protege as pessoas, respeita a ética e gera o melhor resultado sustentável para a empresa.'
    });
  }
  res.status(503).json({ error: 'Motor de Decisão não disponível.' });
});

// POST /api/decision-engine/analyze - Motor de Decisão Inteligente
router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { situation, candidate_paths = [], context = {}, options } = req.body;
    if (!situation || typeof situation !== 'string') {
      return res.status(400).json({ error: 'Campo "situation" é obrigatório.' });
    }

    const ctx = { ...context, companyId: context.companyId || req.user?.company_id };
    const paths = Array.isArray(candidate_paths) && candidate_paths.length > 0
      ? candidate_paths
      : (Array.isArray(options) ? options.map(o => o.label || o) : []);

    if (intelligentDecisionEngine) {
      const result = await intelligentDecisionEngine.evaluateDecision({
        situation: situation.trim(),
        candidatePaths: paths,
        context: ctx
      });
      return res.json({
        ok: result.ok,
        problem_detected: result.problem_detected,
        options_analyzed: result.options_analyzed,
        chosen_path: result.chosen_path,
        reasoning: result.reasoning,
        transparent_explanation: result.transparent_explanation
      });
    }

    if (decisionEngineService) {
      let aiService = null;
      try {
        const gemini = require('../services/geminiService');
        if (gemini?.generate) aiService = gemini;
      } catch (_) {}
      if (!aiService) {
        try {
          const claude = require('../services/claudeService');
          if (claude?.generate) aiService = claude;
        } catch (_) {}
      }
      const result = await decisionEngineService.analyzeWithAI(situation, { ...ctx, options: paths.map(p => (typeof p === 'string' ? { label: p } : p)) }, aiService);
      return res.json({
        success: true,
        situation: result.situation,
        decision: { chosen: result.chosen?.label, justification: result.chosen?.justification },
        options: result.options,
        explanation: result.explanation
      });
    }

    res.status(503).json({ error: 'Motor de Decisão não disponível.' });
  } catch (err) {
    console.error('[DECISION_ENGINE]', err.message);
    res.status(500).json({ error: 'Erro ao processar decisão.', detail: err.message });
  }
});

// POST /api/decision-engine/collaborative - Decisão entre múltiplas IAs
router.post('/collaborative', requireAuth, async (req, res) => {
  try {
    if (!intelligentDecisionEngine?.collaborativeEvaluate) {
      return res.status(503).json({ error: 'Decisão colaborativa não disponível.' });
    }
    const { situation, perspectives = [], context = {} } = req.body;
    if (!situation || typeof situation !== 'string') {
      return res.status(400).json({ error: 'Campo "situation" é obrigatório.' });
    }
    const ctx = { ...context, companyId: context.companyId || req.user?.company_id };
    const result = await intelligentDecisionEngine.collaborativeEvaluate({
      situation: situation.trim(),
      perspectives: Array.isArray(perspectives) ? perspectives : [],
      context: ctx
    });
    res.json({
      ok: result.ok,
      chosen_path: result.chosen_path,
      reasoning: result.reasoning,
      transparent_explanation: result.transparent_explanation
    });
  } catch (err) {
    console.error('[DECISION_ENGINE_COLLABORATIVE]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
