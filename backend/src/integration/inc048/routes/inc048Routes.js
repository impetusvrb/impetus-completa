'use strict';

const express = require('express');
const router = express.Router();
const { isInc048Enabled, snapshot: inc048Flags } = require('../inc048FeatureFlags');
const { getConvergenceSnapshot, runInc048Convergence, validateCrossDomain } = require('../inc048IntegrationRuntime');
const { getInc048ObservabilitySnapshot } = require('../inc048Observability');

function requireInc048Enabled(req, res, next) {
  if (isInc048Enabled() || req.headers['x-inc048-test'] === '1') return next();
  return res.status(503).json({
    ok: false,
    error: 'inc048_disabled',
    phase: 'INC-048',
    hint: 'IMPETUS_INC048_ENABLED=false (fail-closed)'
  });
}

router.get('/health', requireInc048Enabled, (req, res) => {
  res.json({
    ok: true,
    phase: 'INC-048',
    status: 'convergence',
    flags: inc048Flags(),
    snapshot: getConvergenceSnapshot()
  });
});

router.get('/matrix', requireInc048Enabled, (req, res) => {
  const snap = getConvergenceSnapshot();
  res.json({ ok: true, phase: 'INC-048', matrix: snap.matrix });
});

router.get('/validate', requireInc048Enabled, async (req, res) => {
  try {
    const result = await validateCrossDomain({ force_inc048: req.headers['x-inc048-test'] === '1' });
    res.json({ ok: result.valid, phase: 'INC-048', ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, phase: 'INC-048' });
  }
});

router.post('/converge', requireInc048Enabled, express.json(), async (req, res) => {
  try {
    const result = await runInc048Convergence({
      force_inc048: req.headers['x-inc048-test'] === '1',
      ...req.body
    });
    res.json({ ok: result.ok !== false, phase: 'INC-048', ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, phase: 'INC-048' });
  }
});

router.get('/observability', requireInc048Enabled, (req, res) => {
  res.json({ ok: true, phase: 'INC-048', entries: getInc048ObservabilitySnapshot(100) });
});

module.exports = router;
