'use strict';

/**
 * PROMPT 31 — Certification readiness API
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireHierarchy } = require('../middleware/auth');
const flags = require('../certificationReadiness/config/certificationReadinessFlags');
const facade = require('../certificationReadiness/facade/certificationReadinessFacade');
const audit = require('../certificationReadiness/observability/certificationReadinessAuditService');
const catalog = require('../certificationReadiness/catalog/frameworkCatalog');

router.get('/health', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, health: facade.getHealth() });
});

router.get('/frameworks', requireAuth, requireHierarchy(3), (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, frameworks: facade.listFrameworks(), controls: facade.listControls() });
});

router.post('/assess', requireAuth, requireHierarchy(2), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!flags.isCertificationReadinessActive()) {
    return res.status(503).json({ ok: false, error: 'inactive', mode: flags.certificationMode() });
  }
  try {
    const framework = req.body?.framework || req.query?.framework || null;
    const fwFilter =
      framework && Object.values(catalog.FRAMEWORKS).includes(framework) ? framework : null;
    const report = await facade.runFullReadinessAssessment(req.user?.company_id, fwFilter, {
      actorUserId: req.user?.id
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/assess/quick', requireAuth, requireHierarchy(3), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const collector = require('../certificationReadiness/collectors/evidenceInventoryCollector');
    const gapEngine = require('../certificationReadiness/engine/gapAnalysisEngine');
    const inventory = await collector.collectEvidenceInventory(req.user?.company_id);
    const gap = gapEngine.runGapAnalysis(inventory, req.query.framework || null);
    res.json({ ok: true, evidence_summary: { present: inventory.present_count, total: inventory.evidence_count }, gap_analysis: gap });
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
