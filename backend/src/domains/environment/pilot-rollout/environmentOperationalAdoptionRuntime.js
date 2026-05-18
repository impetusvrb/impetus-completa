'use strict';

const behavior = require('../../../runtime-validation/enterpriseOperationalBehaviorEngine');

function environmentOperationalAdoptionRuntime(tenantId, ctx = {}) {
  const summary = behavior.summarizeOperationalBehavior(tenantId);
  const samples = summary.sample_count || 0;
  const density = summary.aggregates?.interaction_density_avg ?? 0;
  const adoption = Math.min(1, samples / 20 + density * 0.5 + (ctx.module_active ? 0.2 : 0));
  return {
    adoption_score: Math.round(adoption * 100) / 100,
    sample_count: samples,
    route_resolution_time_ms: summary.aggregates?.publication_resolution_ms_avg ?? null,
    operational_navigation_depth: summary.aggregates?.navigation_depth_avg ?? null,
    assistive_only: true
  };
}

function environmentOperationalBehaviorRuntime(evt) {
  return behavior.recordOperationalEvent({ ...evt, domain: 'environment' });
}

function environmentAudienceBehaviorRuntime(tenantId, band) {
  const summary = behavior.summarizeOperationalBehavior(tenantId);
  return {
    band,
    events: summary.sample_count || 0,
    top_routes: (summary.aggregates?.top_routes || []).slice(0, 5)
  };
}

module.exports = {
  environmentOperationalAdoptionRuntime,
  environmentOperationalBehaviorRuntime,
  environmentAudienceBehaviorRuntime
};
