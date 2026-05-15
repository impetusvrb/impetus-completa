'use strict';

/**
 * IMPETUS — Enterprise Observability Service (Fase 5)
 * Telemetria enterprise-grade com traces, métricas Prometheus-like,
 * cold storage strategy e monitoring distribuído.
 *
 * Consolida e estende: observabilityService, resilienceMetricsService,
 * unifiedPerformanceService, architectureHealthService.
 *
 * Feature flag: IMPETUS_ENTERPRISE_OBSERVABILITY_ENABLED (default: true)
 */

const { v4: uuidv4 } = require('uuid');

const OBS_ENABLED = process.env.IMPETUS_ENTERPRISE_OBSERVABILITY_ENABLED !== 'false';

const METRIC_TYPES = Object.freeze({
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
  SUMMARY: 'summary'
});

const SUBSYSTEMS = Object.freeze({
  COGNITIVE: 'cognitive',
  OPERATIONAL: 'operational',
  GOVERNANCE: 'governance',
  PIPELINE: 'pipeline',
  SEMANTIC: 'semantic',
  DASHBOARD: 'dashboard',
  EVENT_BACKBONE: 'event_backbone',
  TELEMETRY: 'telemetry',
  SYSTEM: 'system'
});

const MAX_METRICS = 500;
const MAX_TRACES = 3000;
const MAX_SPANS = 10000;
const HISTOGRAM_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
const COLD_STORAGE_THRESHOLD_DAYS = 7;
const SNAPSHOT_INTERVAL_MS = parseInt(process.env.IMPETUS_OBS_SNAPSHOT_INTERVAL_MS || '300000', 10);

const _metrics = new Map();
const _traces = [];
const _spans = [];
const _alerts = [];
const _snapshots = [];
const MAX_ALERTS = 500;
const MAX_SNAPSHOTS = 100;

let _spanCounter = 0;
let _traceCounter = 0;
let _alertCounter = 0;

function defineMetric(name, type, labels = {}) {
  if (_metrics.size >= MAX_METRICS) return false;
  if (_metrics.has(name)) return true;

  const resolvedType = METRIC_TYPES[type] || METRIC_TYPES.GAUGE;
  const metric = {
    name,
    type: resolvedType,
    labels: { ...labels },
    value: resolvedType === 'histogram' ? { buckets: HISTOGRAM_BUCKETS.map(b => ({ le: b, count: 0 })), sum: 0, count: 0 } : 0,
    created_at: new Date().toISOString(),
    updated_at: null
  };

  _metrics.set(name, metric);
  return true;
}

function incrementCounter(name, delta = 1, labels = {}) {
  if (!OBS_ENABLED) return;
  let m = _metrics.get(name);
  if (!m) {
    defineMetric(name, 'COUNTER', labels);
    m = _metrics.get(name);
  }
  if (m && m.type === 'counter') {
    m.value += delta;
    m.updated_at = new Date().toISOString();
  }
}

function setGauge(name, value, labels = {}) {
  if (!OBS_ENABLED) return;
  let m = _metrics.get(name);
  if (!m) {
    defineMetric(name, 'GAUGE', labels);
    m = _metrics.get(name);
  }
  if (m && m.type === 'gauge') {
    m.value = value;
    m.updated_at = new Date().toISOString();
  }
}

function observeHistogram(name, value, labels = {}) {
  if (!OBS_ENABLED) return;
  let m = _metrics.get(name);
  if (!m) {
    defineMetric(name, 'HISTOGRAM', labels);
    m = _metrics.get(name);
  }
  if (m && m.type === 'histogram' && m.value && Array.isArray(m.value.buckets)) {
    m.value.sum += value;
    m.value.count++;
    for (const bucket of m.value.buckets) {
      if (value <= bucket.le) bucket.count++;
    }
    m.updated_at = new Date().toISOString();
  }
}

function startTrace(name, context = {}) {
  const traceId = context.trace_id || uuidv4();
  const trace = {
    trace_id: traceId,
    name,
    subsystem: context.subsystem || SUBSYSTEMS.SYSTEM,
    company_id: context.company_id || null,
    started_at: new Date().toISOString(),
    ended_at: null,
    duration_ms: null,
    status: 'active',
    spans: [],
    metadata: _safeClone(context.metadata || {})
  };

  _traces.push(trace);
  if (_traces.length > MAX_TRACES) _traces.splice(0, _traces.length - MAX_TRACES);
  _traceCounter++;

  return { trace_id: traceId, end: (result) => endTrace(traceId, result) };
}

function endTrace(traceId, result = {}) {
  const trace = _traces.find(t => t.trace_id === traceId);
  if (!trace || trace.status !== 'active') return null;

  trace.ended_at = new Date().toISOString();
  trace.duration_ms = new Date(trace.ended_at) - new Date(trace.started_at);
  trace.status = result.error ? 'error' : 'completed';
  trace.metadata.result = _safeClone(result);

  observeHistogram(`trace_duration_${trace.subsystem}`, trace.duration_ms);

  return trace;
}

function startSpan(traceId, name, context = {}) {
  const spanId = uuidv4();
  const span = {
    span_id: spanId,
    trace_id: traceId,
    parent_span_id: context.parent_span_id || null,
    name,
    started_at: new Date().toISOString(),
    ended_at: null,
    duration_ms: null,
    status: 'active',
    attributes: _safeClone(context.attributes || {})
  };

  _spans.push(span);
  if (_spans.length > MAX_SPANS) _spans.splice(0, _spans.length - MAX_SPANS);
  _spanCounter++;

  const trace = _traces.find(t => t.trace_id === traceId);
  if (trace) trace.spans.push(spanId);

  return { span_id: spanId, end: (result) => endSpan(spanId, result) };
}

function endSpan(spanId, result = {}) {
  const span = _spans.find(s => s.span_id === spanId);
  if (!span || span.status !== 'active') return null;

  span.ended_at = new Date().toISOString();
  span.duration_ms = new Date(span.ended_at) - new Date(span.started_at);
  span.status = result.error ? 'error' : 'completed';
  span.attributes.result = _safeClone(result);

  return span;
}

function createAlert(subsystem, severity, message, context = {}) {
  const alert = {
    alert_id: uuidv4(),
    subsystem,
    severity,
    message,
    created_at: new Date().toISOString(),
    acknowledged: false,
    metadata: _safeClone(context)
  };

  _alerts.push(alert);
  if (_alerts.length > MAX_ALERTS) _alerts.splice(0, _alerts.length - MAX_ALERTS);
  _alertCounter++;

  incrementCounter(`alert_${severity}_${subsystem}`);

  return alert;
}

function takeSnapshot() {
  const snapshot = {
    snapshot_id: uuidv4(),
    taken_at: new Date().toISOString(),
    metrics: {},
    subsystem_health: {},
    trace_stats: {
      total: _traceCounter,
      active: _traces.filter(t => t.status === 'active').length,
      recent_errors: _traces.filter(t => t.status === 'error').slice(-10).length
    },
    alert_stats: {
      total: _alertCounter,
      unacknowledged: _alerts.filter(a => !a.acknowledged).length
    }
  };

  for (const [name, m] of _metrics) {
    snapshot.metrics[name] = { type: m.type, value: m.type === 'histogram' ? { sum: m.value.sum, count: m.value.count } : m.value };
  }

  for (const sub of Object.values(SUBSYSTEMS)) {
    const subTraces = _traces.filter(t => t.subsystem === sub);
    const completed = subTraces.filter(t => t.status === 'completed');
    const errors = subTraces.filter(t => t.status === 'error');
    const avgDuration = completed.length
      ? Math.round(completed.reduce((s, t) => s + (t.duration_ms || 0), 0) / completed.length)
      : 0;

    snapshot.subsystem_health[sub] = {
      total_traces: subTraces.length,
      completed: completed.length,
      errors: errors.length,
      avg_duration_ms: avgDuration,
      error_rate: subTraces.length ? Math.round(errors.length / subTraces.length * 10000) / 100 : 0
    };
  }

  _snapshots.push(snapshot);
  if (_snapshots.length > MAX_SNAPSHOTS) _snapshots.splice(0, _snapshots.length - MAX_SNAPSHOTS);

  return snapshot;
}

/**
 * Cold Storage Strategy (Fase 5.3)
 * Identifica dados elegíveis para arquivamento.
 */
function getColdStorageCandidates() {
  const cutoff = Date.now() - (COLD_STORAGE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  const cutoffIso = new Date(cutoff).toISOString();

  return {
    traces: _traces.filter(t => t.status !== 'active' && t.started_at < cutoffIso).length,
    spans: _spans.filter(s => s.status !== 'active' && s.started_at < cutoffIso).length,
    alerts: _alerts.filter(a => a.created_at < cutoffIso).length,
    threshold_days: COLD_STORAGE_THRESHOLD_DAYS,
    evaluated_at: new Date().toISOString()
  };
}

function pruneOlderThan(days) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  let pruned = 0;

  const tracesBefore = _traces.length;
  _traces.splice(0, _traces.length, ..._traces.filter(t => t.status === 'active' || t.started_at >= cutoff));
  pruned += tracesBefore - _traces.length;

  const spansBefore = _spans.length;
  _spans.splice(0, _spans.length, ..._spans.filter(s => s.status === 'active' || s.started_at >= cutoff));
  pruned += spansBefore - _spans.length;

  return { pruned, remaining_traces: _traces.length, remaining_spans: _spans.length };
}

function exportPrometheusText() {
  const lines = [];
  for (const [name, m] of _metrics) {
    const safeName = name.replace(/[^a-zA-Z0-9_:]/g, '_');
    lines.push(`# TYPE ${safeName} ${m.type}`);
    if (m.type === 'histogram') {
      for (const bucket of m.value.buckets) {
        lines.push(`${safeName}_bucket{le="${bucket.le}"} ${bucket.count}`);
      }
      lines.push(`${safeName}_sum ${m.value.sum}`);
      lines.push(`${safeName}_count ${m.value.count}`);
    } else {
      lines.push(`${safeName} ${m.value}`);
    }
  }
  return lines.join('\n');
}

function getHealth() {
  const activeTraces = _traces.filter(t => t.status === 'active').length;
  const recentErrors = _traces.filter(t => t.status === 'error').slice(-50).length;
  const unackAlerts = _alerts.filter(a => !a.acknowledged).length;

  return {
    status: !OBS_ENABLED ? 'disabled'
      : recentErrors > 20 ? 'critical'
      : recentErrors > 5 ? 'degraded'
      : 'healthy',
    metrics_count: _metrics.size,
    active_traces: activeTraces,
    total_traces: _traceCounter,
    total_spans: _spanCounter,
    total_alerts: _alertCounter,
    unacknowledged_alerts: unackAlerts,
    snapshots_stored: _snapshots.length,
    observability_enabled: OBS_ENABLED
  };
}

function _safeClone(obj) {
  try { return JSON.parse(JSON.stringify(obj)); }
  catch { return {}; }
}

defineMetric('cognitive_latency', 'HISTOGRAM', { subsystem: 'cognitive' });
defineMetric('governance_decisions', 'COUNTER', { subsystem: 'governance' });
defineMetric('pipeline_throughput', 'COUNTER', { subsystem: 'pipeline' });
defineMetric('telemetry_ingestion_rate', 'GAUGE', { subsystem: 'telemetry' });
defineMetric('semantic_search_latency', 'HISTOGRAM', { subsystem: 'semantic' });
defineMetric('dashboard_render_time', 'HISTOGRAM', { subsystem: 'dashboard' });
defineMetric('event_backbone_throughput', 'COUNTER', { subsystem: 'event_backbone' });

module.exports = {
  METRIC_TYPES,
  SUBSYSTEMS,
  OBS_ENABLED,
  defineMetric,
  incrementCounter,
  setGauge,
  observeHistogram,
  startTrace,
  endTrace,
  startSpan,
  endSpan,
  createAlert,
  takeSnapshot,
  getColdStorageCandidates,
  pruneOlderThan,
  exportPrometheusText,
  getHealth
};
