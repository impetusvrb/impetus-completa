'use strict';

const express = require('express');
const router = express.Router();
const orchestrator = require('../enterprise-pilot-rollout/enterprisePilotRolloutOrchestrator');
const gov = require('../enterprise-pilot-rollout/rolloutGovernanceRuntime');

router.get('/health', (req, res) => {
  res.json({ ok: true, framework: 'enterprise_pilot_rollout', auto_promotion: false, full_rollout: false });
});

router.post('/prepare', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    res.json(
      orchestrator.runPilotRolloutPreparation({
        ...body,
        tenant_id: user?.company_id
      })
    );
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/metrics/event', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    orchestrator.recordPilotMetric(user?.company_id, body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/governance/freeze', express.json(), (req, res) => {
  res.json(gov.freezeTenant(req.body?.tenant_id || req.user?.company_id, req.body?.reason));
});

router.post('/governance/pause', express.json(), (req, res) => {
  res.json(gov.pauseRollout(req.body?.tenant_id || req.user?.company_id, req.body?.reason));
});

router.post('/governance/rollback', express.json(), (req, res) => {
  res.json(gov.rollbackTenant(req.body?.tenant_id || req.user?.company_id));
});

router.post('/governance/rollback-audience', express.json(), (req, res) => {
  res.json(gov.rollbackAudience(req.body?.tenant_id || req.user?.company_id));
});

router.post('/governance/advance-wave', express.json(), (req, res) => {
  res.json(gov.advancePilotWave(req.body?.tenant_id || req.user?.company_id));
});

module.exports = router;
