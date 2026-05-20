'use strict';

const express = require('express');
const router = express.Router();

const phaseQ = require('../../runtimeConsistency/config/phaseQFeatureFlags');
const facade = require('../../runtimeConsistency/runtimeConsistencyFacade');
const { assessCognitiveConsistency } = require('../../runtimeConsistency/cognitiveConsistencyEngine');
const { coordinateInterchannelConsistency } = require('../../runtimeConsistency/interchannelConsistencyCoordinator');
const { evaluateRuntimeTemporalConsistency } = require('../../runtimeConsistency/runtimeTemporalConsistency');
const { synchronizeRuntimeTruth } = require('../../runtimeConsistency/runtimeTruthSynchronizer');
const { getConsistencyTelemetry } = require('../../runtimeConsistency/consistencyTelemetry');

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
    phase: 'Q',
    observability: phaseQ.isRuntimeConsistencyObservabilityEnabled(),
    shadow_first: true,
    flags: facade.getConsistencyReport().flags
  });
});

router.get('/interchannel', (req, res) => {
  const axis = req.query.axis || req.user?.functional_axis;
  const channels = {
    dashboard: { axis },
    kpi: { domain: req.query.kpi_axis || axis },
    summary: { runtime_truth_reference: req.query.summary_axis || axis },
    chat: { context_axis: req.query.chat_axis || axis }
  };
  res.json({ ok: true, ...coordinateInterchannelConsistency(req.user, channels, { functional_axis: axis }) });
});

router.get('/temporal', (req, res) => {
  const sync = synchronizeRuntimeTruth(req.user, {}, { functional_axis: req.query.axis });
  res.json({ ok: true, ...evaluateRuntimeTemporalConsistency(req.user, sync, { functional_axis: req.query.axis }) });
});

router.get('/conflicts', (req, res) => {
  const sources = {};
  if (req.query.a) sources.runtime_truth_state = { authority: { contextual_truth: { functional_axis: req.query.a } } };
  if (req.query.b) sources.cognitive_convergence = { runtime_truth_state: { authority: { contextual_truth: { functional_axis: req.query.b } } } };
  const sync = synchronizeRuntimeTruth(req.user, sources, { functional_axis: req.query.a });
  res.json({ ok: true, sync, conflict: sync.conflict });
});

router.get('/synchronization', (req, res) => {
  res.json({
    ok: true,
    ...synchronizeRuntimeTruth(
      req.user,
      { contextual_delivery: { targeting: { domain: { domain: req.query.axis } } } },
      { functional_axis: req.query.axis }
    )
  });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, ...facade.getConsistencyReport(), telemetry: getConsistencyTelemetry() });
});

module.exports = router;
