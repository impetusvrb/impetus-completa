'use strict';

/**
 * Heatmap de rotas por domínio (quality/safety/logistics/enterprise).
 */
function buildNavigationHeatmap(samples = []) {
  const heat = {};
  for (const s of samples) {
    const route = String(s.route || '/');
    const domain = inferDomain(route);
    const key = `${domain}|${route}`;
    if (!heat[key]) {
      heat[key] = { domain, route, hits: 0, denied: 0, abandoned: 0, dwell_sum: 0 };
    }
    heat[key].hits += 1;
    if (s.denied_route) heat[key].denied += 1;
    if (s.abandoned || s.route_abandonment) heat[key].abandoned += 1;
    heat[key].dwell_sum += Number(s.screen_dwell_ms) || 0;
  }
  const rows = Object.values(heat)
    .map((r) => ({
      ...r,
      avg_dwell_ms: r.hits ? Math.round(r.dwell_sum / r.hits) : 0,
      friction_score: Math.min(100, r.denied * 20 + r.abandoned * 15)
    }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 24);
  return { ok: true, rows, top_routes: rows.slice(0, 8) };
}

function inferDomain(route) {
  if (route.includes('/quality/')) return 'quality';
  if (route.includes('/safety/')) return 'safety';
  if (route.includes('/logistics/')) return 'logistics';
  if (route.includes('chatbot') || route === '/chat') return 'ia_chat';
  if (route === '/app' || route.startsWith('/app/dashboard')) return 'dashboard';
  return 'enterprise';
}

module.exports = { buildNavigationHeatmap, inferDomain };
