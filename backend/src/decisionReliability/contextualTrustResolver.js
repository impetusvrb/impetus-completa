'use strict';

function resolveContextualTrust(ctx = {}) {
  const axis = ctx.functional_axis || ctx.canonical_axis;
  const confidence = ctx.contextual_delivery_confidence ?? ctx.cognitive_consistency_score ?? 0.85;
  return {
    axis,
    contextual_trust: Number((confidence * (axis && axis !== 'general' ? 1 : 0.85)).toFixed(4)),
    uncertain: !axis || axis === 'general'
  };
}

module.exports = { resolveContextualTrust };
