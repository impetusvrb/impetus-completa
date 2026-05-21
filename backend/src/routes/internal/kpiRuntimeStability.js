'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../kpiRuntimeStability/kpiRuntimeStabilityFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getKpiRuntimeStabilityStatus(req.query) }));
router.get('/stability', (req, res) => {
  const pack = facade.applyKpiRuntimeStability(req.user, req.body?.kpis || [], req.body);
  res.json({ ok: true, stability: pack.kpi_runtime_stability });
});
router.get('/visibility', (req, res) => {
  const vis = require('../../kpiVisibilityStabilization/kpiVisibilityStabilizationFacade');
  res.json({ ok: true, ...vis.stabilizeKpiVisibility(req.user, req.body?.kpis || [], req.body) });
});
router.get('/underdelivery', (req, res) => {
  const u = require('../../kpiUnderdeliveryHardening/kpiUnderdeliveryHardeningFacade');
  res.json({ ok: true, ...u.hardenKpiUnderdelivery(req.body?.kpis || [], req.body) });
});
router.get('/blindness', (req, res) => {
  const u = require('../../kpiUnderdeliveryHardening/kpiUnderdeliveryHardeningFacade');
  const h = u.hardenKpiUnderdelivery(req.body?.kpis || [], req.body);
  res.json({
    ok: true,
    operational: h.operational,
    executive: h.executive,
    blindness_detected: h.blindness_detected
  });
});
router.get('/targeting', (req, res) => {
  const t = require('../../kpiTargetingHardening/kpiTargetingHardeningPack');
  res.json({ ok: true, targeting: t.runKpiTargetingHardening(req.user, req.body?.kpis || [], req.body) });
});
router.get('/convergence', (req, res) => {
  const pack = facade.applyKpiRuntimeStability(req.user, req.body?.kpis || [], req.body);
  res.json({ ok: true, convergence: pack.kpi_runtime_stability?.convergence });
});
router.get('/cockpit', (req, res) => {
  const d = require('../../kpiDashboardStabilization/dashboardKpiStabilizationFacade');
  res.json({ ok: true, cockpit: d.stabilizeDashboardKpis(req.body?.kpis || [], req.body).cockpit });
});
router.get('/rollback', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  const rb = require('../../kpiRuntimeStability/kpiRuntimeRollbackReadiness');
  res.json({ ok: true, ...rb.assessKpiRuntimeRollbackReadiness(tenantId, req.body) });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getKpiRuntimeStabilityReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});

module.exports = router;
