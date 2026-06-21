'use strict';

const express = require('express');
const router = express.Router();
const orchestrator = require('../domains/safety/analytics/safetyOperationalValidationOrchestrator');
const pilotGov = require('../domains/safety/analytics/safetyPilotGovernanceRuntime');

router.get('/health', (req, res) => {
  res.json({ ok: true, domain: 'safety', layer: 'operational_validation', assistive_only: true });
});

router.post('/behavior/event', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const row = orchestrator.recordBehaviorEvent({
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
    const tenantId = req.user?.company_id;
    const summary = require('../domains/safety/analytics/safetyOperationalBehaviorAnalytics').summarizeBehavior(
      tenantId
    );
    res.json({ ok: true, ...summary });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/pack', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const pack = orchestrator.runOperationalValidationPack({
      ...body,
      tenant_id: user?.company_id
    });
    res.json(pack);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/pilot/scope', express.json(), (req, res) => {
  try {
    const r = pilotGov.registerPilotScope(req.body || {});
    res.json(r);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.get('/pilot/scopes', (req, res) => {
  try {
    const tenantId = req.user?.company_id;
    res.json({ ok: true, scopes: pilotGov.listPilotScopes(tenantId) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

module.exports = router;
