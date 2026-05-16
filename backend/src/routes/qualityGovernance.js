'use strict';

/**
 * Quality — Governance & Intelligence Runtime API (tenant-auth).
 * Flags: IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED (mestre)
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const flags = require('../domains/quality/governance/qualityGovernanceRuntimeFlags');
const orchestrator = require('../domains/quality/governance/qualityGovernanceOrchestrator');
const { runGovernanceAnalyticsPack } = require('../domains/quality/governance/analytics/qualityAnalyticsRuntime');
const { prioritizeByRpn } = require('../domains/quality/governance/risk/qualityRiskPrioritization');
const { buildSupplierScorecard } = require('../domains/quality/governance/supplier/qualitySupplierScorecard');
const { buildContextualStory } = require('../domains/quality/governance/executive/qualityContextualStorytelling');
const { buildOperationalInsightPack } = require('../domains/quality/governance/ai/qualityOperationalInsightEngine');
const { exploreImmutableChain } = require('../domains/quality/governance/audit/qualityImmutableAuditExplorer');
const { publishQualityIndustrialEvent } = require('../domains/quality/events/qualityEventPublisher');
const obs = require('../services/operational/enterpriseObservabilityRuntime');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    governance_enabled: flags.isQualityGovernanceRuntimeEnabled(),
    flags: flags.getGovernanceRuntimeFlagSnapshot()
  });
});

router.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!flags.isQualityGovernanceRuntimeEnabled()) {
    return res.status(503).json({ ok: false, code: 'QUALITY_GOVERNANCE_OFF' });
  }
  next();
});

router.post('/intelligence/spc/screen', async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(String(companyId))) {
      return res.status(403).json({ ok: false, error: 'company_required' });
    }
    const subgroups = req.body?.subgroups;
    if (!Array.isArray(subgroups) || !subgroups.length) {
      return res.status(400).json({ ok: false, error: 'subgroups_required' });
    }
    const corr = req.body.correlation_id || uuidv4();
    const r = await orchestrator.screenSubgroupsAndPublish(companyId, user.id, subgroups, { correlation_id: corr });
    res.json({ ok: true, correlation_id: corr, result: r });
  } catch (err) {
    console.error('[qualityGovernance/spc]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.post('/intelligence/drift/screen', async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(String(companyId))) {
      return res.status(403).json({ ok: false, error: 'company_required' });
    }
    const series = req.body?.series;
    if (!Array.isArray(series)) {
      return res.status(400).json({ ok: false, error: 'series_required' });
    }
    const corr = req.body.correlation_id || uuidv4();
    const r = await orchestrator.screenDriftAndPublish(companyId, user.id, series, {
      correlation_id: corr,
      slope_threshold_per_step: req.body.slope_threshold_per_step
    });
    res.json({ ok: true, correlation_id: corr, result: r });
  } catch (err) {
    console.error('[qualityGovernance/drift]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.post('/intelligence/fmea/rank', (req, res) => {
  try {
    if (!flags.isQualityRiskIntelligenceEnabled()) {
      return res.status(503).json({ ok: false, code: 'RISK_INTEL_OFF' });
    }
    const rows = req.body?.rows;
    if (!Array.isArray(rows)) return res.status(400).json({ ok: false, error: 'rows_required' });
    const threshold = req.body.threshold != null ? Number(req.body.threshold) : 100;
    res.json({ ok: true, result: prioritizeByRpn(rows, threshold) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.post('/intelligence/analytics-pack', (req, res) => {
  try {
    const t0 = Date.now();
    const pack = runGovernanceAnalyticsPack(req.body || {});
    try {
      obs.recordMetric('quality_governance_analytics_pack_ms', Date.now() - t0, {
        tenant: String(req.user?.company_id || '')
      });
    } catch (_e) {}
    res.json({ ok: true, pack });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.post('/intelligence/narrative', async (req, res) => {
  try {
    if (!flags.isQualityExecutiveExplainabilityEnabled()) {
      return res.status(503).json({ ok: false, code: 'EXEC_EXPLAIN_OFF' });
    }
    const t0 = Date.now();
    const story = buildContextualStory(req.body?.signals || {});
    try {
      obs.recordMetric('quality_governance_narrative_ms', Date.now() - t0, {
        tenant: String(req.user?.company_id || '')
      });
    } catch (_e) {}
    if (req.body?.emit_insight_event) {
      await publishQualityIndustrialEvent(
        {
          event_name: 'quality.executive.insight_generated',
          company_id: String(req.user.company_id),
          correlation_id: req.body.correlation_id || uuidv4(),
          payload: { narrative: story.narrative, bounded: true }
        },
        { origin_layer: 'governance', intended_audience: 'executive', user_id: req.user.id }
      ).catch(() => {});
    }
    res.json({ ok: true, story });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.post('/intelligence/insight-pack', (req, res) => {
  try {
    const pack = buildOperationalInsightPack(req.body || {});
    res.json({ ok: true, pack });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.post('/intelligence/supplier/scorecard', (req, res) => {
  try {
    if (!flags.isQualitySupplierAnalyticsEnabled()) {
      return res.status(503).json({ ok: false, code: 'SUPPLIER_OFF' });
    }
    const supplierId = req.body?.supplier_id || 'unknown';
    const rows = req.body?.rows || [];
    res.json({ ok: true, scorecard: buildSupplierScorecard(supplierId, rows) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.get('/audit/explore', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(String(companyId))) {
      return res.status(403).json({ ok: false, error: 'company_required' });
    }
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || '100', 10)));
    const chain = await exploreImmutableChain(companyId, limit);
    res.json({ ok: true, chain });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

module.exports = router;
