'use strict';

const usage = require('../enterprise-shadow-stabilization/enterpriseOperationalUsageCollector');
const behavior = require('../runtime-validation/enterpriseOperationalBehaviorEngine');

const _metrics = new Map();

function recordPilotMetric(tenantId, evt) {
  usage.collectUsageEvent({ ...evt, tenant_id: tenantId });
  const k = String(tenantId || '_global');
  const cur = _metrics.get(k) || {
    adoption_events: 0,
    routes: {},
    dashboards: 0,
    workflows_completed: 0,
    friction_points: 0
  };
  cur.adoption_events += 1;
  if (evt.route) cur.routes[evt.route] = (cur.routes[evt.route] || 0) + 1;
  if (evt.dashboard_view) cur.dashboards += 1;
  if (evt.workflow_completed) cur.workflows_completed += 1;
  if (evt.friction_point) cur.friction_points += 1;
  _metrics.set(k, cur);
  return cur;
}

function summarizePilotMetrics(tenantId) {
  const k = String(tenantId || '_global');
  const local = _metrics.get(k) || {};
  const behaviorSummary = behavior.summarizeOperationalBehavior(tenantId);
  const topRoutes = Object.entries(local.routes || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, count]) => ({ route, count }));
  return {
    ok: true,
    tenant_id: tenantId,
    adoption: {
      events: local.adoption_events || 0,
      unique_routes: topRoutes.length,
      dashboard_views: local.dashboards || 0,
      workflows_completed: local.workflows_completed || 0
    },
    operational_usage: behaviorSummary,
    route_usage: topRoutes,
    friction_points: local.friction_points || 0,
    navigation_patterns: behaviorSummary.aggregates || null,
    cognitive_load_proxy: behaviorSummary.aggregates?.interaction_density_avg ?? null
  };
}

module.exports = { recordPilotMetric, summarizePilotMetrics };
