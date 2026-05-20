'use strict';

const express = require('express');
const router = express.Router();

const engine = require('../../summaryRollout/summaryGovernanceActivationEngine');
const { measureOperationalSummaryRelevance } = require('../../summaryRollout/operationalSummaryRelevance');
const { detectSummaryLeakage } = require('../../summaryRollout/summaryLeakageDetector');
const { detectSummaryUnderdelivery } = require('../../summaryRollout/summaryUnderdeliveryDetector');
const { alignNarrative } = require('../../summaryRollout/narrativeAlignmentEngine');
const { superviseTenantSummaryRollout } = require('../../summaryRollout/tenantSummaryRolloutSupervisor');
const { getSummaryGovernanceTelemetry } = require('../../summaryRollout/summaryGovernanceTelemetry');
const { executeSummaryGovernanceDeploy } = require('../../summaryRollout/summarySafeDeploy');
const { READINESS_THRESHOLD } = require('../../summaryRollout/summaryRuntimeCoordinator');
const { extractSummaryText } = require('../../summaryRollout/summaryPayloadUtils');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

function samplePayload(req) {
  const body = req.body?.summary ?? req.body;
  if (typeof body === 'string') return { summary: body };
  return body || { summary: '' };
}

function sampleUser(req) {
  return { ...req.user, functional_axis: req.query.axis || req.body?.functional_axis || req.user?.functional_axis };
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  }
  next();
});

router.get('/status', (req, res) => {
  res.json({ ok: true, ...engine.getSummaryRolloutStatus({ tenant_id: req.query.tenant_id }) });
});

router.get('/readiness', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const payload = samplePayload(req);
  if (!extractSummaryText(payload) && req.query.text) {
    payload.summary = req.query.text;
  }
  res.json({
    ok: true,
    ...engine.assessSummaryRolloutReadiness(sampleUser(req), payload, {
      readiness_threshold: Number(req.query.threshold) || READINESS_THRESHOLD,
      skip_kpi_prerequisite: req.query.skip_kpi === '1',
      force: req.query.force === '1'
    })
  });
});

router.get('/relevance', (req, res) => {
  res.json({
    ok: true,
    ...measureOperationalSummaryRelevance(sampleUser(req), samplePayload(req), {
      functional_axis: req.query.axis
    })
  });
});

router.get('/leakage', (req, res) => {
  res.json({
    ok: true,
    ...detectSummaryLeakage(sampleUser(req), samplePayload(req), {
      functional_axis: req.query.axis,
      tenant_id: req.query.tenant_id
    })
  });
});

router.get('/underdelivery', (req, res) => {
  res.json({
    ok: true,
    ...detectSummaryUnderdelivery(sampleUser(req), samplePayload(req), {
      min_summary_length: Number(req.query.min) || 80,
      tenant_id: req.query.tenant_id
    })
  });
});

router.get('/narrative', (req, res) => {
  res.json({
    ok: true,
    ...alignNarrative(sampleUser(req), samplePayload(req), { functional_axis: req.query.axis })
  });
});

router.get('/tenants', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...superviseTenantSummaryRollout(tenantId) });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const facade = require('../../summaryRollout/summaryRolloutFacade');
  const user = sampleUser(req);
  const payload = samplePayload(req);
  res.json({
    ok: true,
    status: engine.getSummaryRolloutStatus({ tenant_id: req.query.tenant_id }),
    telemetry: getSummaryGovernanceTelemetry(),
    stabilization: facade.enrichSummaryGovernanceRollout(user, payload, { force: true }),
    deploy_dry_run: executeSummaryGovernanceDeploy({ dry_run: true, skip_pm2: true, skip_build: true })
  });
});

router.post('/activate', (req, res) => {
  const result = engine.activateSummaryGovernance(req.user, samplePayload(req), {
    execute: req.body?.execute === true,
    approved_by: req.body?.approved_by || req.user?.email || req.user?.id,
    tenant_id: req.body?.tenant_id || req.user?.company_id,
    readiness_threshold: Number(req.body?.readiness_threshold) || READINESS_THRESHOLD,
    force_readiness: req.body?.force_readiness === true,
    skip_kpi_prerequisite: req.body?.skip_kpi_prerequisite === true
  });
  res.json({ ok: result.activated || result.prepared, ...result });
});

router.post('/deactivate', (req, res) => {
  const result = engine.deactivateSummaryGovernance({
    execute: req.body?.execute === true,
    approved_by: req.body?.approved_by || req.user?.email || req.user?.id,
    tenant_id: req.body?.tenant_id || req.user?.company_id
  });
  res.json({ ok: true, ...result });
});

module.exports = router;
