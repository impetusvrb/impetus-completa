'use strict';

function adviseRolloutScaling(classification = {}, readiness = {}) {
  const actions = [];
  if (classification.classification === 'mature_scalable' && readiness.scaling_safe) {
    actions.push({
      action: 'supervised_expansion_review',
      channels: ['summary'],
      auto: false,
      execute_required: true
    });
  } else if (classification.classification === 'high_risk') {
    actions.push({ action: 'hold_scaling', reason: 'high_risk', auto: false });
  } else {
    actions.push({ action: 'strengthen_governance_maturity', auto: false });
  }
  return { actions, auto_expand: false, chat_blocked: true, boundary_blocked: true };
}

module.exports = { adviseRolloutScaling };
