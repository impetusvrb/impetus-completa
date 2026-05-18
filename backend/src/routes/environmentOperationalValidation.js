'use strict';

const express = require('express');
const router = express.Router();
const orchestrator = require('../domains/environment/analytics/environmentOperationalValidationOrchestrator');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    domain: 'environment',
    layer: 'operational_validation',
    assistive_only: true,
    auto_promotion: false
  });
});

router.post('/behavior/event', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const row = orchestrator.recordOperationalEvent({
      ...body,
      tenant_id: body.tenant_id || user?.company_id,
      user_id: body.user_id || user?.id
    });
    res.json({ ok: true, recorded: !!row });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.get('/behavior/summary', (req, res) => {
  try {
    const behavior = require('../runtime-validation/enterpriseOperationalBehaviorEngine');
    const tenantId = req.user?.company_id || req.query.tenant_id;
    res.json({ ok: true, ...behavior.summarizeOperationalBehavior(tenantId) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/pack', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const pack = orchestrator.runEnvironmentOperationalValidationPack({
      ...body,
      tenant_id: body.tenant_id || user?.company_id
    });
    res.json(pack);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

module.exports = router;
