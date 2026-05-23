'use strict';

function protectExecutiveAttention(payload = {}) {
  const exec = payload.executive_cognitive_runtime;
  if (!exec?.consolidation_applied) return { applicable: false };
  const alerts = (payload.executive_cognitive_centers || []).filter((c) => c.render_slot === 'alertas').length;
  return {
    applicable: true,
    executive_attention_pressure: alerts > 2,
    recommend_simplify: alerts > 2,
    strategic_only: true
  };
}

module.exports = { protectExecutiveAttention };
