'use strict';

const express = require('express');
const router = express.Router();

const phaseK = require('../../semanticGovernance/config/phaseKFeatureFlags');
const { getAlignmentReport, resolveSemanticPublication } = require('../../runtimeAlignment/semanticRuntimeAlignmentFacade');
const { detectOrphanPipelines } = require('../../runtimeAlignment/orphanPipelineDetector');
const { getContextDependencyMap } = require('../../runtimeAlignment/runtimeContextDependencyMap');
const { composeCards } = require('../../dashboardGovernance/contextualCardCompositionEngine');
const { mapEntrypoints } = require('../../governanceBootstrap/governanceEntrypointMapper');
const { getSemanticTelemetry } = require('../../runtimeAlignment/semanticRuntimeTelemetry');
const { listPublicationAudit } = require('../../semanticGovernance/semanticPublicationAudit');

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

router.get('/runtime-alignment/publication', (req, res) => {
  const user = req.user;
  const modules = (req.query.modules || '').split(',').filter(Boolean);
  const pub = resolveSemanticPublication(user, {
    visible_modules: modules,
    functional_axis: req.query.axis,
    force_observe: true
  });
  res.json({ ok: true, ...pub });
});

router.get('/runtime-alignment/orphans', (req, res) => {
  res.json({ ok: true, ...detectOrphanPipelines({ force: req.query.force === '1' }) });
});

router.get('/runtime-alignment/dependencies', (req, res) => {
  res.json({ ok: true, ...getContextDependencyMap({ tenant_id: req.query.tenant_id }) });
});

router.get('/runtime-alignment/cards', (req, res) => {
  const widgets = req.query.widgets ? JSON.parse(req.query.widgets) : [];
  res.json({
    ok: true,
    ...composeCards(widgets, { functional_axis: req.query.axis })
  });
});

router.get('/runtime-alignment/leakage', (req, res) => {
  res.json({
    ok: true,
    publication_audit: listPublicationAudit(Number(req.query.limit) || 100),
    telemetry: getSemanticTelemetry()
  });
});

router.get('/runtime-alignment/semantic-health', (req, res) => {
  res.json({
    ok: true,
    flags: {
      observability: phaseK.isSemanticRuntimeObservabilityEnabled(),
      publication: phaseK.isSemanticPublicationGovernanceEnabled()
    },
    telemetry: getSemanticTelemetry()
  });
});

router.get('/runtime-alignment/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const report = getAlignmentReport({ force: req.query.force === '1' });
  report.entrypoints = mapEntrypoints({ live: true });
  res.json({ ok: true, ...report });
});

module.exports = router;
