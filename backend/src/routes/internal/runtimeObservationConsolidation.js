'use strict';

const express = require('express');
const router = express.Router();
const obs = require('../../runtimeObservationConsolidation/runtimeObservationConsolidationFacade');
const production = require('../../productionRuntimeActivation/productionRuntimeActivationFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...obs.getRuntimeObservationConsolidationStatus(req.query) }));
router.get('/evolution', (req, res) => {
  const p = production.applyProductionRuntimeActivation(req.user, {}, req.body);
  res.json({
    ok: true,
    evolution: p.runtime_observation_consolidation?.governance_evolution,
    timeline: p.runtime_observation_consolidation?.timeline
  });
});
router.get('/stability', (req, res) => {
  const p = production.applyProductionRuntimeActivation(req.user, {}, req.body);
  res.json({ ok: true, stability: p.runtime_observation_consolidation?.stability });
});
router.get('/leakage', (req, res) => {
  const s = require('../../runtimeActivationSafety/activationSafetyFacade');
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, leakage: s.assessActivationSafety(tenantId, req.user, req.body).leakage });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(production.getProductionRuntimeReport(req.user, req.body));
});

module.exports = router;
