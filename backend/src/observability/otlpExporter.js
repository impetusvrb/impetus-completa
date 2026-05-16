'use strict';

/**
 * WAVE 2 — exportador OTLP HTTP JSON opcional (sem SDK no hot path).
 */

const { isOtelExporterEnabled, otelEndpoint, otelExportIntervalMs, otelExportBatchSize } = require('./observabilityFlags');

const _traceBuffer = [];
const _metricBuffer = [];
const MAX_BUFFER = 500;
let _timer = null;
let _circuitOpenUntil = 0;
let _stats = { exports_ok: 0, exports_fail: 0, dropped: 0 };

function enqueueTrace(span) {
  if (!isOtelExporterEnabled()) return;
  if (_traceBuffer.length >= MAX_BUFFER) {
    _traceBuffer.shift();
    _stats.dropped += 1;
  }
  _traceBuffer.push(span);
}

function enqueueMetric(metric) {
  if (!isOtelExporterEnabled()) return;
  if (_metricBuffer.length >= MAX_BUFFER) {
    _metricBuffer.shift();
    _stats.dropped += 1;
  }
  _metricBuffer.push(metric);
}

function _nsFromMs(ms) {
  return String(Math.floor(ms * 1e6));
}

function spanToOtlp(span) {
  const startMs = span.startTime || Date.now();
  const endMs = span.endTime || startMs;
  return {
    traceId: span.traceId || span.trace_id,
    spanId: span.spanId || span.span_id,
    name: span.name || span.operationName || 'span',
    kind: 1,
    startTimeUnixNano: _nsFromMs(startMs),
    endTimeUnixNano: _nsFromMs(endMs),
    attributes: Object.entries(span.attributes || {}).map(([k, v]) => ({
      key: k,
      value: { stringValue: String(v) }
    })),
    status: { code: span.status === 'error' ? 2 : 1 }
  };
}

async function _post(path, body) {
  const base = otelEndpoint();
  if (!base) return { ok: false, reason: 'no_endpoint' };
  if (Date.now() < _circuitOpenUntil) return { ok: false, reason: 'circuit_open' };

  const url = `${base}${path}`;
  const payload = JSON.stringify(body);

  try {
    if (typeof fetch === 'function') {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true };
    }
    const http = url.startsWith('https') ? require('https') : require('http');
    return await new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port || (url.startsWith('https') ? 443 : 80),
          path: u.pathname + u.search,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
          timeout: 5000
        },
        (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve({ ok: true });
          else reject(new Error(`HTTP ${res.statusCode}`));
        }
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('timeout'));
      });
      req.write(payload);
      req.end();
    });
  } catch (err) {
    _circuitOpenUntil = Date.now() + 300000;
    try {
      console.warn('[OTEL_EXPORT_FAIL]', JSON.stringify({ path, message: err?.message || String(err) }));
    } catch (_e) {}
    return { ok: false, error: err?.message };
  }
}

async function flushBatch() {
  if (!isOtelExporterEnabled()) return { ok: false, reason: 'disabled' };

  const batchSize = otelExportBatchSize();
  const traces = _traceBuffer.splice(0, batchSize);
  const metrics = _metricBuffer.splice(0, batchSize);

  if (!traces.length && !metrics.length) return { ok: true, empty: true };

  if (traces.length) {
    const body = {
      resourceSpans: [
        {
          resource: { attributes: [{ key: 'service.name', value: { stringValue: 'impetus-backend' } }] },
          scopeSpans: [{ spans: traces.map(spanToOtlp) }]
        }
      ]
    };
    const r = await _post('/v1/traces', body);
    if (r.ok) _stats.exports_ok += 1;
    else _stats.exports_fail += 1;
  }

  if (metrics.length) {
    const r = await _post('/v1/metrics', { resourceMetrics: [{ scopeMetrics: [{ metrics }] }] });
    if (r.ok) _stats.exports_ok += 1;
    else _stats.exports_fail += 1;
  }

  return { ok: true, traces: traces.length, metrics: metrics.length };
}

function startOtelExporterLoop() {
  if (!isOtelExporterEnabled() || _timer) return;
  const interval = otelExportIntervalMs();
  _timer = setInterval(() => {
    flushBatch().catch(() => {});
  }, interval);
  if (typeof _timer.unref === 'function') _timer.unref();
}

function stopOtelExporterLoop() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

function getOtelExporterStats() {
  return {
    ..._stats,
    trace_buffer: _traceBuffer.length,
    metric_buffer: _metricBuffer.length,
    circuit_open: Date.now() < _circuitOpenUntil,
    endpoint: otelEndpoint() || null
  };
}

module.exports = {
  enqueueTrace,
  enqueueMetric,
  flushBatch,
  startOtelExporterLoop,
  stopOtelExporterLoop,
  getOtelExporterStats
};
