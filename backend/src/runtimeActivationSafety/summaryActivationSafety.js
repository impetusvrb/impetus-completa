'use strict';

function assessSummaryActivationSafety(ctx = {}) {
  const activation = ctx.summary_runtime_activation;
  const safe = !activation || (activation.narrative_fabricated !== true && activation.narrative_rewritten !== true);
  return { summary_safe: safe, enforcement_active: activation?.enforcement_applied === true, recommendation_only: true };
}

module.exports = { assessSummaryActivationSafety };
