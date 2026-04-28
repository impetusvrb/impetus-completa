/**
 * IMPETUS - IA Central da Indústria
 * Cérebro central: coleta, processa e distribui informações de todos os setores
 * Dados filtrados por cargo (CEO, Diretor, Gerente, Supervisor, Profissional)
 * Inclui: Motor de Decisão e resumo do Cérebro Operacional (sob /decision/* e /operational-brain/*)
 */
const express = require('express');
const router = express.Router();
const centralAI = require('../services/centralIndustryAIService');
const { requireAuth } = require('../middleware/auth');
const { heavyRouteLimiter } = require('../middleware/globalRateLimit');

let decisionEngine;
try {
  decisionEngine = require('../services/decisionEngineService');
} catch (err) {
  console.warn('[routes/centralIndustryAI][optional_require_decision_engine]', err?.message ?? err);
  decisionEngine = null;
}

let operationalBrain;
try {
  operationalBrain = require('../services/operationalBrainEngine');
} catch (err) {
  console.warn('[routes/centralIndustryAI][optional_require_operational_brain]', err?.message ?? err);
  operationalBrain = null;
}

let claudeService;
try {
  claudeService = require('../services/claudeService');
} catch (err) {
  console.warn('[routes/centralIndustryAI][optional_require_claude]', err?.message ?? err);
  claudeService = null;
}

function getCompanyId(req) {
  return req.user?.company_id;
}

/** Supervisor e acima podem usar POST /decision/analyze (bloqueia apenas profissional). */
function requireDecisionAnalyzeRole(req, res, next) {
  const level = centralAI.getRoleLevel(req.user);
  if (level === 'profissional') {
    return res.status(403).json({ ok: false, error: 'Análise de decisão restrita a supervisores e liderança.' });
  }
  next();
}

/**
 * GET /api/central-ai/intelligence
 * Inteligência central completa - alertas unificados, status dos setores, previsões (CEO/Diretor)
 */
router.get('/intelligence', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const payload = await centralAI.getCentralIntelligence(companyId, req.user);
    res.json({ ok: true, ...payload });
  } catch (err) {
    console.error('[CENTRAL_AI_INTELLIGENCE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar IA Central' });
  }
});

/**
 * GET /api/central-ai/alerts
 * Alertas unificados de todos os setores
 */
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const alerts = await centralAI.getUnifiedAlerts(companyId, req.user);
    res.json({ ok: true, alerts });
  } catch (err) {
    console.error('[CENTRAL_AI_ALERTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar alertas' });
  }
});

/**
 * GET /api/central-ai/sectors
 * Status consolidado por setor (RH, Produção, Almoxarifado, Qualidade, Logística, Manutenção)
 */
router.get('/sectors', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const sectors = await centralAI.getSectorStatus(companyId, req.user);
    res.json({ ok: true, sectors });
  } catch (err) {
    console.error('[CENTRAL_AI_SECTORS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar setores' });
  }
});

/**
 * GET /api/central-ai/predictions
 * Previsões estratégicas (apenas CEO e Diretores)
 */
router.get('/predictions', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const level = centralAI.getRoleLevel(req.user);
    if (level !== 'ceo' && level !== 'diretor') {
      return res.status(403).json({ ok: false, error: 'Previsões estratégicas restritas a CEO e Diretores' });
    }
    const predictions = await centralAI.getStrategicPredictions(companyId, req.user);
    res.json({ ok: true, predictions });
  } catch (err) {
    console.error('[CENTRAL_AI_PREDICTIONS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar previsões' });
  }
});

/**
 * GET /api/central-ai/insights
 * Insights consolidados cross-setor
 */
router.get('/insights', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const insights = await centralAI.getCentralInsights(companyId, req.user);
    res.json({ ok: true, insights });
  } catch (err) {
    console.error('[CENTRAL_AI_INSIGHTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar insights' });
  }
});

/**
 * GET /api/central-ai/operational-brain/summary
 * Resumo produção / manutenção / gestão, insights e alertas (Cérebro Operacional)
 */
router.get('/operational-brain/summary', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    if (!operationalBrain?.getOperationalSummary) {
      return res.status(503).json({ ok: false, error: 'Cérebro operacional indisponível' });
    }
    const summary = await operationalBrain.getOperationalSummary(companyId, {});
    res.json({ ok: true, summary, brain_enabled: !!operationalBrain.BRAIN_ENABLED });
  } catch (err) {
    console.error('[CENTRAL_AI_OP_BRAIN]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar resumo operacional' });
  }
});

/**
 * GET /api/central-ai/decision/criteria
 * Pesos e princípios do Motor de Decisão
 */
router.get('/decision/criteria', requireAuth, (req, res) => {
  if (!decisionEngine?.CRITERIA_WEIGHTS) {
    return res.status(503).json({ ok: false, error: 'Motor de decisão indisponível' });
  }
  res.json({
    ok: true,
    weights: decisionEngine.CRITERIA_WEIGHTS,
    description: {
      people_safety: 'Segurança das pessoas — PRIORIDADE MÁXIMA (35%)',
      health_wellbeing: 'Saúde física e mental dos colaboradores (20%)',
      ethics_compliance: 'Ética e conformidade legal/normativa (15%)',
      financial: 'Proteção financeira da empresa (15%)',
      operational: 'Continuidade operacional (15%)',
    },
    principle:
      'A melhor decisão equilibra proteção das pessoas, ética e resultado sustentável para a empresa.'
  });
});

/**
 * POST /api/central-ai/decision/analyze
 * Body: { situation, context?: { type, options? }, options? } — reforço opcional via Claude (generate)
 */
router.post(
  '/decision/analyze',
  requireAuth,
  requireDecisionAnalyzeRole,
  heavyRouteLimiter,
  async (req, res) => {
    if (!decisionEngine?.analyzeWithAI) {
      return res.status(503).json({ ok: false, error: 'Motor de decisão indisponível' });
    }
    try {
      const { situation, context = {}, options } = req.body || {};
      if (!situation || typeof situation !== 'string') {
        return res.status(400).json({ ok: false, error: 'Campo "situation" (texto) é obrigatório.' });
      }

      const ctx = { ...context };
      if (options && Array.isArray(options) && options.length > 0) {
        ctx.options = options;
      }

      const aiService =
        claudeService && typeof claudeService.generate === 'function' ? claudeService : null;

      const result = await decisionEngine.analyzeWithAI(situation.trim(), ctx, aiService);

      res.json({
        ok: true,
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
        options: result.options.map((o) => ({
          label: o.label,
          reason: o.reason,
          score: o._score,
          humanRisk: o.humanRisk,
        })),
        explanation: result.explanation,
        aiEnhancement: result.aiEnhancement || null,
      });
    } catch (err) {
      console.error('[CENTRAL_AI_DECISION]', err);
      res.status(500).json({ ok: false, error: err.message || 'Erro ao processar decisão' });
    }
  }
);

module.exports = router;
