'use strict';

/**
 * PROMPT 32 — Final consolidation audit API
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireHierarchy } = require('../middleware/auth');
const flags = require('../finalConsolidationAudit/config/finalConsolidationAuditFlags');
const facade = require('../finalConsolidationAudit/facade/finalConsolidationAuditFacade');
const audit = require('../finalConsolidationAudit/observability/finalConsolidationAuditAuditService');

router.get('/health', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, health: facade.getHealth() });
});

router.get('/prompts', requireAuth, requireHierarchy(3), (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, prompts: facade.listPrompts(), mode: flags.consolidationAuditMode() });
});

router.post('/audit', requireAuth, requireHierarchy(2), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!flags.isFinalConsolidationAuditActive()) {
    return res.status(503).json({ ok: false, error: 'inactive', mode: flags.consolidationAuditMode() });
  }
  try {
    const report = await facade.runFullConsolidationAudit(req.user?.company_id, {
      actorUserId: req.user?.id
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/audit/quick', requireAuth, requireHierarchy(3), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const evidence = await require('../finalConsolidationAudit/collectors/runtimeEvidenceCollector').collectRuntimeEvidence(
      req.user?.company_id
    );
    const pv = require('../finalConsolidationAudit/engine/promptValidationEngine').validateAllPrompts(evidence);
    res.json({
      ok: true,
      production_on_pct: pv.production_on_pct,
      production_on_count: pv.production_on_count,
      shadow_count: pv.shadow_count,
      prompts: pv.prompts.map((p) => ({ id: p.prompt_id, code: p.code, status: p.status, production_on: p.production_on }))
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/snapshots', requireAuth, requireHierarchy(2), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const items = await audit.listSnapshots(req.user?.company_id, req.query.limit);
    res.json({ ok: true, items, count: items.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

module.exports = router;
