'use strict';

/**
 * Fase 5 — decisão ENVIRONMENT (BLOCK_ENVIRONMENT | ENVIRONMENT_READY).
 */
function decideEnvironmentReadiness(consolidationPack) {
  const reasons = [];
  const runtime = consolidationPack.ecosystem_runtime || {};
  const soak = consolidationPack.stability_soak || {};
  const cognitive = consolidationPack.cognitive_maturity_index || {};
  const governance = consolidationPack.governance_validation || {};

  if (!runtime.stable) reasons.push('ecosystem_runtime_unstable');
  if (!soak.stable) reasons.push('stability_soak_failed');
  if (!governance.ok) reasons.push('governance_validation_failed');
  if (!cognitive.acceptable_for_environment) reasons.push('cognitive_maturity_below_threshold');
  if (cognitive.enterprise_cognitive_maturity_index < 45) {
    reasons.push('ecmi_below_45');
  }
  if (runtime.shadow_cycle?.rollout_recommendation?.recommended_status === 'remain_in_shadow' && reasons.length > 2) {
    reasons.push('domains_remain_shadow');
  }

  const decision = reasons.length === 0 ? 'ENVIRONMENT_READY' : 'BLOCK_ENVIRONMENT';

  return {
    ok: true,
    decision,
    environment_ready: decision === 'ENVIRONMENT_READY',
    block_environment: decision === 'BLOCK_ENVIRONMENT',
    reasons,
    prerequisites_met: {
      quality_safety_logistics_stable: runtime.stable,
      soak_passed: soak.stable,
      cognitive_ok: cognitive.acceptable_for_environment,
      governance_ok: governance.ok,
      no_full_rollout: true
    },
    manual_sign_off_required: decision === 'ENVIRONMENT_READY',
    assistive_only: true
  };
}

module.exports = { decideEnvironmentReadiness };
