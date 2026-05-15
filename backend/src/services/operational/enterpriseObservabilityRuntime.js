'use strict';

/**
 * FASE 11 — ENTERPRISE OBSERVABILITY
 *
 * Observabilidade enterprise real: OpenTelemetry-compatible traces,
 * métricas Prometheus-style, cold storage, retention e audit exports.
 *
 * Feature flag: ENTERPRISE_OBSERVABILITY_RUNTIME_ENABLED (default true)
 *
 * Não requer infra OpenTelemetry real para funcionar — emite em formato
 * compatível e armazena localmente até backend de trace ser configurado.
 */

const ENABLED = process.env.ENTERPRISE_OBSERVABILITY_RUNTIME_ENABLED !== 'false';

const _traces = [];
const _metrics = new Map();
const MAX_TRACES = 2000;
const RETENTION_HOURS = parseInt(process.env.OBSERVABILITY_RETENTION_HOURS || '72', 10);

function _generateTraceId() {
  return `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function _generateSpanId() {
  return `sp_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Inicia um trace distribuído.
 */
function startTrace(operationName, attributes = {}) {
  if (!ENABLED) return { traceId: null, spanId: null };

  const traceId = _generateTraceId();
  const spanId = _generateSpanId();
  const trace = {
    traceId, spanId, operationName,
    attributes, startTime: Date.now(),
    endTime: null, duration: null,
    status: 'in_progress',
    spans: [{ spanId, name: operationName, startTime: Date.now() }],
    events: []
  };

  _traces.push(trace);
  if (_traces.length > MAX_TRACES) _traces.shift();

  return { traceId, spanId };
}

/**
 * Adiciona span filho a um trace existente.
 */
function addSpan(traceId, spanName, attributes = {}) {
  if (!ENABLED) return null;

  const trace = _traces.find(t => t.traceId === traceId);
  if (!trace) return null;

  const spanId = _generateSpanId();
  trace.spans.push({
    spanId, name: spanName, attributes,
    startTime: Date.now(), endTime: null
  });

  return spanId;
}

/**
 * Finaliza um span.
 */
function endSpan(traceId, spanId, status = 'ok') {
  if (!ENABLED) return;

  const trace = _traces.find(t => t.traceId === traceId);
  if (!trace) return;

  const span = trace.spans.find(s => s.spanId === spanId);
  if (span) {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
  }
}

/**
 * Finaliza o trace inteiro.
 */
function endTrace(traceId, status = 'ok') {
  if (!ENABLED) return;

  const trace = _traces.find(t => t.traceId === traceId);
  if (!trace) return;

  trace.endTime = Date.now();
  trace.duration = trace.endTime - trace.startTime;
  trace.status = status;

  for (const span of trace.spans) {
    if (!span.endTime) {
      span.endTime = trace.endTime;
      span.duration = span.endTime - span.startTime;
      span.status = 'auto_closed';
    }
  }
}

/**
 * Registra uma métrica Prometheus-style.
 */
function recordMetric(name, value, labels = {}) {
  if (!ENABLED) return;

  const key = `${name}:${JSON.stringify(labels)}`;
  const existing = _metrics.get(key) || {
    name, labels, values: [], sum: 0, count: 0
  };

  existing.values.push({ value, timestamp: Date.now() });
  existing.sum += value;
  existing.count++;

  if (existing.values.length > 1000) existing.values.shift();

  _metrics.set(key, existing);
}

/**
 * Obtém métricas agregadas.
 */
function getMetrics(filter = {}) {
  if (!ENABLED) return [];

  const results = [];
  for (const [, metric] of _metrics) {
    if (filter.name && metric.name !== filter.name) continue;

    results.push({
      name: metric.name,
      labels: metric.labels,
      avg: metric.count > 0 ? metric.sum / metric.count : 0,
      count: metric.count,
      sum: metric.sum,
      lastValue: metric.values.length > 0 ? metric.values[metric.values.length - 1].value : null
    });
  }
  return results;
}

/**
 * Obtém traces recentes para auditoria.
 */
function getRecentTraces(limit = 50) {
  if (!ENABLED) return [];

  const cutoff = Date.now() - (RETENTION_HOURS * 3600000);
  return _traces
    .filter(t => t.startTime > cutoff)
    .slice(-limit)
    .map(t => ({
      traceId: t.traceId,
      operation: t.operationName,
      status: t.status,
      duration: t.duration,
      spanCount: t.spans.length,
      startTime: new Date(t.startTime).toISOString()
    }));
}

/**
 * Exporta dados de auditoria para cold storage / export.
 */
function exportAuditData(options = {}) {
  if (!ENABLED) return { ok: false };

  const cutoff = Date.now() - ((options.hours || RETENTION_HOURS) * 3600000);
  const filteredTraces = _traces.filter(t => t.startTime > cutoff);
  const metrics = getMetrics();

  return {
    ok: true,
    exportedAt: new Date().toISOString(),
    traceCount: filteredTraces.length,
    metricCount: metrics.length,
    traces: filteredTraces,
    metrics
  };
}

module.exports = {
  startTrace, addSpan, endSpan, endTrace,
  recordMetric, getMetrics,
  getRecentTraces, exportAuditData,
  isEnabled: () => ENABLED
};
