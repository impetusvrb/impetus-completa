'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../operationalLeakage/operationalLeakageFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getOperationalLeakageStatus(req.query) }));
router.get('/readiness', (req, res) => res.json(facade.analyzeOperationalLeakageReport(req.user, { tenant_id: req.query.tenant_id, ...req.body })));
router.get('/leakage', (req, res) => res.json(facade.analyzeOperationalLeakageReport(req.user, { visible_modules: req.body?.visible_modules, ...req.body })));
router.get('/blindness', (req, res) => {
  const { analyzeOperationalBlindness } = require('../../operationalLeakage/operationalBlindnessAnalyzer');
  res.json({ ok: true, ...analyzeOperationalBlindness(req.body?.delivery || {}, req.body?.canonical_identity || {}) });
});
router.get('/governance', (req, res) => res.json(facade.analyzeOperationalLeakageReport(req.user, req.body));
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.analyzeOperationalLeakageReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});

module.exports = router;
