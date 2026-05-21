'use strict';

const express = require('express');
const router = express.Router();
const quality = require('../../summaryDeliveryQuality/summaryDeliveryQualityFacade');
const activation = require('../../summaryRuntimeActivation/summaryRuntimeActivationFacade');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

router.get('/status', (req, res) => {
  const flags = require('../../summaryRuntimeActivation/config/phaseZ9FeatureFlags');
  res.json({
    ok: true,
    phase: 'Z.9',
    delivery_quality: flags.isSummaryDeliveryQualityEnabled()
  });
});
router.get('/usefulness', (req, res) => {
  const u = require('../../summaryDeliveryQuality/summaryOperationalUsefulness');
  res.json({ ok: true, usefulness: u.measureSummaryOperationalUsefulness(req.body, req.body) });
});
router.get('/signal', (req, res) => {
  const s = require('../../summaryDeliveryQuality/narrativeSignalStrength');
  res.json({ ok: true, signal: s.measureNarrativeSignalStrength(req.body, req.body) });
});
router.get('/noise', (req, res) => {
  const n = require('../../summaryDeliveryQuality/contextualNarrativeNoise');
  res.json({ ok: true, noise: n.measureContextualNarrativeNoise(req.body) });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const p = activation.applySummaryRuntimeActivation(req.user, req.body, req.body);
  res.json({ ok: true, delivery_quality: p.summary_delivery_quality });
});

module.exports = router;
