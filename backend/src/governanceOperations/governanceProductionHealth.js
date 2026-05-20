'use strict';

const phaseJ = require('./config/phaseJFeatureFlags');
const { evaluateRuntimeStability } = require('./governanceRuntimeStability');
const { computeOperationalMetrics } = require('./governanceOperationalMetrics');
const { logPhaseJ } = require('./phaseJLogger');

function computeProductionHealth(ctx = {}) {
  if (!phaseJ.isGovernanceRuntimeHealthEnabled() && !ctx.force) {
    return {
      enabled: false,
      production_ready: null,
      auto_remediation: false
    };
  }

  const stability = evaluateRuntimeStability(ctx);
  const metrics = computeOperationalMetrics(ctx);
  const production_ready =
    metrics.governance_operational_health >= 0.7 &&
    stability.status !== 'unstable' &&
    metrics.governance_activation_safety >= 60;

  if (!production_ready && stability.status === 'unstable') {
    logPhaseJ('GOVERNANCE_RUNTIME_DEGRADED', {
      stability: stability.status,
      operational_health: metrics.governance_operational_health
    });
  }

  return {
    enabled: true,
    production_ready,
    stability,
    metrics,
    residual_leakage_risk: metrics.governance_drift_pressure > 0.6 ? 'elevated' : 'controlled',
    false_positive_pressure: metrics.governance_incident_rate,
    overblocking_pressure: stability.overblocking_rate,
    auto_remediation: false,
    assessed_at: new Date().toISOString()
  };
}

module.exports = { computeProductionHealth };
