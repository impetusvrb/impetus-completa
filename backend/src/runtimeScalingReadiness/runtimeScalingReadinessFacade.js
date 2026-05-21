'use strict';

const { validateTenantScaling } = require('./tenantScalingValidator');
const { assessScalingReadinessHealth } = require('./scalingReadinessHealth');
const { assessRolloutScalingReadiness } = require('./rolloutScalingReadiness');
const { computeRuntimeScalingReadiness } = require('./runtimeScalingReadiness');

function assessRuntimeScalingReadiness(tenantId, pack = {}) {
  const merged = {
    ...pack,
    classification: pack.expansion?.classification || pack.classification,
    risk: pack.expansion?.risk || pack.risk,
    governance_load_protection: pack.governance_load_protection
  };
  const validator = validateTenantScaling(tenantId, merged);
  const health = assessScalingReadinessHealth({
    scaling_safe: validator.scaling_safe,
    stable: pack.scaling_stability?.scaling_instability_detected !== true
  });
  const rollout = assessRolloutScalingReadiness(validator, health);
  const readiness = computeRuntimeScalingReadiness(tenantId, {
    validator,
    health,
    expansion: pack.expansion || { classification: merged.classification },
    z10: pack.z10
  });

  return {
    phase: 'Z.11',
    tenant_id: tenantId,
    validator,
    health,
    rollout,
    ...readiness,
    rollback_readiness_preserved: pack.rollback_readiness?.summary?.rollback_safe !== false
  };
}

function getRuntimeScalingReadinessStatus(ctx = {}) {
  const flags = require('../runtimeOperationalScaling/config/phaseZ11FeatureFlags');
  return { phase: 'Z.11', layer: 'runtime-scaling-readiness', tenant_id: ctx.tenant_id, observability: flags.isRuntimeExpansionObservabilityEnabled() };
}

module.exports = { assessRuntimeScalingReadiness, getRuntimeScalingReadinessStatus };
