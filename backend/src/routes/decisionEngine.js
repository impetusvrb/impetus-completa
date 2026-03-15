/**
 * API do Motor de Decisão Inteligente IMPETUS
 * GET /api/decision-engine/criteria - Critérios e princípios
 * POST /api/decision-engine/analyze - Analisa situação e retorna decisão estruturada
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const intelligentDecisionEngine = require('../services/intelligentDecisionEngine');

router.get('/criteria', (req, res) => {
  res.json({
    principle: 'A melhor decisão não é a mais rápida ou a mais fácil, mas a que protege as pessoas, respeita a ética e gera o melhor resultado sustentável para a empresa.',
    criteria_order: intelligentDecisionEngine.CRITERIA_ORDER,
    weights: intelligentDecisionEngine.CRITERIA_WEIGHTS,
    description: {
      seguranca_pessoas: 'Segurança das pessoas — PRIORIDADE MÁXIMA (35%)',
      saude_colaboradores: 'Saúde física e mental dos colaboradores (20%)',
      etica_conformidade: 'Ética e conformidade legal/normativa (15%)',
      protecao_financeira: 'Proteção financeira da empresa (15%)',
      continuidade_operacional: 'Continuidade operacional (15%)'
    },
    framework_block: intelligentDecisionEngine.getDecisionFrameworkBlock()
  });
});

router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { situation, candidate_paths = [], context = {} } = req.body;
    if (!situation || typeof situation !== 'string') {
      return res.status(400).json({ error: 'Campo "situation" é obrigatório.' });
    }

    const ctx = { ...context, companyId: context.companyId || req.user?.company_id };

    const result = await intelligentDecisionEngine.evaluateDecision({
      situation: situation.trim(),
      candidatePaths: Array.isArray(candidate_paths) ? candidate_paths : [],
      context: ctx
    });

    res.json({
      ok: result.ok,
      problem_detected: result.problem_detected,
      options_analyzed: result.options_analyzed,
      chosen_path: result.chosen_path,
      reasoning: result.reasoning,
      transparent_explanation: result.transparent_explanation
    });
  } catch (err) {
    console.error('[DECISION_ENGINE]', err.message);
    res.status(500).json({ error: 'Erro ao processar decisão.', detail: err.message });
  }
});

router.post('/collaborative', requireAuth, async (req, res) => {
  try {
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
      transparent_explanation: result.transparent_explanation,
      options_analyzed: result.options_analyzed
    });
  } catch (err) {
    console.error('[DECISION_ENGINE_COLLABORATIVE]', err.message);
    res.status(500).json({ error: 'Erro ao processar decisão colaborativa.', detail: err.message });
  }
});

module.exports = router;
