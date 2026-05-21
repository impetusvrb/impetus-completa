'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../realMenuGovernance/realMenuGovernanceFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getRealMenuGovernanceStatus(req.query) }));
router.get('/readiness', (req, res) => res.json(facade.getRealMenuGovernanceReport(req.user, { visible_modules: req.body?.visible_modules, tenant_id: req.query.tenant_id })));
router.get('/targeting', (req, res) => {
  const modules = req.body?.visible_modules || (req.query.modules || '').split(',').filter(Boolean);
  res.json({ ok: true, ...facade.applyRealMenuGovernance(modules, req.user, { ...req.body, tenant_id: req.query.tenant_id }) });
});
router.get('/hierarchy', (req, res) => {
  const { filterMenuByHierarchy } = require('../../realMenuGovernance/hierarchyMenuFiltering');
  const modules = req.body?.visible_modules || [];
  res.json({ ok: true, ...filterMenuByHierarchy(modules, req.body) });
});
router.get('/stability', (req, res) => {
  const { stabilizeMenuGovernance } = require('../../realMenuGovernance/menuGovernanceStability');
  res.json({ ok: true, ...stabilizeMenuGovernance(req.body?.visible_modules || [], req.body) });
});
router.get('/governance', (req, res) => res.json(facade.getRealMenuGovernanceReport(req.user, req.body));
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getRealMenuGovernanceReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});

module.exports = router;
