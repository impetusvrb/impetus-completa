'use strict';

function monitorContextualIntegrity(ctx = {}) {
  const unification = ctx.contextual_unification_score ?? ctx.contextual_precision_score ?? 0.84;
  const drift = ctx.drift_detected === true ? -0.15 : 0;
  const contextual_integrity = Number(Math.max(0, Math.min(1, unification + drift)).toFixed(4));
  return { contextual_integrity, drift_penalty: drift !== 0 };
}

module.exports = { monitorContextualIntegrity };
