'use strict';

/**
 * AI Governance APIs — Model Registry, AI Cards, Lineage, ISO 42001
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireHierarchy } = require('../middleware/auth');

router.get('/models', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const registry = require('../governance/aiModelRegistry');
    const models = await registry.listModels();
    res.json({ ok: true, models, diagnostics: registry.getDiagnostics() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/models/:modelKey/card', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const registry = require('../governance/aiModelRegistry');
    const modelKey = decodeURIComponent(req.params.modelKey);
    const entry = await registry.getModel(modelKey);
    if (!entry) return res.status(404).json({ ok: false, error: 'Model not found' });
    const card = await registry.buildAiCard({ provider: entry.provider, model: entry.model_id });
    res.json({ ok: true, model: entry, ai_card: card });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/lineage/:traceId', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const lineageSvc = require('../services/aiPromptLineageService');
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Tenant required' });
    const lineage = await lineageSvc.getLineageByTrace(req.params.traceId, companyId);
    if (!lineage) return res.status(404).json({ ok: false, error: 'Lineage not found' });
    res.json({ ok: true, lineage });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/traces/:traceId/card', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const db = require('../db');
    const registry = require('../governance/aiModelRegistry');
    const companyId = req.user?.company_id;
    const r = await db.query(
      `SELECT trace_id, module_name, model_info, data_classification, human_validation_status, created_at
       FROM ai_interaction_traces WHERE trace_id = $1 AND company_id = $2`,
      [req.params.traceId, companyId]
    );
    if (!r.rows[0]) return res.status(404).json({ ok: false, error: 'Trace not found' });
    const row = r.rows[0];
    const card = await registry.buildAiCard(row.model_info || {}, { trace_id: row.trace_id });
    res.json({
      ok: true,
      trace_id: row.trace_id,
      module_name: row.module_name,
      ai_card: card,
      governance_in_trace: row.model_info?.ai_governance || null,
      human_validation_status: row.human_validation_status,
      created_at: row.created_at,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/compliance/iso42001', requireAuth, requireHierarchy(2), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const gov = require('../services/aiGovernancePersistenceService');
    const companyId = req.query.company_id || req.user?.company_id;
    const report = await gov.getIso42001ReadinessReport(companyId);
    res.json(report);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/hallucination/:traceId', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const db = require('../db');
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Tenant required' });

    const r = await db.query(
      `SELECT trace_id, confidence_score, grounding_score, contradiction_score,
              semantic_valid, sz5_cross_check_passed, low_confidence_flag,
              requires_human_review, severity, indicators, explainability,
              governance_metadata, false_positive_marked, created_at
       FROM ai_hallucination_assessments
       WHERE trace_id = $1 AND company_id = $2`,
      [req.params.traceId, companyId]
    );
    if (!r.rows[0]) {
      return res.status(404).json({ ok: false, error: 'Assessment not found (shadow mode may not persist)' });
    }
    const assessment = r.rows[0];
    res.json({
      ok: true,
      assessment,
      mode: String(assessment.governance_metadata?.mode || 'unknown'),
    });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ ok: false, error: 'Schema not bootstrapped' });
    }
    res.status(500).json({ ok: false, error: err?.message });
  }
});

module.exports = router;
