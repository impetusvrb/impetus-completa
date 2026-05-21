'use strict';

const express = require('express');
const router = express.Router();
const sustainability = require('../../runtimeSustainability/runtimeSustainabilityFacade');
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

router.get('/status', (req, res) => res.json({ ok: true, ...sustainability.getRuntimeSustainabilityStatus(req.query) }));
router.get('/sustainability', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...sustainability.assessRuntimeSustainability(tenantId, req.body, req.body) });
});
router.get('/pressure', (req, res) => {
  const p = require('../../governancePressure/governancePressureFacade');
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...p.assessGovernancePressure(tenantId, req.body.stability || {}, req.body) });
});
router.get('/fatigue', (req, res) => {
  const f = require('../../governancePressure/runtimeGovernanceFatigue');
  res.json({ ok: true, fatigue: f.assessRuntimeGovernanceFatigue(req.body.stability || {}) });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const pack = consolidation.applyTenantRuntimeConsolidation(req.user, {}, req.body);
  res.json({ ok: true, sustainability: pack.runtime_sustainability, consolidation: pack.consolidation });
});

module.exports = router;
