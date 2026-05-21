'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../runtimeDeliveryAudit/deliveryAuditFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getDeliveryAuditStatus(req.query) }));
router.get('/sidebar', (req, res) => {
  const { traceSidebarDelivery } = require('../../runtimeDeliveryAudit/sidebarDeliveryTrace');
  const modules = (req.query.modules || '').split(',').filter(Boolean);
  res.json({
    ok: true,
    ...traceSidebarDelivery(
      { visible_modules: modules, sidebar_governance_runtime: req.body?.sidebar_governance_runtime },
      { domain_axis: req.query.domain_axis, hierarchy_tier: req.query.hierarchy_tier }
    )
  });
});
router.get('/kpis', (req, res) => {
  const r = facade.auditKpiDelivery(req.user, req.body?.kpis || [], {
    domain_axis: req.query.domain_axis,
    force_audit: true
  });
  res.json({ ok: true, ...r });
});
router.get('/summaries', (req, res) => {
  const r = facade.auditSummaryDelivery(req.user, { summary: req.body?.summary, text: req.body?.text }, { force_audit: true });
  res.json({ ok: true, ...r });
});
router.get('/cockpit', (req, res) => {
  const { traceCockpitDelivery } = require('../../runtimeDeliveryAudit/cockpitDeliveryTrace');
  res.json({ ok: true, ...traceCockpitDelivery(req.body || {}, req.query) });
});
router.get('/contextual', (req, res) => {
  const { traceContextualMerge } = require('../../runtimeDeliveryAudit/contextualMergeTrace');
  res.json({
    ok: true,
    ...traceContextualMerge(
      req.body?.before || [],
      req.body?.contextual || [],
      req.body?.after || [],
      req.body?.ctx || {}
    )
  });
});
router.get('/legacy', (req, res) => {
  const { auditLegacyInjectors } = require('../../runtimeDeliveryAudit/legacyInjectionTrace');
  res.json({ ok: true, ...auditLegacyInjectors() });
});
router.get('/pipeline', (req, res) => {
  const { buildPipelineOrderTrace } = require('../../runtimeDeliveryAudit/runtimePipelineOrderTrace');
  res.json({ ok: true, ...buildPipelineOrderTrace(req.body?.stages || []) });
});
router.get('/frontend', (req, res) => {
  res.json({
    ok: true,
    note: 'Frontend audit runs client-side; see frontend/src/runtimeGovernanceAudit/',
    catalog: require('../../runtimeDeliveryAudit/legacyInjectionTrace').LEGACY_INJECTOR_CATALOG.filter(
      (i) => i.layer === 'frontend'
    )
  });
});
router.get('/conflicts', (req, res) => {
  const { consolidateGovernanceAudit } = require('../../runtimeDeliveryAudit/deliveryGovernanceAudit');
  res.json({ ok: true, ...consolidateGovernanceAudit(req.body || {}) });
});
router.get('/leakage', (req, res) => {
  const { resolveModuleLeakage } = require('../../canonicalModuleGovernance/moduleLeakageResolver');
  const modules = (req.query.modules || '').split(',').filter(Boolean);
  res.json({ ok: true, ...resolveModuleLeakage(modules, { domain_axis: req.query.domain_axis }) });
});
router.get('/reinjection', (req, res) => {
  const { findReinjectionPoints } = require('../../runtimeDeliveryAudit/legacyInjectionTrace');
  res.json({
    ok: true,
    points: findReinjectionPoints(req.body?.stages || [], req.body?.denied || [])
  });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(
    facade.getFullDeliveryAuditReport(req.user, {
      tenant_id: req.query.tenant_id,
      parts: req.body?.parts,
      force_audit: true
    })
  );
});

module.exports = router;
