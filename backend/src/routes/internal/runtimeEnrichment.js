'use strict';

const express = require('express');
const router = express.Router();

const facade = require('../../runtimeEnrichment/runtimeEnrichmentFacade');
const { measureContextualDataDensity } = require('../../runtimeEnrichment/contextualDataDensityEngine');
const { analyzeOperationalSignalIntegrity } = require('../../runtimeEnrichment/operationalSignalIntegrityAnalyzer');
const { detectTelemetryGaps } = require('../../runtimeEnrichment/runtimeTelemetryGapDetector');
const { validateInsightGenerationIntegrity } = require('../../runtimeEnrichment/insightGenerationIntegrityEngine');
const { enrichDashboardSemantics } = require('../../runtimeEnrichment/dashboardSemanticEnrichmentEngine');
const { validateContextualEnrichment } = require('../../runtimeEnrichment/contextualEnrichmentValidator');
const { coordinateEnrichment } = require('../../runtimeEnrichment/enrichmentPipelineCoordinator');
const { getEnrichmentTelemetry } = require('../../runtimeEnrichment/runtimeEnrichmentTelemetry');

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
  res.json({ ok: true, ...facade.getRuntimeEnrichmentStatus({ tenant_id: req.query.tenant_id }) });
});

router.get('/density', (req, res) => {
  res.json({
    ok: true,
    ...measureContextualDataDensity(req.body || {}, {
      functional_axis: req.query.axis,
      tenant_id: req.query.tenant_id
    })
  });
});

router.get('/signals', (req, res) => {
  res.json({
    ok: true,
    ...analyzeOperationalSignalIntegrity(req.body || {}, { channel: req.query.channel })
  });
});

router.get('/telemetry', (req, res) => {
  res.json({
    ok: true,
    ...detectTelemetryGaps(req.body || {}, { tenant_id: req.query.tenant_id })
  });
});

router.get('/insights', (req, res) => {
  res.json({
    ok: true,
    ...validateInsightGenerationIntegrity(req.body || {}, { expect_insights: req.query.expect === '1' })
  });
});

router.get('/dashboards', (req, res) => {
  res.json({
    ok: true,
    ...enrichDashboardSemantics(req.body || {}, { functional_axis: req.query.axis })
  });
});

router.get('/enrichment', (req, res) => {
  res.json({
    ok: true,
    ...validateContextualEnrichment(req.body || {}, { functional_axis: req.query.axis })
  });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const user = { ...req.user, functional_axis: req.query.axis || req.user?.functional_axis };
  res.json({
    ok: true,
    status: facade.getRuntimeEnrichmentStatus({ tenant_id: req.query.tenant_id }),
    telemetry: getEnrichmentTelemetry(),
    enrichment: facade.enrichWithRuntimeDataIntegrity(user, req.body || {}, {
      force: true,
      channel: req.query.channel || 'dashboard'
    })
  });
});

module.exports = router;
