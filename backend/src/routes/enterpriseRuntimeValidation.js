'use strict';

const express = require('express');
const router = express.Router();
const orchestrator = require('../runtime-validation/enterpriseRuntimeValidationOrchestrator');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    framework: 'enterprise_runtime_validation',
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
      tenant_id: user?.company_id,
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
    const tenantId = req.user?.company_id;
    res.json({ ok: true, ...behavior.summarizeOperationalBehavior(tenantId) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/pack', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const pack = orchestrator.runEnterpriseValidationPack({
      ...body,
      tenant_id: user?.company_id
    });
    res.json(pack);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.get('/runtime/snapshot', (req, res) => {
  try {
    const engine = require('../runtime-validation/enterpriseRuntimeValidationEngine');
    res.json({ ok: true, ...engine.validateEnterpriseRuntime() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.get('/decision', (req, res) => {
  try {
    const user = req.user;
    const pack = orchestrator.runEnterpriseValidationPack({
      tenant_id: user?.company_id
    });
    res.json({
      ok: true,
      enterprise_decision: pack.enterprise_decision,
      controlled_rollout: pack.controlled_rollout,
      assistive_only: true
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

module.exports = router;
