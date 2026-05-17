'use strict';

/**
 * Enterprise Decision Engine — sugestão operacional (sem auto-governança).
 */
function deriveEnterpriseDecision(pack) {
  const runtime = pack.runtime_validation || {};
  const ux = pack.ux_validation || {};
  const cog = pack.cognitive_maturity || {};
  const audience = pack.audience_validation || {};
  const rollout = pack.controlled_rollout || {};

  if (!runtime.stable) {
    return {
      action: 'BLOCK_ROLLOUT',
      promote_stage: false,
      adjust_publication: true,
      adjust_audience: true,
      adjust_ux_density: true,
      remain_shadow: true
    };
  }
  if (ux.worst_pressure_class === 'CRITICAL' || cog.cognitive_overload) {
    return {
      action: 'REDUCE_UX_DENSITY',
      promote_stage: false,
      adjust_ux_density: true,
      adjust_publication: true,
      remain_shadow: true
    };
  }
  if (audience.failure_rate > 0.25) {
    return {
      action: 'ADJUST_AUDIENCE',
      promote_stage: false,
      adjust_audience: true,
      remain_shadow: true
    };
  }
  if (rollout.recommended_stage === 'PILOT' && rollout.current_stage === 'SHADOW' && !rollout.blockers?.length) {
    return {
      action: 'ADVANCE_TO_PILOT',
      promote_stage: false,
      manual_only: true,
      target_stage: 'pilot',
      remain_shadow: false
    };
  }
  if (rollout.recommended_stage === 'CONTROLLED' && rollout.current_stage === 'PILOT') {
    return {
      action: 'ADVANCE_TO_CONTROLLED',
      promote_stage: false,
      manual_only: true,
      target_stage: 'controlled'
    };
  }
  return {
    action: 'REMAIN_IN_SHADOW',
    promote_stage: false,
    remain_shadow: rollout.current_stage === 'SHADOW' || !rollout.current_stage,
    manual_only: true
  };
}

module.exports = { deriveEnterpriseDecision };
