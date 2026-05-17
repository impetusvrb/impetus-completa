'use strict';

/**
 * SafetyOperationalBehaviorAnalytics — métricas de comportamento operacional real (in-memory, tenant-scoped samples).
 * Aditivo; não altera observability core.
 */

const MAX_SAMPLES = 500;
const _byTenant = new Map();

function bucket(tenantId) {
  const k = String(tenantId || '_global');
  if (!_byTenant.has(k)) {
    _byTenant.set(k, { samples: [], byBand: {} });
  }
  return _byTenant.get(k);
}

/**
 * @param {object} evt
 * @param {string} [evt.tenant_id]
 * @param {string} [evt.user_id]
 * @param {string} [evt.audience_band] operator|coordinator|director|auditor|sst_technician|production
 * @param {string} [evt.route]
 * @param {number} [evt.route_open_ms]
 * @param {number} [evt.screen_dwell_ms]
 * @param {number} [evt.navigation_depth]
 * @param {number} [evt.click_density]
 * @param {boolean} [evt.abandoned]
 * @param {boolean} [evt.denied_route]
 * @param {number} [evt.lazy_chunk_load_ms]
 * @param {number} [evt.visibility_resolution_ms]
 */
function recordBehaviorEvent(evt) {
  const b = bucket(evt.tenant_id);
  const row = {
    ts: Date.now(),
    user_id: evt.user_id || null,
    audience_band: evt.audience_band || 'production',
    route: evt.route || '/',
    route_open_ms: Number(evt.route_open_ms) || 0,
    screen_dwell_ms: Number(evt.screen_dwell_ms) || 0,
    navigation_depth: Number(evt.navigation_depth) || 0,
    click_density: Number(evt.click_density) || 0,
    abandoned: !!evt.abandoned,
    denied_route: !!evt.denied_route,
    lazy_chunk_load_ms: Number(evt.lazy_chunk_load_ms) || 0,
    visibility_resolution_ms: Number(evt.visibility_resolution_ms) || 0,
    repeated_navigation: !!evt.repeated_navigation
  };
  b.samples.unshift(row);
  if (b.samples.length > MAX_SAMPLES) b.samples.length = MAX_SAMPLES;
  const band = row.audience_band;
  if (!b.byBand[band]) b.byBand[band] = { count: 0, denied: 0, abandoned: 0, dwell_sum: 0 };
  const agg = b.byBand[band];
  agg.count += 1;
  if (row.denied_route) agg.denied += 1;
  if (row.abandoned) agg.abandoned += 1;
  agg.dwell_sum += row.screen_dwell_ms;
  return row;
}

function summarizeBehavior(tenantId) {
  const b = bucket(tenantId);
  const samples = b.samples;
  const n = samples.length;
  if (!n) {
    return { ok: true, sample_count: 0, by_band: {}, aggregates: null };
  }
  let denied = 0;
  let abandoned = 0;
  let routeOpenSum = 0;
  let dwellSum = 0;
  let lazySum = 0;
  let visSum = 0;
  let repeated = 0;
  const routeHits = {};
  for (const s of samples) {
    if (s.denied_route) denied += 1;
    if (s.abandoned) abandoned += 1;
    if (s.repeated_navigation) repeated += 1;
    routeOpenSum += s.route_open_ms;
    dwellSum += s.screen_dwell_ms;
    lazySum += s.lazy_chunk_load_ms;
    visSum += s.visibility_resolution_ms;
    routeHits[s.route] = (routeHits[s.route] || 0) + 1;
  }
  const topRoutes = Object.entries(routeHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([route, hits]) => ({ route, hits }));

  return {
    ok: true,
    sample_count: n,
    by_band: { ...b.byBand },
    aggregates: {
      avg_route_open_ms: Math.round(routeOpenSum / n),
      avg_screen_dwell_ms: Math.round(dwellSum / n),
      avg_lazy_chunk_load_ms: Math.round(lazySum / n),
      avg_visibility_resolution_ms: Math.round(visSum / n),
      abandonment_rate: abandoned / n,
      denied_route_rate: denied / n,
      repeated_navigation_rate: repeated / n,
      top_routes: topRoutes
    }
  };
}

module.exports = {
  recordBehaviorEvent,
  summarizeBehavior
};
