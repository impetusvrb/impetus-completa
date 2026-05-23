'use strict';

function buildOrchestrationRecommendations(ctx = {}) {
  const recs = [];
  if (ctx.fatigue?.fatigue_detected) {
    recs.push({ id: 'reduce_fatigue', action: 'simplify_dashboard', supervised: true, auto_apply: false });
  }
  if (ctx.usefulness?.low_usefulness) {
    recs.push({ id: 'elevate_usefulness', action: 'prioritize_relevant_domains', supervised: true, auto_apply: false });
  }
  if (ctx.density?.density_adjustment_suggested?.length) {
    recs.push({ id: 'density_review', action: 'review_density_limits', items: ctx.density.density_adjustment_suggested, auto_apply: false });
  }
  if ((ctx.pressure?.cross_domain_pressure ?? 0) > 0.5) {
    recs.push({ id: 'cross_domain_pressure', action: 'rebalance_domains', supervised: true, auto_apply: false });
  }
  if (ctx.convergence && !ctx.convergence.enterprise_aligned) {
    recs.push({ id: 'convergence_watch', action: 'monitor_alignment', supervised: true, auto_apply: false });
  }
  return { recommendations: recs, recommendation_count: recs.length };
}

module.exports = { buildOrchestrationRecommendations };
