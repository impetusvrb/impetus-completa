'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../realKpiTargeting/realKpiTargetingFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getRealKpiTargetingStatus(req.query) }));
router.get('/readiness', (req, res) => res.json(facade.getRealKpiTargetingReport(req.user, { kpis: req.body?.kpis, tenant_id: req.query.tenant_id })));
router.get('/targeting', (req, res) => res.json({ ok: true, ...facade.applyRealKpiTargeting(req.user, req.body?.kpis || [], req.body) }));
router.get('/blindness', (req, res) => {
  const { protectOperationalKpiBlindness } = require('../../realKpiTargeting/operationalBlindnessProtection');
  res.json({ ok: true, ...protectOperationalKpiBlindness(req.body?.kpis || [], req.body?.kpis_before || [], req.body) });
});
router.get('/governance', (req, res) => res.json(facade.getRealKpiTargetingReport(req.user, req.body)));
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getRealKpiTargetingReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});
router.post('/activate/:tenant', (req, res) => {
  const approved_by = req.body?.approved_by || req.user?.email || req.user?.id;
  if (!approved_by || req.body?.execute !== true) {
    return res.status(400).json({ ok: false, error: 'execute=true e approved_by obrigatórios' });
  }
  try {
    const coord = require('../../kpiRuntimeEnforcement/tenantKpiActivationCoordinator');
    const result = coord.coordinateTenantKpiActivation(req.params.tenant, req.user, {
      ...req.body,
      approved_by,
      execute: true
    });
    res.status(result.activated ? 200 : 409).json({ ok: result.activated, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
