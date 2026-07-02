/**
 * CERT-PULSE-02 — Rotas aditivas do Pulse Cognitivo Organizacional.
 * Montagem: /api/pulse/cognitive (não altera rotas /api/pulse/* existentes).
 */
'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth, requireRhManagementAccess } = require('../middleware/auth');
const pulseCognitive = require('../services/pulseCognitive/pulseCognitiveService');
const pulseCalibration = require('../services/pulseCognitive/calibration/pulseCalibrationService');
const pulseMemory = require('../services/pulseCognitive/memory/organizationalMemoryFacade');
const { EVENT_TYPES, GOVERNANCE } = require('../services/pulseCognitive/constants');

const jsonBody = express.json({ limit: '256kb' });

function billingFromReq(req) {
  return { companyId: req.user?.company_id, userId: req.user?.id };
}

/** Metadados do framework (qualquer autenticado) */
router.get('/meta', requireAuth, (req, res) => {
  res.json({
    ok: true,
    framework: 'pulse_cognitive_organizational',
    cert: 'CERT-PULSE-05',
    governance: GOVERNANCE,
    monitored_events: EVENT_TYPES,
    legacy_compatible: true
  });
});

/** Dashboard cognitivo RH */
router.get('/hr/dashboard', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const data = await pulseCognitive.getDashboard(companyId, {
      days: parseInt(req.query.days, 10) || 90
    });
    res.json(data);
  } catch (e) {
    console.error('[PULSE_COGNITIVE_DASHBOARD]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Índice cognitivo de um colaborador (RH) */
router.get('/hr/subject/:userId', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const data = await pulseCognitive.getSubjectIndex(companyId, req.params.userId, null);
    res.json(data);
  } catch (e) {
    console.error('[PULSE_COGNITIVE_SUBJECT]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Compreensão IA organizacional (RH, assistiva) */
router.post('/hr/comprehension', requireAuth, requireRhManagementAccess, jsonBody, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const data = await pulseCognitive.generateComprehension(
      companyId,
      req.user.id,
      billingFromReq(req),
      req.body || {}
    );
    res.json(data);
  } catch (e) {
    console.error('[PULSE_COGNITIVE_COMPREHENSION]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Reconciliação silenciosa (RH) — varre colaboradores elegíveis */
router.post('/hr/reconcile', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const result = await pulseCognitive.triggerReconciliation(companyId);
    res.json({ ok: true, ...result, governance: GOVERNANCE });
  } catch (e) {
    console.error('[PULSE_COGNITIVE_RECONCILE]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Colaborador: próprio índice cognitivo (assistivo) */
router.get('/me/index', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const memberId = req.user.active_operational_team_member_id;
    const data =
      req.user.is_factory_team_account && memberId
        ? await pulseCognitive.getSubjectIndex(companyId, null, memberId)
        : await pulseCognitive.getSubjectIndex(companyId, req.user.id, null);
    res.json(data);
  } catch (e) {
    console.error('[PULSE_COGNITIVE_ME]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Ingestão interna de evento (RH) — extensível sem alterar rotas legadas */
router.post('/hr/events', requireAuth, requireRhManagementAccess, jsonBody, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const result = await pulseCognitive.ingestHumanEvent(companyId, {
      ...req.body,
      event_source: req.body?.event_source || 'rh_api'
    });
    res.json({ ...result, governance: GOVERNANCE });
  } catch (e) {
    console.error('[PULSE_COGNITIVE_EVENT]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-03 — Dashboard executivo integrado */
router.get('/hr/executive', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const data = await pulseCognitive.getExecutiveDashboard(companyId, {
      days: parseInt(req.query.days, 10) || 90
    });
    res.json(data);
  } catch (e) {
    console.error('[PULSE_COGNITIVE_EXECUTIVE]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-03 — Timeline cognitiva organizacional */
router.get('/hr/timeline', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const data = await pulseCognitive.getTimeline(companyId, {
      days: parseInt(req.query.days, 10) || 90,
      limit: parseInt(req.query.limit, 10) || 80
    });
    res.json(data);
  } catch (e) {
    console.error('[PULSE_COGNITIVE_TIMELINE]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-03 — Aprendizado temporal */
router.get('/hr/temporal', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const data = await pulseCognitive.getTemporalLearning(companyId, {
      userId: req.query.user_id || null,
      days: parseInt(req.query.days, 10) || 90
    });
    res.json({ ok: true, ...data, governance: GOVERNANCE });
  } catch (e) {
    console.error('[PULSE_COGNITIVE_TEMPORAL]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-03 — Correlação interdomínios */
router.get('/hr/cross-domain', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const data = await pulseCognitive.getCrossDomainInsights(companyId);
    res.json(data);
  } catch (e) {
    console.error('[PULSE_COGNITIVE_CROSS_DOMAIN]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-03 — Explicabilidade de inferência por colaborador */
router.get('/hr/explainability/:userId', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const data = await pulseCognitive.getExplainabilityForSubject(companyId, req.params.userId, null);
    res.json(data);
  } catch (e) {
    console.error('[PULSE_COGNITIVE_EXPLAINABILITY]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-03 — Status do scheduler de campanhas */
router.get('/hr/scheduler/status', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    res.json(pulseCognitive.getSchedulerStatus());
  } catch (e) {
    console.error('[PULSE_COGNITIVE_SCHEDULER_STATUS]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-04 — Auditoria das dimensões cognitivas */
router.get('/hr/calibration/audit', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    res.json(await pulseCalibration.getDimensionAudit());
  } catch (e) {
    console.error('[PULSE_CALIBRATION_AUDIT]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-04 — Simulações de calibração de pesos */
router.get('/hr/calibration/simulations', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    res.json(await pulseCalibration.getCalibrationSimulations());
  } catch (e) {
    console.error('[PULSE_CALIBRATION_SIM]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-04 — Dashboard de confiabilidade */
router.get('/hr/calibration/reliability', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    res.json(await pulseCalibration.getReliabilityDashboard(companyId));
  } catch (e) {
    console.error('[PULSE_CALIBRATION_RELIABILITY]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-04 — Insights com evidências explícitas */
router.get('/hr/calibration/insights', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    res.json(
      await pulseCalibration.getValidatedInsights(companyId, parseInt(req.query.limit, 10) || 50)
    );
  } catch (e) {
    console.error('[PULSE_CALIBRATION_INSIGHTS]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-04 — Relatório de falsos positivos */
router.get('/hr/calibration/false-positives', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    res.json(await pulseCalibration.getFalsePositiveReport(companyId));
  } catch (e) {
    console.error('[PULSE_CALIBRATION_FP]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-04 — Relatório de falsos negativos */
router.get('/hr/calibration/false-negatives', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    res.json(await pulseCalibration.getFalseNegativeReport(companyId));
  } catch (e) {
    console.error('[PULSE_CALIBRATION_FN]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-04 — Consistência temporal */
router.get('/hr/calibration/temporal-consistency', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    res.json(await pulseCalibration.getTemporalConsistencyReport(companyId));
  } catch (e) {
    console.error('[PULSE_CALIBRATION_TEMPORAL]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-04 — Alinhamento com eventos reais */
router.get('/hr/calibration/event-alignment', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    res.json(await pulseCalibration.getEventAlignmentReport(companyId));
  } catch (e) {
    console.error('[PULSE_CALIBRATION_ALIGN]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-04 — Explainability avançada */
router.get('/hr/calibration/explainability/:userId', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    res.json(await pulseCalibration.getAdvancedExplainability(companyId, req.params.userId, null));
  } catch (e) {
    console.error('[PULSE_CALIBRATION_EXPLAIN]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-04 — Relatório completo de calibração */
router.get('/hr/calibration/report', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    res.json(await pulseCalibration.getFullCalibrationReport(companyId));
  } catch (e) {
    console.error('[PULSE_CALIBRATION_REPORT]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-04 — Validação HITL de insight */
router.post(
  '/hr/calibration/insights/:insightId/validate',
  requireAuth,
  requireRhManagementAccess,
  jsonBody,
  async (req, res) => {
    try {
      const companyId = req.user.company_id;
      if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
      const result = await pulseCalibration.submitInsightValidation(
        companyId,
        req.user.id,
        req.params.insightId,
        req.body || {}
      );
      if (!result.ok) return res.status(result.migration_required ? 503 : 400).json(result);
      res.json(result);
    } catch (e) {
      console.error('[PULSE_CALIBRATION_VALIDATE]', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);

/** CERT-PULSE-04 — Histórico de validações HITL */
router.get('/hr/calibration/validations', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    res.json(await pulseCalibration.listInsightValidations(companyId));
  } catch (e) {
    console.error('[PULSE_CALIBRATION_VALIDATIONS]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-05 — Consulta à memória organizacional cognitiva */
router.get('/hr/memory/consult', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    res.json(
      await pulseMemory.consultMemory(companyId, {
        user_id: req.query.user_id || null,
        min_score: req.query.min_score,
        limit: req.query.limit
      })
    );
  } catch (e) {
    console.error('[PULSE_MEMORY_CONSULT]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-05 — Casos semelhantes */
router.get('/hr/memory/similar', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    res.json(
      await pulseMemory.searchSimilar(companyId, {
        user_id: req.query.user_id || null,
        min_score: req.query.min_score,
        limit: req.query.limit
      })
    );
  } catch (e) {
    console.error('[PULSE_MEMORY_SIMILAR]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-05 — Timeline organizacional consolidada (somente leitura) */
router.get('/hr/memory/timeline', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    res.json(
      await pulseMemory.getConsolidatedTimeline(companyId, {
        days: parseInt(req.query.days, 10) || 180,
        limit: parseInt(req.query.limit, 10) || 120
      })
    );
  } catch (e) {
    console.error('[PULSE_MEMORY_TIMELINE]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-05 — Auditoria de governança */
router.get('/hr/memory/governance', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    res.json(await pulseMemory.getGovernanceAudit(companyId || null));
  } catch (e) {
    console.error('[PULSE_MEMORY_GOV]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-05 — Contrato arquitetural (resumo) */
router.get('/hr/memory/contract', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    res.json(pulseMemory.getArchitectureContractSummary());
  } catch (e) {
    console.error('[PULSE_MEMORY_CONTRACT]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** CERT-PULSE-05 — Registrar decisão humana e resultado (memória consultiva) */
router.post('/hr/memory/outcome', requireAuth, requireRhManagementAccess, jsonBody, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const result = await pulseMemory.recordOutcome(companyId, req.body || {}, req.user.id);
    if (!result.ok) return res.status(result.migration_required ? 503 : 400).json(result);
    res.json(result);
  } catch (e) {
    console.error('[PULSE_MEMORY_OUTCOME]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
