'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../kpiConvergence/kpiConvergenceFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getKpiConvergenceStatus(req.query) }));
router.get('/convergence', (req, res) => {
  const p = facade.applyKpiRuntimeConvergence(req.user, req.body?.kpis || [], req.body);
  res.json({ ok: true, convergence: p.kpi_runtime_convergence });
});
router.get('/coherence', (req, res) => {
  const engine = require('../../kpiConvergence/kpiRuntimeConvergenceEngine');
  res.json({ ok: true, engine: engine.runKpiRuntimeConvergenceEngine(req.body?.kpis || [], req.user, req.body) });
});
router.get('/assurance', (req, res) => {
  const p = facade.applyKpiRuntimeConvergence(req.user, req.body?.kpis || [], req.body);
  res.json({ ok: true, assurance: p.kpi_runtime_convergence?.assurance });
});
router.get('/cockpit', (req, res) => {
  const p = facade.applyKpiRuntimeConvergence(req.user, req.body?.kpis || [], req.body);
  res.json({ ok: true, cockpit: p.kpi_cockpit_integrity });
});
router.get('/governance-health', (req, res) => {
  const p = facade.applyKpiRuntimeConvergence(req.user, req.body?.kpis || [], req.body);
  res.json({ ok: true, health: p.kpi_governance_health });
});
router.get('/maturity', (req, res) => {
  const p = facade.applyKpiRuntimeConvergence(req.user, req.body?.kpis || [], req.body);
  res.json({ ok: true, maturity: p.kpi_governance_health?.maturity });
});
router.get('/evolution', (req, res) => {
  const p = facade.applyKpiRuntimeConvergence(req.user, req.body?.kpis || [], req.body);
  res.json({ ok: true, evolution: p.kpi_runtime_convergence?.evolution });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getKpiConvergenceReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});

module.exports = router;
