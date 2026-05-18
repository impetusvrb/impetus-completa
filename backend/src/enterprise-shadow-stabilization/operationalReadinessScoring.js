'use strict';

/**
 * Score operacional consolidado (0–100) para shadow stabilization.
 */
function scoreOperationalReadiness(ctx = {}) {
  const flow = ctx.flow_stability || {};
  const friction = ctx.friction || {};
  const publication = ctx.publication || {};
  const cognitive = ctx.cognitive || {};

  let score = 50;
  if (flow.stable) score += 12;
  if (flow.flow_stability_score >= 70) score += 8;
  if (friction.acceptable) score += 10;
  if (publication.publication_stable) score += 15;
  if (cognitive.rollout_readiness_score >= 50) score += 10;
  if (cognitive.cognitive_maturity_score >= 60) score += 5;
  if (!friction.acceptable) score -= 20;
  if (!publication.publication_stable) score -= 25;
  if (cognitive.saturation_analysis?.cognitive) score -= 20;

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    band: score >= 72 ? 'controlled_ready' : score >= 55 ? 'pilot_ready' : 'remain_in_shadow'
  };
}

module.exports = { scoreOperationalReadiness };
