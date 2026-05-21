'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../summaryConvergence/summaryConvergenceFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getSummaryConvergenceStatus(req.query) }));
router.get('/convergence', (req, res) => {
  const p = facade.applySummaryRuntimeConvergence(req.user, req.body, req.body);
  res.json({ ok: true, convergence: p.summary_runtime_convergence });
});
router.get('/narrative', (req, res) => {
  const p = facade.applySummaryRuntimeConvergence(req.user, req.body, req.body);
  res.json({ ok: true, narrative: p.summary_narrative_integrity });
});
router.get('/stability', (req, res) => {
  const s = require('../../summaryDeliveryStabilization/summaryStabilizationFacade');
  res.json({ ok: true, stability: s.stabilizeSummaryDelivery(req.body, req.body) });
});
router.get('/governance-health', (req, res) => {
  const p = facade.applySummaryRuntimeConvergence(req.user, req.body, req.body);
  res.json({ ok: true, health: p.summary_governance_health });
});
router.get('/maturity', (req, res) => {
  const p = facade.applySummaryRuntimeConvergence(req.user, req.body, req.body);
  res.json({ ok: true, maturity: p.summary_governance_health?.maturity });
});
router.get('/evolution', (req, res) => {
  const p = facade.applySummaryRuntimeConvergence(req.user, req.body, req.body);
  res.json({ ok: true, evolution: p.summary_runtime_convergence?.evolution });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getSummaryConvergenceReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});

module.exports = router;
