'use strict';

const express = require('express');
const router = express.Router();

const flags = require('../runtime-z-maturation/config/sz3FeatureFlags');
const facade = require('../runtime-z-maturation/facade/zMaturationFacade');
const { matchPatterns } = require('../runtime-z-maturation/patterns/zPatternMatchRuntime');
const { topPatterns } = require('../runtime-z-maturation/patterns/zPatternObservationRuntime');
const { all: allLibrary } = require('../runtime-z-maturation/patterns/zPatternLibraryRuntime');
const { calibrateScores } = require('../runtime-z-maturation/calibration/zInferenceCalibrationRuntime');
const { matchScenario } = require('../runtime-z-maturation/industrial/zIndustrialScenarioMatcher');

function _guard(req, res, next) {
  if (!flags.isApiEnabled()) return res.status(503).json({ ok: false, code: 'SZ3_API_DISABLED' });
  if (!req.user) return res.status(401).json({ ok: false, code: 'AUTH_REQUIRED' });
  return next();
}

router.get('/', _guard, (req, res) => {
  res.json({ ok: true, runtime: 'runtime-z-maturation', phase: 'SZ3', stage: facade.resolveStage(req.user.company_id), invariants: flags.invariants });
});

router.get('/patterns', _guard, (req, res) => {
  const tenantId = req.user.company_id;
  res.json({
    ok: true,
    learned: topPatterns(tenantId, 20),
    library_size: allLibrary().length
  });
});

router.get('/calibration', _guard, (req, res) => {
  const tenantId = req.user.company_id;
  const message = req.query.message || '';
  const pm = matchPatterns(tenantId, message, []);
  const calibration = calibrateScores(tenantId, {}, pm);
  res.json({ ok: true, calibration, pattern_match: pm });
});

router.get('/scenario', _guard, (req, res) => {
  const message = req.query.message || '';
  const scenario = matchScenario(message, {});
  res.json({ ok: true, scenario });
});

router.get('/observability', _guard, (_req, res) => {
  res.json({ ok: true, observability: facade.observability.snapshot() });
});

router.post('/apply', _guard, (req, res) => {
  try {
    const sz2Payload = req.body?.sz2_payload || {};
    const message = req.body?.message || '';
    const out = facade.applyMaturation(req.user, sz2Payload, {
      tenant_id: req.user.company_id,
      profile: req.user.role_code || req.user.role,
      message
    });
    res.json({ ok: out.ok !== false, payload: out.payload });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

module.exports = router;
