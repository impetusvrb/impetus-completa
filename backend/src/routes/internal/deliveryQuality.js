'use strict';

const express = require('express');
const router = express.Router();
const quality = require('../../deliveryQuality/deliveryQualityFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...quality.getDeliveryQualityStatus(req.query) }));
router.get('/dashboard-quality', (req, res) => {
  const analysis = quality.analyzeDeliveryQuality(req.user, req.body);
  res.json({ ok: true, dashboard_signal: analysis.dashboard_signal });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, analysis: quality.analyzeDeliveryQuality(req.user, req.body) });
});

module.exports = router;
