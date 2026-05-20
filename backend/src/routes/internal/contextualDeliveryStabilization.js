'use strict';

const express = require('express');
const router = express.Router();

const phaseP = require('../../contextualDeliveryStabilization/config/phasePFeatureFlags');
const facade = require('../../contextualDeliveryStabilization/contextualDeliveryStabilizationFacade');
const { resolveHierarchy } = require('../../contextualDeliveryStabilization/contextualHierarchyResolver');
const { stabilizeFunctionalDomain } = require('../../contextualDeliveryStabilization/functionalDomainStabilizer');
const { targetModules } = require('../../contextualDeliveryStabilization/governedModuleTargeting');
const { stabilizeDashboardDelivery } = require('../../contextualDeliveryStabilization/dashboardDeliveryStabilizer');
const { resolveStabilizedKpis } = require('../../contextualDeliveryStabilization/stabilizedKpiResolver');
const { detectContextualConflict } = require('../../contextualDeliveryStabilization/contextualConflictDetector');
const { detectHierarchyConflict } = require('../../contextualDeliveryStabilization/hierarchyConflictDetector');
const { detectAuthorityConflict } = require('../../contextualDeliveryStabilization/authorityConflictDetector');
const { getDeliveryStabilityTelemetry } = require('../../contextualDeliveryStabilization/deliveryStabilityTelemetry');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  }
  next();
});

router.get('/status', (req, res) => {
  res.json({
    ok: true,
    phase: 'P',
    observability: phaseP.isContextualStabilizationObservabilityEnabled(),
    shadow_first: true,
    flags: facade.getContextualDeliveryReport().flags
  });
});

router.get('/hierarchy', (req, res) => {
  const user = {
    hierarchy_level: Number(req.query.level) || req.user?.hierarchy_level || 5,
    role: req.query.role || req.user?.role
  };
  const modules = (req.query.modules || '').split(',').filter(Boolean);
  res.json({
    ok: true,
    ...resolveHierarchy(user),
    ...facade.stabilizeHierarchy(user, modules, { functional_axis: req.query.axis })
  });
});

router.get('/domains', (req, res) => {
  const user = { functional_axis: req.query.axis, department: req.query.department };
  const modules = (req.query.modules || '').split(',').filter(Boolean);
  res.json({
    ok: true,
    ...facade.stabilizeFunctionalDomain(user, modules, { functional_axis: req.query.axis })
  });
});

router.get('/modules', (req, res) => {
  const modules = (req.query.modules || '').split(',').filter(Boolean);
  res.json({
    ok: true,
    ...facade.targetModules(modules, req.user, { functional_axis: req.query.axis, hierarchy_band: req.query.band })
  });
});

router.get('/dashboards', (req, res) => {
  let widgets = [];
  try {
    if (req.query.widgets) widgets = JSON.parse(req.query.widgets);
  } catch {
    return res.status(400).json({ ok: false, error: 'widgets JSON inválido' });
  }
  res.json({
    ok: true,
    ...stabilizeDashboardDelivery(req.user, widgets, {
      domain: req.query.axis,
      hierarchy_band: req.query.band
    })
  });
});

router.get('/kpis', (req, res) => {
  let kpis = { kpis: [] };
  try {
    if (req.query.payload) kpis = JSON.parse(req.query.payload);
  } catch {
    return res.status(400).json({ ok: false, error: 'payload inválido' });
  }
  res.json({
    ok: true,
    ...resolveStabilizedKpis(kpis, req.user, {
      functional_axis: req.query.axis,
      domain: req.query.axis
    })
  });
});

router.get('/conflicts', (req, res) => {
  res.json({
    ok: true,
    contextual: detectContextualConflict({ domain_a: req.query.a, domain_b: req.query.b }),
    hierarchy: detectHierarchyConflict({
      hierarchy_band: req.query.band,
      has_executive_module: req.query.executive === '1'
    }),
    authority: detectAuthorityConflict({
      corporate_view: req.query.corporate === '1',
      can_view_corporate: req.query.can_corporate === '1'
    })
  });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, ...facade.getContextualDeliveryReport() });
});

module.exports = router;
