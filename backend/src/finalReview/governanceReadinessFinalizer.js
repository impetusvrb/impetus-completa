'use strict';

const { assessGovernanceHealth } = require('./governanceHealthAssessment');
const { assessOperationalMaturity } = require('./governanceOperationalAssessment');
const { assessStability } = require('./governanceStabilityAssessment');

/**
 * Score final consolidado — formato enterprise.
 */
function finalizeReadiness(ctx = {}) {
  const health = assessGovernanceHealth(ctx);
  const operational = assessOperationalMaturity(ctx);
  const stability = assessStability(ctx);

  const shadow_alignment = health.shadow_summary?.shadow_alignment ?? 0.9;
  const leakage_risk = health.readiness_summary?.leakage_risk ?? 'low';
  const overblocking_risk = health.readiness_summary?.overblocking_risk ?? 'low';

  let rollout_readiness = 'observe_shadow';
  const gh = health.governance_health;
  if (gh >= 90 && stability.runtime_stability === 'stable' && leakage_risk === 'low') {
    rollout_readiness = 'safe_gradual_activation';
  } else if (gh >= 75) {
    rollout_readiness = 'cautious_staged_activation';
  } else if (gh >= 60) {
    rollout_readiness = 'readiness_gaps_present';
  } else {
    rollout_readiness = 'not_ready';
  }

  let production_status = 'staging_ready';
  if (gh >= 92 && stability.runtime_stability === 'stable' && operational.operational_maturity === 'enterprise') {
    production_status = 'enterprise_ready';
  } else if (gh >= 80) {
    production_status = 'production_candidate';
  }

  return {
    governance_health: gh,
    runtime_stability: stability.runtime_stability,
    shadow_alignment: Number(shadow_alignment.toFixed ? shadow_alignment.toFixed(2) : shadow_alignment),
    leakage_risk,
    overblocking_risk,
    rollout_readiness,
    production_status,
    activation_readiness: health.readiness_summary?.readiness_score ?? null,
    tenant_isolation_confidence: stability.tenant_isolation_confidence,
    explainability_maturity: operational.explainability_maturity,
    operational_maturity: operational.operational_maturity,
    auto_activation: false,
    assessed_at: new Date().toISOString()
  };
}

module.exports = { finalizeReadiness };
