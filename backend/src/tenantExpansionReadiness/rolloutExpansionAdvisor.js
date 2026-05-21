'use strict';

function adviseRolloutExpansion(readiness = {}, risk = {}) {
  const actions = [];
  if (readiness.ready && !risk.expansion_risky) {
    actions.push({ action: 'eligible_for_supervised_channel_review', channel: 'summary', auto: false });
  } else if (risk.expansion_risky) {
    actions.push({ action: 'hold_expansion', reason: risk.factors, auto: false });
  } else {
    actions.push({ action: 'strengthen_kpi_summary_convergence', auto: false });
  }
  return { actions, auto_expand: false, chat_blocked: true };
}

module.exports = { adviseRolloutExpansion };
