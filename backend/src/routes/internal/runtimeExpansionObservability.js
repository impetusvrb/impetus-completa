'use strict';

const express = require('express');
const router = express.Router();
const scaling = require('../../runtimeOperationalScaling/runtimeOperationalScalingFacade');
const flags = require('../../runtimeOperationalScaling/config/phaseZ11FeatureFlags');

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

router.get('/status', (req, res) =>
  res.json({ ok: true, phase: 'Z.11', observability: flags.isRuntimeExpansionObservabilityEnabled() })
);
router.get('/entropy', (req, res) => {
  const p = scaling.applyRuntimeOperationalScaling(req.user, {}, req.body);
  res.json({ ok: true, entropy: p.governance_load_protection?.entropy });
});
router.get('/pressure', (req, res) => {
  const p = scaling.applyRuntimeOperationalScaling(req.user, {}, req.body);
  res.json({ ok: true, pressure: p.governance_load_protection?.governance_load });
});
router.get('/overload', (req, res) => {
  const p = scaling.applyRuntimeOperationalScaling(req.user, {}, req.body);
  res.json({ ok: true, overload: p.governance_load_protection?.governance_overload_detected });
});
router.get('/stability', (req, res) => {
  const p = scaling.applyRuntimeOperationalScaling(req.user, {}, req.body);
  res.json({ ok: true, observability: p.tenant_expansion_maturity?.observability });
});
router.get('/evolution', (req, res) => {
  const p = scaling.applyRuntimeOperationalScaling(req.user, {}, req.body);
  res.json({
    ok: true,
    evolution: p.tenant_expansion_maturity?.observability?.expansion_evolution,
    governance: p.tenant_expansion_maturity?.observability?.governance_evolution
  });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(scaling.getOperationalScalingReport(req.user, req.body));
});

module.exports = router;
