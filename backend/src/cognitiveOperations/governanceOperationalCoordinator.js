'use strict';

const { getCognitiveOperationalState, updateOperationalState } = require('./cognitiveOperationalState');

function coordinateGovernanceOperations(ctx = {}) {
  const state = getCognitiveOperationalState();
  const layers = {
    policy: ctx.policy_active !== false,
    semantic: Boolean(ctx.semantic_alignment),
    precision: Boolean(ctx.precision_delivery),
    convergence: Boolean(ctx.cognitive_convergence)
  };
  const activeCount = Object.values(layers).filter(Boolean).length;
  const overload_risk = activeCount >= 4 && (ctx.cognitive_operational_pressure || 0) > 0.6;

  updateOperationalState({
    governance_layers: layers,
    overload_risk
  });

  return {
    layers,
    active_layers: activeCount,
    governance_operational_health: Number(Math.max(0.5, 1 - activeCount * 0.05).toFixed(4)),
    overload_risk,
    lifecycle: state.lifecycle
  };
}

module.exports = { coordinateGovernanceOperations };
