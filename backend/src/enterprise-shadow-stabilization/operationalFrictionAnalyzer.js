'use strict';

/**
 * Fricção operacional — abandono, denied, saturação de interação.
 */
function analyzeOperationalFriction(ctx = {}) {
  const agg = ctx.aggregates || {};
  const abandonment = Number(agg.route_abandonment_rate) || 0;
  const denied = Number(agg.denied_route_rate) || 0;
  const density = Number(agg.interaction_density_avg) || 0;
  const switching = Number(agg.contextual_switching_frequency_avg) || 0;

  const frictionScore = Math.min(
    100,
    Math.round(abandonment * 80 + denied * 100 + density * 0.5 + switching * 2)
  );
  const issues = [];
  if (abandonment > 0.3) issues.push({ code: 'high_abandonment', severity: 'high' });
  if (denied > 0.15) issues.push({ code: 'high_denied_routes', severity: 'high' });
  if (density > 22) issues.push({ code: 'interaction_saturation', severity: 'medium' });
  if (switching > 8) issues.push({ code: 'context_switching_fatigue', severity: 'medium' });

  return {
    ok: true,
    friction_score: frictionScore,
    acceptable: frictionScore < 55,
    issues,
    metrics: { abandonment, denied, density, switching }
  };
}

module.exports = { analyzeOperationalFriction };
