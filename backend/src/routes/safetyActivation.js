'use strict';

const express = require('express');
const router = express.Router();
const runtime = require('../domains/safety/activation/safetyActivationRuntime');
const health = require('../domains/safety/activation/safetyPublicationHealthService');
const stability = require('../domains/safety/activation/safetyPublicationStabilityMonitor');
const audit = require('../domains/safety/activation/safetyActivationAudit');

router.get('/health', (req, res) => {
  res.json({ ok: true, domain: 'safety', assistive_only: true });
});

router.get('/safe-checks', (req, res) => {
  try {
    const user = req.user;
    const r = health.runSafeActivationChecks({
      tenantId: user?.company_id || null,
      hasSafetyIntelligenceModule: true
    });
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/shadow-preview', express.json(), (req, res) => {
  try {
    res.json(runtime.runShadowPublicationPreview(req.body || {}));
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.get('/orchestrate', (req, res) => {
  try {
    const user = req.user;
    const o = runtime.runActivationOrchestration({
      tenantId: user?.company_id || null,
      hasSafetyIntelligenceModule: true
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
