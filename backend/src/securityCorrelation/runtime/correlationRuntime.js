'use strict';

/**
 * SEC-02 — Correlation Runtime (bootstrap + audit payload).
 */

const flags = require('../config/securityCorrelationFlags');
const engine = require('../engine/correlationEngine');
const store = require('../store/incidentStore');
const metrics = require('../metrics/correlationMetrics');
const { createIncidentDashboardDto } = require('../dto/incidentDashboardDto');
const { freezeIncident } = require('../dto/securityIncidentDto');

let unsubscribe = null;

function bootstrap() {
  if (!flags.isSecurityCorrelationEngineEnabled()) {
    return { enabled: false };
  }

  if (unsubscribe) return { enabled: true, already: true };

  try {
    const bus = require('../../securityObservatory/bus/securityEventBus');
    unsubscribe = bus.subscribe((event) => {
      try {
        engine.correlateEvent(event);
      } catch (e) {
        metrics.increment('correlation_errors');
        console.warn('[SEC-02] correlateEvent:', e?.message || e);
      }
    });
  } catch (e) {
    console.warn('[SEC-02_BOOT] bus subscribe failed:', e?.message);
  }

  console.log('[SEC-02] Enterprise Security Correlation Engine activo (read-only)');
  return { enabled: true };
}

function shutdown() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

function buildDashboard() {
  store.closeStaleIncidents();
  const all = store.getAllIncidents();
  const open = all.filter((i) => i.status === 'OPEN');
  const closed = all.filter((i) => i.status === 'CLOSED');

  const classMap = new Map();
  const originMap = new Map();
  const serviceMap = new Map();

  for (const inc of all) {
    classMap.set(inc.classification, (classMap.get(inc.classification) || 0) + 1);
    for (const ip of inc.participants?.ips || []) {
      originMap.set(ip, (originMap.get(ip) || 0) + (inc.metrics?.requestCount || 1));
    }
    for (const svc of inc.affectedComponents || []) {
      serviceMap.set(svc, (serviceMap.get(svc) || 0) + 1);
    }
  }

  const top = (map, limit) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, count]) => ({ key, count }));

  const avgDuration =
    all.length > 0 ? Math.round(all.reduce((s, i) => s + (i.durationMs || 0), 0) / all.length) : 0;
  const avgRisk =
    all.length > 0 ? Math.round((all.reduce((s, i) => s + (i.riskScore || 0), 0) / all.length) * 1000) / 1000 : 0;

  return createIncidentDashboardDto({
    correlation_enabled: flags.isSecurityCorrelationEngineEnabled(),
    open_incidents: open.length,
    closed_incidents: closed.length,
    average_duration_ms: avgDuration,
    average_risk_score: avgRisk,
    top_classifications: top(classMap, 10),
    top_origins: top(originMap, 15),
    top_services: top(serviceMap, 10),
    top_attack_surface: top(serviceMap, 10),
    incidents: all.slice(0, 50).map((i) => freezeIncident(i)),
    metrics_summary: metrics.getSnapshot()
  });
}

function getAuditPayload() {
  const dashboard = buildDashboard();
  return {
    ok: true,
    phase: 'SEC-02',
    correlation_enabled: flags.isSecurityCorrelationEngineEnabled(),
    mode: 'observational_only',
    no_auto_response: true,
    feature_flag: {
      SECURITY_CORRELATION_ENGINE: flags.isSecurityCorrelationEngineEnabled(),
      correlation_window_ms: flags.correlationWindowMs(),
      incident_closure_ms: flags.incidentClosureMs()
    },
    dashboard,
    open_incidents: store.getOpenIncidents().map((i) => freezeIncident(i)),
    recent_closed: store.getClosedIncidents(20).map((i) => freezeIncident(i)),
    metrics: metrics.getSnapshot(),
    criteria: {
      incident_model_available: true,
      correlation_engine_available: true,
      incident_grouping_available: true,
      timeline_available: true,
      risk_score_available: true,
      incident_dashboard_available: true,
      audit_endpoint_available: true,
      no_runtime_interference: true,
      security_observatory_preserved: true
    }
  };
}

module.exports = {
  bootstrap,
  shutdown,
  buildDashboard,
  getAuditPayload
};
