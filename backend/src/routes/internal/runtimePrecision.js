'use strict';

const express = require('express');
const router = express.Router();

const phaseL = require('../../precisionRuntime/config/phaseLFeatureFlags');
const facade = require('../../precisionRuntime/precisionRuntimeFacade');
const { deliverModules } = require('../../precisionRuntime/preciseModuleDeliveryEngine');
const { computeToolVisibility } = require('../../precisionRuntime/governedToolVisibilityEngine');
const { applyCardPrecision } = require('../../precisionRuntime/governedCardPrecisionEngine');
const { resolvePreciseKpis } = require('../../precisionRuntime/preciseKpiResolver');
const { resolvePreciseSummary } = require('../../precisionRuntime/preciseSummaryEngine');
const { validatePrecisionRuntime } = require('../../precisionRuntime/precisionRuntimeValidator');
const { compareLegacyVsPrecise } = require('../../precisionRuntime/runtimePrecisionComparator');
const { getDeliveryTelemetry } = require('../../precisionRuntime/runtimeDeliveryTelemetry');
const { listPrecisionAudit } = require('../../precisionRuntime/runtimePrecisionAuditTrail');

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

router.get('/runtime-precision/modules', (req, res) => {
  const modules = (req.query.modules || '').split(',').filter(Boolean);
  const user = req.user;
  const r = deliverModules(user, {
    visible_modules: modules,
    functional_axis: req.query.axis,
    force_observe: true
  });
  res.json({ ok: true, ...r });
});

router.get('/runtime-precision/tools', (req, res) => {
  const tools = (req.query.tools || '').split(',').filter(Boolean);
  res.json({ ok: true, ...facade.resolveToolsForUser(req.user, tools, { functional_axis: req.query.axis }) });
});

router.get('/runtime-precision/widgets', (req, res) => {
  let widgets = [];
  try {
    widgets = req.query.widgets ? JSON.parse(req.query.widgets) : [];
  } catch {
    return res.status(400).json({ ok: false, error: 'widgets JSON inválido' });
  }
  res.json({
    ok: true,
    ...facade.resolveWidgetsForUser(req.user, widgets, { functional_axis: req.query.axis })
  });
});

router.get('/runtime-precision/kpis', (req, res) => {
  let kpis = { kpis: [] };
  try {
    if (req.query.payload) kpis = JSON.parse(req.query.payload);
  } catch {
    return res.status(400).json({ ok: false, error: 'payload JSON inválido' });
  }
  res.json({
    ok: true,
    ...resolvePreciseKpis(kpis, req.user, { domain: req.query.domain, functional_axis: req.query.axis })
  });
});

router.get('/runtime-precision/summaries', (req, res) => {
  let summary = null;
  try {
    if (req.query.payload) summary = JSON.parse(req.query.payload);
  } catch {
    return res.status(400).json({ ok: false, error: 'payload JSON inválido' });
  }
  const { enrichSummaryPrecision } = require('../../precisionRuntime/precisionRuntimeFacade');
  res.json({ ok: true, ...enrichSummaryPrecision(req.user, summary, { functional_axis: req.query.axis }) });
});

router.get('/runtime-precision/accuracy', (req, res) => {
  const modules = (req.query.modules || '').split(',').filter(Boolean);
  const legacy = { visible_modules: modules };
  const precise = deliverModules(req.user, { visible_modules: modules, functional_axis: req.query.axis });
  const validation = validatePrecisionRuntime(legacy, precise, { shadow_mode: true });
  res.json({ ok: true, ...validation, telemetry: getDeliveryTelemetry() });
});

router.get('/runtime-precision/overdelivery', (req, res) => {
  const modules = (req.query.modules || '').split(',').filter(Boolean);
  const precise = deliverModules(req.user, { visible_modules: modules, functional_axis: req.query.axis });
  const cmp = compareLegacyVsPrecise({ visible_modules: modules }, precise);
  res.json({ ok: true, overdelivery: cmp.overdelivery, count: cmp.overdelivery.length });
});

router.get('/runtime-precision/underdelivery', (req, res) => {
  const modules = (req.query.modules || '').split(',').filter(Boolean);
  const precise = deliverModules(req.user, { visible_modules: modules, functional_axis: req.query.axis });
  const cmp = compareLegacyVsPrecise({ visible_modules: modules }, precise);
  res.json({ ok: true, underdelivery: cmp.underdelivery, count: cmp.underdelivery.length });
});

router.get('/runtime-precision/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    ...facade.getPrecisionReport(),
    observability: phaseL.isRuntimePrecisionObservabilityEnabled(),
    audit_sample: listPrecisionAudit(Number(req.query.limit) || 20)
  });
});

module.exports = router;
