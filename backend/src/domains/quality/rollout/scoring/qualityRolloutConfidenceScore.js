'use strict';

/**
 * Confiança operacional agregada para decisão assistiva de rollout.
 */
function computeRolloutConfidence(parts = {}) {
  const m = Math.max(0, Math.min(1, Number(parts.maturity_score) || 0));
  const r = Math.max(0, Math.min(1, Number(parts.readiness_score) || 0));
  const p = Math.max(0, Math.min(1, Number(parts.participation_index) || 0));
  const s = Math.max(0, Math.min(1, 1 - (Number(parts.saturation_score) || 0)));
  const v = 0.35 * m + 0.3 * r + 0.2 * p + 0.15 * s;
  return {
    rollout_confidence: Math.max(0, Math.min(1, v)),
    components: { maturity: m, readiness: r, participation: p, saturation_headroom: s },
    assistive_only: true
  };
}

module.exports = { computeRolloutConfidence };
