'use strict';

const express = require('express');
const router = express.Router();
const orchestrator = require('../enterprise-shadow-stabilization/enterpriseShadowStabilizationOrchestrator');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    framework: 'enterprise_shadow_stabilization',
    domains: ['quality', 'safety', 'logistics'],
    assistive_only: true,
    auto_promotion: false
  });
});

router.post('/usage/event', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const row = orchestrator.collectUsageEvent({
      ...body,
      tenant_id: body.tenant_id || user?.company_id
    });
    res.json({ ok: true, recorded: !!row });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/cycle', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const pack = orchestrator.runShadowStabilizationCycle({
      ...body,
      tenant_id: body.tenant_id || user?.company_id
    });
    res.json(pack);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

module.exports = router;
