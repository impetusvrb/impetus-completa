'use strict';

/**
 * WAVE 2 — métricas tenant-aware com cap de cardinalidade.
 */

const { isObservabilityV2Enabled, tenantMetricsCardinalityCap } = require('./observabilityFlags');

const _counters = new Map();
const _gauges = new Map();
const _histograms = new Map();
const _tenantHits = new Map(); // company_id -> count in window
let _windowStart = Date.now();
const WINDOW_MS = 300000;

const MAX_SERIES = 800;

function _resetWindowIfNeeded() {
  if (Date.now() - _windowStart < WINDOW_MS) return;
  _tenantHits.clear();
  _windowStart = Date.now();
}

function _resolveTenantLabel(companyId) {
  if (!companyId) return { tenant_bucket: 'unknown' };
  _resetWindowIfNeeded();
  const id = String(companyId);
  const cap = tenantMetricsCardinalityCap();
  const hits = (_tenantHits.get(id) || 0) + 1;
  _tenantHits.set(id, hits);

  const ranked = [..._tenantHits.entries()].sort((a, b) => b[1] - a[1]);
  const topIds = new Set(ranked.slice(0, cap).map(([k]) => k));

  if (topIds.has(id)) return { tenant_id: id.slice(0, 36) };
  return { tenant_bucket: 'others' };
}

function _seriesKey(name, labels) {
  const sorted = Object.keys(labels)
    .sort()
    .map((k) => `${k}=${labels[k]}`)
    .join(',');
  return `${name}{${sorted}}`;
}

function _pruneIfNeeded(map) {
  if (map.size <= MAX_SERIES) return;
  const keys = [...map.keys()];
  for (let i = 0; i < keys.length - MAX_SERIES; i += 1) {
    map.delete(keys[i]);
  }
}

/**
 * @param {string} name
 * @param {number} [delta]
 * @param {object} [labels]
 * @param {{ company_id?: string }} [opts]
 */
function incrementCounter(name, delta = 1, labels = {}, opts = {}) {
  if (!isObservabilityV2Enabled()) return;
  const tenantLabels = opts.company_id ? _resolveTenantLabel(opts.company_id) : {};
  const merged = Object.assign({}, labels, tenantLabels);
  const key = _seriesKey(name, merged);
  _counters.set(key, (_counters.get(key) || 0) + delta);
  _pruneIfNeeded(_counters);
}

function setGauge(name, value, labels = {}, opts = {}) {
  if (!isObservabilityV2Enabled()) return;
  const tenantLabels = opts.company_id ? _resolveTenantLabel(opts.company_id) : {};
  const merged = Object.assign({}, labels, tenantLabels);
  const key = _seriesKey(name, merged);
  _gauges.set(key, { value: Number(value), ts: Date.now() });
  _pruneIfNeeded(_gauges);
}

function observeHistogram(name, value, labels = {}, opts = {}) {
  if (!isObservabilityV2Enabled()) return;
  const tenantLabels = opts.company_id ? _resolveTenantLabel(opts.company_id) : {};
  const merged = Object.assign({}, labels, tenantLabels);
  const key = _seriesKey(name, merged);
  const h = _histograms.get(key) || { count: 0, sum: 0, max: 0 };
  const v = Number(value);
  h.count += 1;
  h.sum += v;
  if (v > h.max) h.max = v;
  _histograms.set(key, h);
  _pruneIfNeeded(_histograms);
}

function routeGroupFromPath(path) {
  const p = String(path || '').split('?')[0];
  const parts = p.split('/').filter(Boolean);
  if (parts.length <= 2) return `/${parts.join('/') || 'root'}`;
  return `/${parts.slice(0, 3).join('/')}`;
}

function recordHttpRequest(method, path, statusCode, durationMs, companyId) {
  const routeGroup = routeGroupFromPath(path);
  const statusClass = `${Math.floor(Number(statusCode) / 100)}xx`;
  incrementCounter('impetus_http_requests_total', 1, { method: String(method || 'GET').toUpperCase(), status_class: statusClass, route_group: routeGroup }, { company_id: companyId });
  observeHistogram('impetus_http_duration_ms', durationMs, { route_group: routeGroup }, { company_id: companyId });
}

function exportPrometheusText() {
  const lines = [];
  for (const [key, val] of _counters) {
    lines.push(`# TYPE ${key.split('{')[0]} counter`);
    lines.push(`${key} ${val}`);
  }
  for (const [key, entry] of _gauges) {
    lines.push(`# TYPE ${key.split('{')[0]} gauge`);
    lines.push(`${key} ${entry.value}`);
  }
  for (const [key, h] of _histograms) {
    const base = key.split('{')[0];
    lines.push(`# TYPE ${base} summary`);
    lines.push(`${key.replace('}', '')},quantile="max"} ${h.max}`);
    lines.push(`${key.replace('}', '')},quantile="avg"} ${h.count > 0 ? h.sum / h.count : 0}`);
    lines.push(`${key.replace('}', '')}_count ${h.count}`);
  }
  return lines.join('\n') + '\n';
}

function getRegistrySnapshot() {
  return {
    counters: _counters.size,
    gauges: _gauges.size,
    histograms: _histograms.size,
    tenant_tracking: _tenantHits.size,
    cardinality_cap: tenantMetricsCardinalityCap()
  };
}

module.exports = {
  incrementCounter,
  setGauge,
  observeHistogram,
  recordHttpRequest,
  routeGroupFromPath,
  exportPrometheusText,
  getRegistrySnapshot
};
