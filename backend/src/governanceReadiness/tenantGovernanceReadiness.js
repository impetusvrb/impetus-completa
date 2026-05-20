'use strict';

const { assessReadiness } = require('./governanceReadinessEngine');
const { buildTenantRiskProfile } = require('./tenantGovernanceRiskProfile');
const { buildActivationPlan } = require('./governanceActivationPlanner');

/**
 * Readiness por tenant — scoring apenas.
 */
function evaluateTenantReadiness(tenant = {}, tenantMetrics = {}) {
  const profile = buildTenantRiskProfile(tenant);
  const global = assessReadiness({
    force: true,
    metrics: tenantMetrics,
    telemetry_coverage: tenantMetrics.telemetry_coverage ?? 0.8
  });

  let tenant_readiness_score = global.readiness_score;
  if (profile.sensitivity === 'critical') tenant_readiness_score = Math.min(tenant_readiness_score, 75);
  if (profile.requires_extended_shadow && global.shadow_alignment_rate < 0.95) {
    tenant_readiness_score = Math.min(tenant_readiness_score, 70);
  }

  const plan = buildActivationPlan({ ...global, readiness_score: tenant_readiness_score, force: true });

  return {
    tenant_id: profile.tenant_id,
    tenant_readiness_score,
    risk_profile: profile,
    global_readiness: global,
    activation_plan: plan,
    auto_activation: false,
    recommendation:
      tenant_readiness_score >= 85 && profile.sensitivity === 'standard' ?
        'tenant_staged_activation_candidate' :
        tenant_readiness_score >= 70 ?
          'continue_shadow_per_tenant' :
          'not_ready_for_tenant'
  };
}

module.exports = { evaluateTenantReadiness };
