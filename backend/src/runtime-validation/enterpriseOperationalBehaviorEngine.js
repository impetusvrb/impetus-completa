'use strict';

const { resolveEnterpriseBand } = require('./enterpriseRuntimeProfiles');

const MAX_SAMPLES = 800;
const _byTenant = new Map();

function bucket(tenantId) {
  const k = String(tenantId || '_global');
  if (!_byTenant.has(k)) _byTenant.set(k, { samples: [], byBand: {} });
  return _byTenant.get(k);
}

/**
 * @param {object} evt
 */
function recordOperationalEvent(evt) {
  const band = evt.audience_band || resolveEnterpriseBand({ role: evt.role, functional_area: evt.functional_area });
  const b = bucket(evt.tenant_id);
  const row = {
    ts: Date.now(),
    audience_band: band,
    route: evt.route || '/',
    navigation_depth: Number(evt.navigation_depth) || 0,
    route_abandonment: !!evt.route_abandonment || !!evt.abandoned,
    interaction_density: Number(evt.interaction_density) || Number(evt.click_density) || 0,
    repetitive_actions: Number(evt.repetitive_actions) || (evt.repeated_navigation ? 1 : 0),
    operational_completion_ms: Number(evt.operational_completion_ms) || 0,
    publication_resolution_ms: Number(evt.publication_resolution_ms) || Number(evt.visibility_resolution_ms) || 0,
    denied_route: !!evt.denied_route,
    audience_resolution_ms: Number(evt.audience_resolution_ms) || 0,
    contextual_switching: Number(evt.contextual_switching_frequency) || 0,
    operational_focus: Number(evt.operational_focus) || 0
  };
  b.samples.unshift(row);
  if (b.samples.length > MAX_SAMPLES) b.samples.length = MAX_SAMPLES;
  const agg = b.byBand[band] || { count: 0, denied: 0, abandoned: 0, depth_sum: 0 };
  agg.count += 1;
  if (row.denied_route) agg.denied += 1;
  if (row.route_abandonment) agg.abandoned += 1;
  agg.depth_sum += row.navigation_depth;
  b.byBand[band] = agg;
  return row;
}

function summarizeOperationalBehavior(tenantId) {
  const b = bucket(tenantId);
  const samples = b.samples;
  const n = samples.length;
  if (!n) {
    return { ok: true, sample_count: 0, by_band: b.byBand, aggregates: null };
  }
  let denied = 0;
  let abandoned = 0;
  let depthSum = 0;
  let pubSum = 0;
  let completionSum = 0;
  let repetitive = 0;
  let switching = 0;
  const routeHits = {};
  for (const s of samples) {
    if (s.denied_route) denied += 1;
    if (s.route_abandonment) abandoned += 1;
    depthSum += s.navigation_depth;
    pubSum += s.publication_resolution_ms;
    completionSum += s.operational_completion_ms;
    repetitive += s.repetitive_actions;
    switching += s.contextual_switching;
    routeHits[s.route] = (routeHits[s.route] || 0) + 1;
  }
  const topRoutes = Object.entries(routeHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([route, count]) => ({ route, count }));

  return {
    ok: true,
    sample_count: n,
    by_band: b.byBand,
    aggregates: {
      navigation_depth_avg: depthSum / n,
      route_usage: topRoutes,
      route_abandonment_rate: abandoned / n,
      denied_route_rate: denied / n,
      interaction_density_avg: samples.reduce((a, s) => a + s.interaction_density, 0) / n,
      repetitive_actions_total: repetitive,
      operational_completion_ms_avg: completionSum / n,
      publication_resolution_ms_avg: pubSum / n,
      audience_resolution_ms_avg:
        samples.reduce((a, s) => a + s.audience_resolution_ms, 0) / n,
      contextual_switching_frequency_avg: switching / n,
      operational_focus_avg: samples.reduce((a, s) => a + s.operational_focus, 0) / n
    }
  };
}

module.exports = {
  recordOperationalEvent,
  summarizeOperationalBehavior
};
