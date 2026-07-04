'use strict';

/**
 * SEC-01 — Métricas agregadas (requests/min, IP, path, status, bytes, latência).
 * Armazenamento em memória com rotação — não persiste cada request.
 */

const flags = require('../config/securityObservatoryFlags');

const counters = {
  security_events: 0,
  classified_events: 0,
  unknown_events: 0,
  timeline_entries: 0,
  security_reports: 0,
  security_errors: 0
};

/** @type {Map<string, object>} bucketKey -> aggregate */
const buckets = new Map();

/** @type {Map<string, number>} ip -> count */
const ipTotals = new Map();

/** @type {Map<string, number>} path -> count */
const pathTotals = new Map();

/** @type {Map<string, number>} ua -> count */
const uaTotals = new Map();

/** @type {Map<string, number>} classification -> count */
const classTotals = new Map();

/** status global */
const statusGlobal = {};

let windowStartMs = Date.now();
let requestsInCurrentMinute = 0;

function bucketKey(windowMs, ip, pathPrefix) {
  const slot = Math.floor(windowMs / flags.aggregationWindowMs());
  return `${slot}|${ip}|${pathPrefix}`;
}

function normalizePath(p) {
  const s = String(p || '/').split('?')[0];
  if (s.length <= 64) return s;
  return s.slice(0, 64);
}

function recordHttpSample(sample) {
  const {
    ip,
    path,
    method,
    status,
    bytes = 0,
    latencyMs = 0,
    userAgent = '',
    timestamp = Date.now()
  } = sample;

  const pathNorm = normalizePath(path);
  const slot = Math.floor(timestamp / flags.aggregationWindowMs()) * flags.aggregationWindowMs();

  requestsInCurrentMinute += 1;
  const minuteSlot = Math.floor(timestamp / 60000);
  if (minuteSlot !== Math.floor(windowStartMs / 60000)) {
    windowStartMs = timestamp;
    requestsInCurrentMinute = 1;
  }

  const key = bucketKey(timestamp, ip || 'unknown', pathNorm);
  let b = buckets.get(key);
  if (!b) {
    if (buckets.size >= flags.maxAggregationBuckets()) {
      const first = buckets.keys().next().value;
      buckets.delete(first);
    }
    b = {
      window_start: new Date(slot).toISOString(),
      window_end: new Date(slot + flags.aggregationWindowMs()).toISOString(),
      source_ip: ip,
      path_prefix: pathNorm,
      method,
      user_agent: userAgent,
      status_codes: {},
      request_count: 0,
      bytes_total: 0,
      latency_sum: 0
    };
    buckets.set(key, b);
  }

  const sc = String(status);
  b.status_codes[sc] = (b.status_codes[sc] || 0) + 1;
  b.request_count += 1;
  b.bytes_total += bytes;
  b.latency_sum += latencyMs;
  statusGlobal[sc] = (statusGlobal[sc] || 0) + 1;

  ipTotals.set(ip, (ipTotals.get(ip) || 0) + 1);
  pathTotals.set(pathNorm, (pathTotals.get(pathNorm) || 0) + 1);
  if (userAgent) uaTotals.set(userAgent.slice(0, 120), (uaTotals.get(userAgent.slice(0, 120)) || 0) + 1);

  return b;
}

function incrementCounter(name, n = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) {
    counters[name] += n;
  }
}

function recordClassification(classification) {
  classTotals.set(classification, (classTotals.get(classification) || 0) + 1);
  incrementCounter('classified_events');
  if (classification === 'UNKNOWN') incrementCounter('unknown_events');
}

function topN(map, limit = 20) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function flushBucketsForWindow() {
  return [...buckets.values()].map((b) => ({
    ...b,
    latency_ms_avg: b.request_count ? Math.round(b.latency_sum / b.request_count) : 0
  }));
}

function getMetricsSnapshot() {
  const now = Date.now();
  const uptimeMin = Math.max(1, (now - (global.__sec01_boot || now)) / 60000);
  return {
    counters: { ...counters },
    requests_per_minute: Math.round(requestsInCurrentMinute),
    requests_per_minute_avg: Math.round(
      Object.values(statusGlobal).reduce((a, b) => a + b, 0) / uptimeMin
    ),
    unique_ips: ipTotals.size,
    unique_paths: pathTotals.size,
    status_distribution: { ...statusGlobal },
    top_origins: topN(ipTotals),
    top_paths: topN(pathTotals),
    top_user_agents: topN(uaTotals, 15),
    top_classifications: topN(classTotals, 10),
    active_buckets: buckets.size,
    aggregation_window_ms: flags.aggregationWindowMs()
  };
}

function resetForTests() {
  buckets.clear();
  ipTotals.clear();
  pathTotals.clear();
  uaTotals.clear();
  classTotals.clear();
  Object.keys(statusGlobal).forEach((k) => delete statusGlobal[k]);
  Object.keys(counters).forEach((k) => { counters[k] = 0; });
  requestsInCurrentMinute = 0;
}

global.__sec01_boot = global.__sec01_boot || Date.now();

module.exports = {
  recordHttpSample,
  incrementCounter,
  recordClassification,
  flushBucketsForWindow,
  getMetricsSnapshot,
  topN,
  resetForTests
};
