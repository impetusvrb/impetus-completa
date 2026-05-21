'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../realSummaryTargeting/realSummaryTargetingFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getRealSummaryTargetingStatus(req.query) }));
router.get('/readiness', (req, res) => res.json(facade.getRealSummaryTargetingReport(req.user, { summary: req.body?.summary, tenant_id: req.query.tenant_id })));
router.get('/targeting', (req, res) => res.json({ ok: true, ...facade.applyRealSummaryTargeting(req.user, req.body?.summary || {}, req.body) }));
router.get('/leakage', (req, res) => {
  const { protectSummaryLeakage } = require('../../realSummaryTargeting/summaryLeakageProtection');
  res.json({ ok: true, ...protectSummaryLeakage(req.body?.summary || {}, req.body) });
});
router.get('/governance', (req, res) => res.json(facade.getRealSummaryTargetingReport(req.user, req.body));
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getRealSummaryTargetingReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});

module.exports = router;
