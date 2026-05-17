'use strict';

/**
 * QUALITY — Ativação controlada / preview shadow (tenant-auth).
 */

const express = require('express');
const router = express.Router();

const runtime = require('../domains/quality/activation/qualityActivationRuntime');
const health = require('../domains/quality/activation/qualityPublicationHealthService');
const stability = require('../domains/quality/activation/qualityPublicationStabilityMonitor');
const audit = require('../domains/quality/activation/qualityActivationAudit');

router.get('/health', (req, res) => {
  res.json({ ok: true, assistive_only: true, no_authority: true });
});

router.get('/safe-checks', (req, res) => {
  try {
    const user = req.user;
    const tenantId = user?.company_id || null;
    const r = health.runSafeActivationChecks({
      tenantId,
      hasQualityIntelligenceModule: true
    });
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/shadow-preview', express.json(), (req, res) => {
  try {
    const out = runtime.runShadowPublicationPreview(req.body || {});
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.get('/orchestrate', (req, res) => {
  try {
    const user = req.user;
    const o = runtime.runActivationOrchestration({
      tenantId: user?.company_id || null,
      hasQualityIntelligenceModule: true
    });
    res.json({ ok: true, ...o });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.get('/stability', (req, res) => {
  res.json({ ok: true, ...stability.getStabilitySnapshot() });
});

router.get('/audit/recent', (req, res) => {
  res.json({ ok: true, entries: audit.listRecentActivationAudit(50) });
});

module.exports = router;
