'use strict';

function validateOperationalTargeting(user, ctx = {}) {
  const confidence = ctx.contextual_delivery_confidence ?? ctx.contextual_delivery?.contextual_delivery_confidence ?? 0.85;
  const conflicts = (ctx.contextual_delivery?.conflicts?.contextual?.conflict_detected ? 1 : 0) +
    (ctx.contextual_delivery?.conflicts?.hierarchy?.hierarchy_conflict ? 1 : 0);
  return {
    valid: confidence >= 0.7 && conflicts === 0,
    targeting_confidence: Number(confidence.toFixed(4)),
    conflict_count: conflicts
  };
}

module.exports = { validateOperationalTargeting };
