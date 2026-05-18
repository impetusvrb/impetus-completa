'use strict';

const express = require('express');
const router = express.Router();
const flags = require('../domains/environment/governance/environmentGovernanceRuntimeFlags');
const orchestrator = require('../domains/environment/governance/environmentGovernanceOrchestrator');
const esg = require('../domains/environment/governance/esg/environmentEsgGovernanceRuntime');
const compliance = require('../domains/environment/governance/compliance/environmentComplianceRuntime');
const carbon = require('../domains/environment/governance/carbon/environmentCarbonRuntime');
const energy = require('../domains/environment/governance/energy/environmentEnergyRuntime');
const sustainability = require('../domains/environment/governance/sustainability/environmentSustainabilityRuntime');
const validation = require('../domains/environment/governance/validation/environmentGovernanceValidationRuntime');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    domain: 'environment',
    layer: 'governance',
    governance_enabled: flags.isEnvironmentGovernanceRuntimeEnabled(),
    flags: flags.getGovernanceRuntimeFlagSnapshot(),
    assistive_only: true
  });
});

router.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!flags.isEnvironmentGovernanceRuntimeEnabled()) {
    return res.status(503).json({ ok: false, code: 'ENVIRONMENT_GOVERNANCE_OFF' });
  }
  next();
});

router.post('/intelligence/pack', express.json(), (req, res) => {
  try {
    res.json(orchestrator.runEnvironmentGovernancePack({ body: req.body || {} }));
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/intelligence/esg/evaluate', express.json(), (req, res) => {
  try {
    res.json({ ok: true, result: esg.environmentEsgGovernanceRuntime(req.body || {}) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/intelligence/compliance/screen', express.json(), (req, res) => {
  try {
    res.json({ ok: true, result: compliance.environmentComplianceRuntime(req.body || {}) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/intelligence/carbon/inventory', express.json(), (req, res) => {
  try {
    res.json({ ok: true, result: carbon.environmentCarbonRuntime(req.body || {}) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/intelligence/energy/efficiency', express.json(), (req, res) => {
  try {
    res.json({ ok: true, result: energy.environmentEnergyRuntime(req.body || {}) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/intelligence/sustainability/maturity', express.json(), (req, res) => {
  try {
    res.json({ ok: true, result: sustainability.environmentSustainabilityRuntime(req.body || {}) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/validation/governance', express.json(), (req, res) => {
  try {
    const user = req.user;
    res.json(
      validation.runEnvironmentGovernanceRuntimeValidation({
        ...req.body,
        tenant_id: req.body?.tenant_id || user?.company_id
      })
    );
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

module.exports = router;
