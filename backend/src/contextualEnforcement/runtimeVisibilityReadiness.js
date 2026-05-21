'use strict';

const flags = require('./config/phaseZ1FeatureFlags');
const { logPhaseZ1 } = require('./phaseZ1Logger');

function computeRuntimeVisibilityReadiness(matrix = {}, targeting = {}, tenantReady = {}) {
  const base = targeting.targeting_integrity ?? 0.85;
  const tenantFactor = tenantReady.enforcement_ready ? 1 : 0.5;
  const blockPenalty = (matrix.would_block_simulation?.length || 0) * 0.05;

  const readiness_score = Number(Math.max(0.35, Math.min(1, base * tenantFactor - blockPenalty)).toFixed(4));
  const enforcement_risk = readiness_score < 0.7 ? 'high' : readiness_score < 0.85 ? 'medium' : 'low';

  if (readiness_score < 0.7 && flags.isContextualEnforcementObservabilityEnabled()) {
    logPhaseZ1('VISIBILITY_READINESS_LOW', { readiness_score, tenant_id: matrix.tenant_id, shadow_only: true });
  }

  return {
    readiness_score,
    enforcement_risk,
    enforcement_ready: readiness_score >= 0.85 && tenantReady.enforcement_ready === true,
    tenant_blocks_enforcement: !tenantReady.enforcement_ready,
    enforcement_applied: false,
    recommendation_only: true
  };
}

module.exports = { computeRuntimeVisibilityReadiness };
