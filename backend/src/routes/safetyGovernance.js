'use strict';

const express = require('express');
const router = express.Router();
const flags = require('../domains/safety/governance/safetyGovernanceRuntimeFlags');
const orchestrator = require('../domains/safety/governance/safetyGovernanceOrchestrator');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    domain: 'safety',
    governance_enabled: flags.isSafetyGovernanceRuntimeEnabled(),
    flags: flags.getGovernanceRuntimeFlagSnapshot()
  });
});

router.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!flags.isSafetyGovernanceRuntimeEnabled()) {
    return res.status(503).json({ ok: false, code: 'SAFETY_GOVERNANCE_OFF' });
  }
  next();
});

router.post('/intelligence/risk-matrix/evaluate', (req, res) => {
  try {
    const rows = req.body?.rows;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ ok: false, error: 'rows_required' });
    }
    const r = orchestrator.screenRiskMatrix(rows);
    res.json({ ok: true, result: r });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.post('/intelligence/ghe/summary', (req, res) => {
  try {
    const groups = req.body?.groups;
    const r = orchestrator.screenGheSummary(groups);
    res.json({ ok: true, result: r });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

module.exports = router;
