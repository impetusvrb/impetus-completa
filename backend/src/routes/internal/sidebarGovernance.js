'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../canonicalModuleGovernance/moduleGovernanceFacade');
const observability = require('../../sidebarObservability/sidebarObservabilityFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getModuleGovernanceStatus(req.query) }));
router.get('/distribution', (req, res) => {
  const { analyzeSidebarModuleDistribution } = require('../../sidebarObservability/sidebarModuleDistribution');
  const modules = (req.query.modules || '').split(',').filter(Boolean);
  res.json({
    ok: true,
    ...analyzeSidebarModuleDistribution(modules, { domain_axis: req.query.domain_axis })
  });
});
router.get('/leakage', (req, res) => {
  const { resolveModuleLeakage } = require('../../canonicalModuleGovernance/moduleLeakageResolver');
  const modules = (req.query.modules || '').split(',').filter(Boolean);
  res.json({
    ok: true,
    ...resolveModuleLeakage(modules, {
      domain_axis: req.query.domain_axis,
      hierarchy_tier: req.query.hierarchy_tier
    })
  });
});
router.get('/health', (req, res) => {
  const report = facade.getSidebarGovernanceReport(req.user, {
    tenant_id: req.query.tenant_id,
    visible_modules: req.body?.visible_modules
  });
  const health = observability.buildSidebarObservabilityReport(req.user, {
    tenant_id: req.query.tenant_id,
    visible_modules: report.response?.visible_modules,
    governance_resolution: report.governance_resolution
  });
  res.json({ ok: true, health: health.health, governance: report.sidebar_governance_runtime });
});
router.get('/timeline', (req, res) => {
  res.json(observability.getSidebarLeakageTimeline(req.query.tenant_id || req.user?.company_id));
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const gov = facade.getSidebarGovernanceReport(req.user, {
    tenant_id: req.query.tenant_id,
    legacy: { visible_modules: req.body?.visible_modules },
    contextual_modules: req.body?.contextual_modules,
    force_sidebar_governance: req.query.force === '1'
  });
  const obs = observability.buildSidebarObservabilityReport(req.user, {
    tenant_id: req.query.tenant_id,
    visible_modules: gov.response?.visible_modules,
    governance_resolution: gov.governance_resolution
  });
  res.json({ ok: true, governance: gov, observability: obs });
});

module.exports = router;
