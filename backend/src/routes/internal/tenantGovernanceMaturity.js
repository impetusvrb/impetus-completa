'use strict';

const express = require('express');
const router = express.Router();
const maturity = require('../../tenantGovernanceMaturity/tenantMaturityFacade');
const consolidation = require('../../runtimeGovernanceConsolidation/runtimeGovernanceConsolidationFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...maturity.getTenantGovernanceMaturityStatus(req.query) }));
router.get('/maturity', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...maturity.assessTenantGovernanceMaturity(tenantId, req.user, req.body) });
});
router.get('/stability', (req, res) => {
  const stab = require('../../tenantRuntimeStability/tenantStabilityFacade');
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...stab.assessTenantRuntimeStability(tenantId, req.body) });
});
router.get('/usefulness', (req, res) => {
  const u = require('../../runtimeOperationalUsefulness/operationalUsefulnessFacade');
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...u.assessOperationalUsefulness(tenantId, req.body, req.body) });
});
router.get('/readiness', (req, res) => {
  const e = require('../../tenantExpansionReadiness/expansionReadinessFacade');
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...e.assessTenantExpansionReadiness(tenantId, req.body) });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(consolidation.getConsolidationReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});

module.exports = router;
