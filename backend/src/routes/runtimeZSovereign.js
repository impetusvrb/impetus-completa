'use strict';

const express = require('express');
const router = express.Router();

const flags = require('../runtime-z-sovereign/config/phaseSZ1FeatureFlags');
const { applySovereignZRuntime } = require('../runtime-z-sovereign/facade/zSovereignFacade');
const { bootstrapSovereign } = require('../runtime-z-sovereign/bootstrap/zBootstrapRuntime');
const { assembleContext } = require('../runtime-z-sovereign/context/zContextAssemblyRuntime');
const { composeContextual } = require('../runtime-z-sovereign/composition/zCompositionRuntime');
const { buildHydrationPlan } = require('../runtime-z-sovereign/hydration/zHydrationRuntime');
const { buildSovereignFallback } = require('../runtime-z-sovereign/fallback/zFallbackRuntime');
const { compareLegacyVsSovereign } = require('../runtime-z-sovereign/shadow/zShadowDiffRuntime');
const { validateBootstrap } = require('../runtime-z-sovereign/bootstrap/zBootstrapValidationEngine');
const { resolveStageForTenant } = require('../runtime-z-sovereign/promotion/zPromotionRuntime');
const { snapshot } = require('../runtime-z-sovereign/observability/zSovereignObservability');

function _guard(req, res) {
  if (!flags.isApiEnabled()) {
    res.status(503).json({ ok: false, reason: 'sovereign_api_disabled' });
    return false;
  }
  if (!req.user) {
    res.status(401).json({ ok: false, reason: 'auth_required' });
    return false;
  }
  return true;
}

router.get('/bootstrap', async (req, res) => {
  if (!_guard(req, res)) return;
  try {
    const out = await bootstrapSovereign(req.user, {});
    res.json({ ok: true, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

router.get('/context', async (req, res) => {
  if (!_guard(req, res)) return;
  try {
    const out = await assembleContext(req.user, {});
    res.json({ ok: true, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

router.get('/compose', async (req, res) => {
  if (!_guard(req, res)) return;
  try {
    const out = await composeContextual(req.user, {});
    res.json({ ok: true, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

router.get('/hydrate', async (req, res) => {
  if (!_guard(req, res)) return;
  try {
    const bootstrap = await bootstrapSovereign(req.user, {});
    const plan = buildHydrationPlan(bootstrap?.payload || {});
    res.json({ ok: true, hydration: plan });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

router.get('/fallback', (req, res) => {
  if (!_guard(req, res)) return;
  try {
    const out = buildSovereignFallback(req.user, {});
    res.json({ ok: true, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

router.get('/shadow-diff', async (req, res) => {
  if (!_guard(req, res)) return;
  try {
    const sovereign = await bootstrapSovereign(req.user, {});
    const diff = compareLegacyVsSovereign(req.user?.legacy_payload || null, sovereign?.payload || null);
    res.json({ ok: true, diff, sovereign_validation: sovereign?.validation });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

router.get('/validation', async (req, res) => {
  if (!_guard(req, res)) return;
  try {
    const out = await bootstrapSovereign(req.user, {});
    res.json({ ok: true, validation: validateBootstrap(out?.payload || {}) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

router.get('/promotion', (req, res) => {
  if (!_guard(req, res)) return;
  res.json({
    ok: true,
    promotion: resolveStageForTenant(req.user, {}),
    stages: flags.STAGES,
    metrics: snapshot()
  });
});

router.get('/metrics', (req, res) => {
  if (!_guard(req, res)) return;
  res.json({ ok: true, metrics: snapshot() });
});

router.post('/apply', async (req, res) => {
  if (!_guard(req, res)) return;
  try {
    const out = await applySovereignZRuntime(req.user, req.body?.legacy_payload || {}, req.body?.ctx || {});
    res.json({ ok: true, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

module.exports = router;
