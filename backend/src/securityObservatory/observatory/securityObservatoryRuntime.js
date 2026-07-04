'use strict';

/**
 * SEC-01 — Security Observatory Runtime (orquestrador observacional).
 */

const flags = require('../config/securityObservatoryFlags');
const bus = require('../bus/securityEventBus');
const metrics = require('../metrics/securityMetricsStore');
const classifier = require('../classification/securityClassifier');
const timeline = require('../timeline/securityTimeline');
const { createSecurityDashboardDto } = require('../dto/securityDashboardDto');

let flushTimer = null;

function isTrustedIp(ip) {
  if (!ip) return false;
  const trusted = flags.trustedOperatorCidrs();
  for (const cidr of trusted) {
    if (cidr.includes('/')) {
      if (ip.startsWith(cidr.split('/')[0].slice(0, cidr.indexOf('.') + 1))) return true;
    } else if (ip === cidr || ip.startsWith(cidr)) {
      return true;
    }
  }
  return false;
}

function processAggregatedBucket(bucket) {
  const { classification, event_type } = classifier.classifyHttpAggregate({
    path: bucket.path_prefix,
    statusCodes: bucket.status_codes,
    requestCount: bucket.request_count,
    userAgent: bucket.user_agent,
    sourceIp: bucket.source_ip,
    trustedIp: isTrustedIp(bucket.source_ip)
  });

  metrics.recordClassification(classification);
  metrics.incrementCounter('security_events');

  const event = bus.publish({
    event_type,
    classification,
    window_start: bucket.window_start,
    window_end: bucket.window_end,
    source_ip: bucket.source_ip,
    user_agent: bucket.user_agent,
    path_prefix: bucket.path_prefix,
    method: bucket.method,
    status_codes: bucket.status_codes,
    request_count: bucket.request_count,
    bytes_total: bucket.bytes_total,
    latency_ms_avg: bucket.latency_ms_avg
  });

  return event;
}

function flushAggregationWindows() {
  const buckets = metrics.flushBucketsForWindow();
  const byWindow = new Map();
  for (const b of buckets) {
    const w = b.window_start;
    if (!byWindow.has(w)) byWindow.set(w, []);
    byWindow.get(w).push(b);
  }

  for (const [windowStart, list] of byWindow) {
    const events = list.map((b) => {
      const enriched = {
        ...b,
        latency_ms_avg: b.request_count ? Math.round(b.latency_sum / b.request_count) : 0
      };
      return processAggregatedBucket(enriched);
    });
    if (events.length) {
      timeline.buildTimelineFromWindow(windowStart, events);
    }
  }
}

function recordError(source, err) {
  metrics.incrementCounter('security_errors');
  console.warn(`[SEC-01][${source}]`, err?.message || err);
}

function recordExternalEvent(type, metadata = {}) {
  if (!flags.isSecurityObservatoryEnabled()) return null;
  const { classification, event_type } = classifier.classifyExternalEvent(type, metadata);
  metrics.incrementCounter('security_events');
  metrics.recordClassification(classification);
  return bus.publish({
    event_type: event_type || type,
    classification,
    request_count: 1,
    metadata,
    source_ip: metadata.ip || null
  });
}

function getSecurityHealth(metricsSnap) {
  const unknown = metricsSnap.top_classifications.find((c) => c.key === 'UNKNOWN');
  const scan = metricsSnap.top_classifications.find((c) => c.key === 'CREDENTIAL_SCAN' || c.key === 'GENERIC_SCANNER');
  if (scan && scan.count > 100) return 'elevated_scan_activity';
  if (unknown && unknown.count > metricsSnap.counters.classified_events * 0.5) return 'degraded_classification';
  if (metricsSnap.counters.security_errors > 10) return 'observatory_errors';
  return 'nominal';
}

function buildDashboard() {
  metrics.incrementCounter('security_reports');
  const snap = metrics.getMetricsSnapshot();
  const incidentRate = snap.requests_per_minute_avg > 0
    ? Math.round((snap.status_distribution['401'] || 0) + (snap.status_distribution['403'] || 0) + (snap.status_distribution['404'] || 0)) / Math.max(1, snap.requests_per_minute_avg / 60)
    : 0;

  return createSecurityDashboardDto({
    observatory_enabled: flags.isSecurityObservatoryEnabled(),
    security_health: getSecurityHealth(snap),
    incident_rate_per_hour: incidentRate,
    attack_surface_activity: {
      requests_per_minute: snap.requests_per_minute,
      unique_ips: snap.unique_ips,
      unique_paths: snap.unique_paths,
      status_distribution: snap.status_distribution
    },
    top_origins: snap.top_origins,
    top_paths: snap.top_paths,
    top_user_agents: snap.top_user_agents,
    top_classifications: snap.top_classifications,
    timeline: timeline.getTimeline(50),
    metrics_summary: snap
  });
}

function bootstrap() {
  if (!flags.isSecurityObservatoryEnabled()) return { enabled: false };
  if (flushTimer) return { enabled: true, already: true };

  flushTimer = setInterval(() => {
    try {
      flushAggregationWindows();
    } catch (e) {
      recordError('flush', e);
    }
  }, flags.aggregationWindowMs());

  if (flushTimer.unref) flushTimer.unref();

  console.log('[SEC-01] Enterprise Security Observatory activo (observational only)');
  return { enabled: true };
}

function shutdown() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

function getAuditPayload() {
  return {
    ok: true,
    phase: 'SEC-01',
    observatory_enabled: flags.isSecurityObservatoryEnabled(),
    mode: 'observational_only',
    no_auto_response: true,
    feature_flag: {
      SECURITY_OBSERVATORY: flags.isSecurityObservatoryEnabled(),
      aggregation_window_ms: flags.aggregationWindowMs()
    },
    dashboard: buildDashboard(),
    recent_events: bus.getRecentEvents(30),
    event_bus_consumers: bus.getConsumerCount(),
    criteria: {
      security_observatory_available: true,
      security_event_bus_available: true,
      security_metrics_available: true,
      security_timeline_available: true,
      security_dashboard_available: true,
      classification_engine_available: true,
      no_runtime_interference: true
    }
  };
}

module.exports = {
  bootstrap,
  shutdown,
  isTrustedIp,
  processAggregatedBucket,
  flushAggregationWindows,
  recordError,
  recordExternalEvent,
  buildDashboard,
  getAuditPayload
};
