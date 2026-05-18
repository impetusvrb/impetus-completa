'use strict';

const express = require('express');
const router = express.Router();
const orchestrator = require('../enterprise-ecosystem-consolidation/enterpriseEcosystemConsolidationOrchestrator');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    framework: 'enterprise_ecosystem_final_consolidation',
    domains: ['quality', 'safety', 'logistics'],
    pre_environment: true
  });
});

router.post('/consolidate', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const pack = orchestrator.runEcosystemFinalConsolidation({
      ...body,
      tenant_id: body.tenant_id || user?.company_id
    });
    res.json(pack);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.get('/environment-decision', (req, res) => {
  try {
    const user = req.user;
    const pack = orchestrator.runEcosystemFinalConsolidation({
      tenant_id: req.query.tenant_id || user?.company_id,
      run_soak: req.query.run_soak !== 'false',
      soak_dry_run: req.query.soak_dry_run === 'true'
    });
    res.json({
      ok: true,
      environment_decision: pack.environment_decision,
      ecmi: pack.cognitive_maturity_index?.enterprise_cognitive_maturity_index
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

module.exports = router;
