'use strict';

function assessSidebarGovernanceHealth(resolution = {}) {
  const score = resolution.governance_score ?? 0;
  let status = 'healthy';
  if (resolution.leakage_detected && !resolution.governance_applied) status = 'leakage_observed';
  else if (resolution.leakage_detected && resolution.governance_applied) status = 'hardening_active';
  else if (score < 0.6) status = 'degraded';
  return {
    status,
    governance_score: score,
    governance_applied: resolution.governance_applied === true,
    fallback_applied: resolution.fallback_applied === true,
    leakage_count: resolution.leakage_after?.leakage_count || 0
  };
}

module.exports = { assessSidebarGovernanceHealth };
