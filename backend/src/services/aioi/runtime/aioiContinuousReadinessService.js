'use strict';

/**
 * AIOI-P1K.5 — Continuous Readiness Validation
 * READ ONLY · verificações periódicas · sem remediação.
 */

const productionReadiness = require('./aioiProductionReadinessService');
const operationalRisk = require('./aioiOperationalRiskService');
const deploymentGovernance = require('./aioiDeploymentGovernanceService');
const continuousWorker = require('./aioiContinuousWorkerService');

const LAYER = 'AIOI_CONTINUOUS_READINESS';
const MAX_HISTORY = 100;

const _history = [];

async function runContinuousReadinessCheck() {
  const readiness = await productionReadiness.generateProductionReadiness();
  const risk = await operationalRisk.assessOperationalRisk();
  const governance = await deploymentGovernance.generateDeploymentGovernanceStatus();
  const inv = continuousWorker.RUNTIME_INVARIANTS;

  const snapshot = {
    timestamp: new Date().toISOString(),
    readiness_score: readiness.readiness_score,
    overall_ready: readiness.overall_ready,
    overall_risk: risk.overall_risk,
    deployment_eligible: governance.eligible,
    invariants_preserved: !inv.runtime_enabled && !inv.cognitive_execution_allowed
      && inv.auto_execute_band === 'none',
    rollback_ready: governance.production_requirements?.rollback_certified ?? false,
    governance_ready: readiness.governance?.ready ?? false
  };

  _history.push(snapshot);
  if (_history.length > MAX_HISTORY) _history.shift();

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    auto_remediation: false,
    check: snapshot,
    trend: getReadinessTrend(),
    timestamp: snapshot.timestamp
  };
}

function getReadinessHistory({ limit = 20 } = {}) {
  const items = _history.slice(-limit).reverse();
  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    total: _history.length,
    items,
    trend: getReadinessTrend()
  };
}

function getReadinessTrend() {
  if (_history.length < 2) {
    return { direction: 'stable', delta_score: 0, samples: _history.length };
  }
  const recent = _history[_history.length - 1];
  const prev = _history[_history.length - 2];
  const delta = (recent.readiness_score || 0) - (prev.readiness_score || 0);
  return {
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
    delta_score: delta,
    samples: _history.length,
    latest_score: recent.readiness_score,
    latest_risk: recent.overall_risk
  };
}

function resetHistoryForCert() {
  _history.length = 0;
}

module.exports = {
  runContinuousReadinessCheck,
  getReadinessHistory,
  getReadinessTrend,
  resetHistoryForCert,
  LAYER
};
