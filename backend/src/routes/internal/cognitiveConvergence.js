'use strict';

const express = require('express');
const router = express.Router();

const phaseM = require('../../cognitiveConvergence/config/phaseMFeatureFlags');
const facade = require('../../cognitiveConvergence/cognitiveConvergenceFacade');
const { getRuntimeTruthState } = require('../../cognitiveConvergence/runtimeTruthState');
const { validateCognitiveConsistency } = require('../../cognitiveConvergence/cognitiveConsistencyValidator');
const { detectContextDrift } = require('../../cognitiveConvergence/contextDriftDetector');
const { detectFragmentation } = require('../../cognitiveConvergence/runtimeTruthDeviationDetector');
const { buildCompositionGraph } = require('../../cognitiveConvergence/contextCompositionGraph');
const { buildCognitiveDependencyGraph } = require('../../cognitiveConvergence/cognitiveDependencyGraph');
const { getConvergenceTelemetry } = require('../../cognitiveConvergence/cognitiveConvergenceTelemetry');
const { getSemanticDriftHistory } = require('../../cognitiveConvergence/semanticDriftTracker');
const { listDecisionTrace } = require('../../cognitiveConvergence/runtimeDecisionTrace');

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
    phase: 'M',
    observability: phaseM.isCognitiveConvergenceObservabilityEnabled(),
    shadow_first: true,
    enforcement_default: false,
    flags: facade.getConvergenceReport().flags
  });
});

router.get('/truth-state', (req, res) => {
  const user = req.user;
  const ctx = { functional_axis: req.query.axis, force_observe: true };
  const unified = facade.buildUnifiedCognitiveContext(user, ctx);
  const cached = getRuntimeTruthState(user, ctx);
  res.json({
    ok: true,
    runtime_truth_state: unified.runtime_truth_state,
    cached,
    shadow_only: unified.shadow_only
  });
});

router.get('/consistency', (req, res) => {
  const validation = validateCognitiveConsistency({
    runtime_axis: req.query.axis,
    widget_domain: req.query.widget_domain
  });
  res.json({ ok: true, ...validation, telemetry: getConvergenceTelemetry() });
});

router.get('/drift', (req, res) => {
  res.json({
    ok: true,
    drift_sample: detectContextDrift(
      req.query.prev_axis ? { contextual_truth: { functional_axis: req.query.prev_axis } } : null,
      { contextual_truth: { functional_axis: req.query.axis || req.user?.functional_axis } }
    ),
    semantic_history: getSemanticDriftHistory(15)
  });
});

router.get('/fragmentation', (req, res) => {
  const graph = buildCompositionGraph({ tenant_id: req.query.tenant_id });
  res.json({ ok: true, ...detectFragmentation(graph), graph });
});

router.get('/dependencies', (req, res) => {
  res.json({ ok: true, ...buildCognitiveDependencyGraph() });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    ...facade.getConvergenceReport(),
    decision_trace: listDecisionTrace(Number(req.query.limit) || 25)
  });
});

module.exports = router;
