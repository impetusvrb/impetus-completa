'use strict';

/**
 * AIOI-P1L.5 — Production Shadow Comparison
 * P1K baseline vs execução operacional certificada · READ ONLY.
 */

const productionReadiness = require('./aioiProductionReadinessService');
const deploymentGovernance = require('./aioiDeploymentGovernanceService');
const runtimeAggregation = require('./aioiRuntimeAggregationService');

const LAYER = 'AIOI_OPERATIONAL_SHADOW';

let _p1kBaseline = null;
let _lastComparison = null;

async function captureP1kBaseline() {
  const [readiness, governance, aggregates] = await Promise.all([
    productionReadiness.generateProductionReadiness(),
    deploymentGovernance.generateDeploymentGovernanceStatus(),
    runtimeAggregation.getRuntimeAggregateMetrics()
  ]);

  _p1kBaseline = {
    captured_at: new Date().toISOString(),
    readiness_score: readiness.readiness_score,
    overall_ready: readiness.overall_ready,
    overall_risk: readiness.governance?.overall_risk,
    deployment_eligible: governance.eligible,
    invariants: readiness.invariants,
    outbox_total: aggregates.outbox_total,
    ioe_total: aggregates.ioe_total,
    snapshots_total: aggregates.snapshots_total
  };

  return _p1kBaseline;
}

async function compareProductionShadow(operationalMetrics = {}) {
  if (!_p1kBaseline) {
    await captureP1kBaseline();
  }

  const [readiness, aggregates] = await Promise.all([
    productionReadiness.generateProductionReadiness(),
    runtimeAggregation.getRuntimeAggregateMetrics()
  ]);

  const current = {
    readiness_score: readiness.readiness_score,
    overall_ready: readiness.overall_ready,
    outbox_total: aggregates.outbox_total,
    ioe_total: aggregates.ioe_total,
    snapshots_total: aggregates.snapshots_total,
    events_processed: operationalMetrics.events_processed ?? 0,
    duplicates: operationalMetrics.duplicates ?? 0
  };

  const variances = [];
  if (_p1kBaseline.overall_ready !== current.overall_ready) {
    variances.push({ field: 'overall_ready', baseline: _p1kBaseline.overall_ready, current: current.overall_ready });
  }
  if (Math.abs((_p1kBaseline.readiness_score || 0) - (current.readiness_score || 0)) > 20) {
    variances.push({ field: 'readiness_score', baseline: _p1kBaseline.readiness_score, current: current.readiness_score });
  }
  if ((operationalMetrics.duplicates || 0) > 0) {
    variances.push({ field: 'duplicates', baseline: 0, current: operationalMetrics.duplicates });
  }

  const behaviorMatch = variances.length === 0;
  const unexpectedVariance = variances.length;

  _lastComparison = {
    ok: true,
    layer: LAYER,
    read_only: true,
    behavior_match: behaviorMatch,
    unexpected_variance: unexpectedVariance,
    shadow_comparison_certified: behaviorMatch,
    baseline: _p1kBaseline,
    current,
    variances,
    timestamp: new Date().toISOString()
  };

  return _lastComparison;
}

function getLastShadowComparison() {
  return _lastComparison || {
    ok: true,
    layer: LAYER,
    read_only: true,
    behavior_match: null,
    unexpected_variance: 0,
    note: 'no_shadow_comparison_yet'
  };
}

function resetBaselineForCert() {
  _p1kBaseline = null;
  _lastComparison = null;
}

module.exports = {
  captureP1kBaseline,
  compareProductionShadow,
  getLastShadowComparison,
  resetBaselineForCert,
  LAYER
};
