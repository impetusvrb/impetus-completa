'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../runtimeGovernanceConsolidation/runtimeGovernanceConsolidationFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getRuntimeGovernanceConsolidationStatus(req.query) }));
router.get('/maturity', (req, res) => {
  const p = facade.applyTenantRuntimeConsolidation(req.user, {}, req.body);
  res.json({ ok: true, maturity: p.tenant_governance_maturity });
});
router.get('/stability', (req, res) => {
  res.json({ ok: true, stability: facade.applyTenantRuntimeConsolidation(req.user, {}, req.body).consolidation?.stability });
});
router.get('/sustainability', (req, res) => {
  const p = facade.applyTenantRuntimeConsolidation(req.user, {}, req.body);
  res.json({ ok: true, sustainability: p.runtime_sustainability });
});
router.get('/fatigue', (req, res) => {
  res.json({
    ok: true,
    fatigue: facade.applyTenantRuntimeConsolidation(req.user, {}, req.body).consolidation?.pressure
  });
});
router.get('/pressure', (req, res) => {
  res.json({
    ok: true,
    pressure: facade.applyTenantRuntimeConsolidation(req.user, {}, req.body).consolidation?.pressure
  });
});
router.get('/usefulness', (req, res) => {
  const p = facade.applyTenantRuntimeConsolidation(req.user, {}, req.body);
  res.json({ ok: true, usefulness: p.runtime_operational_usefulness });
});
router.get('/readiness', (req, res) => {
  res.json({
    ok: true,
    readiness: facade.applyTenantRuntimeConsolidation(req.user, {}, req.body).consolidation?.expansion
  });
});
router.get('/evolution', (req, res) => {
  const c = facade.applyTenantRuntimeConsolidation(req.user, {}, req.body).consolidation;
  res.json({ ok: true, evolution: c?.evolution, rollout_evolution: c?.rollout_evolution });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getConsolidationReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});

module.exports = router;
