'use strict';

/**
 * IMPETUS — Operational Telemetry Service (Fase 1.2)
 * Camada unificada de ingestão, normalização e correlação de dados operacionais.
 *
 * Consolida: edgeIngestService, plcCollector, plcDataService, operationalBrainEngine
 * em um único ponto de entrada normalizado para dados da planta.
 *
 * Feature flag: IMPETUS_OPERATIONAL_TELEMETRY_ENABLED (default: true)
 */

const { v4: uuidv4 } = require('uuid');

const TELEMETRY_ENABLED = process.env.IMPETUS_OPERATIONAL_TELEMETRY_ENABLED !== 'false';

const DOMAINS = Object.freeze({
  PRODUCTION: 'production',
  MAINTENANCE: 'maintenance',
  QUALITY: 'quality',
  ENERGY: 'energy',
  LOGISTICS: 'logistics',
  WORKFORCE: 'workforce',
  ENVIRONMENT: 'environment',
  TELEMETRY: 'telemetry'
});

const SOURCE_TYPES = Object.freeze({
  PLC: 'plc',
  SCADA: 'scada',
  MES: 'mes',
  ERP: 'erp',
  SENSOR: 'sensor',
  EDGE: 'edge',
  MANUAL: 'manual',
  API: 'api'
});

const SNAPSHOT_SCHEMA = Object.freeze({
  production: null,
  maintenance: null,
  quality: null,
  energy: null,
  logistics: null,
  workforce: null,
  environment: null,
  telemetry: null
});

const MAX_RING_BUFFER = 5000;
const MAX_EVENTS_PER_BATCH = 200;
const DEDUP_WINDOW_MS = 2000;

const _ringBuffer = [];
let _ingestedTotal = 0;
let _dedupedTotal = 0;
let _normalizedTotal = 0;
let _errorCount = 0;
let _lastSnapshotTs = null;

const _dedupMap = new Map();
const _snapshotCache = new Map();
const _hooks = [];

function _now() { return new Date().toISOString(); }

function _dedupKey(evt) {
  return `${evt.company_id}:${evt.source_type}:${evt.source_id || ''}:${evt.domain}:${evt.metric_key || ''}`;
}

function _pruneDedup() {
  const cutoff = Date.now() - DEDUP_WINDOW_MS;
  for (const [k, ts] of _dedupMap) {
    if (ts < cutoff) _dedupMap.delete(k);
  }
}

function _isDuplicate(evt) {
  const key = _dedupKey(evt);
  const last = _dedupMap.get(key);
  if (last && (Date.now() - last) < DEDUP_WINDOW_MS) {
    _dedupedTotal++;
    return true;
  }
  _dedupMap.set(key, Date.now());
  return false;
}

function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const domain = String(raw.domain || raw.category || 'telemetry').toLowerCase();
  const validDomain = Object.values(DOMAINS).includes(domain) ? domain : DOMAINS.TELEMETRY;

  return {
    event_id: raw.event_id || uuidv4(),
    company_id: raw.company_id != null ? String(raw.company_id) : null,
    tenant_id: raw.tenant_id || raw.company_id || null,
    domain: validDomain,
    source_type: Object.values(SOURCE_TYPES).includes(raw.source_type) ? raw.source_type : SOURCE_TYPES.API,
    source_id: raw.source_id || raw.machine_identifier || raw.edge_id || null,
    metric_key: raw.metric_key || raw.key || raw.metric || null,
    value: raw.value != null ? raw.value : null,
    unit: raw.unit || null,
    timestamp: raw.timestamp || _now(),
    ingested_at: _now(),
    quality_score: _computeQualityScore(raw),
    metadata: _safeClone(raw.metadata || {}),
    raw_payload: _safeClone(raw)
  };
}

function _computeQualityScore(evt) {
  let score = 100;
  if (!evt.company_id) score -= 30;
  if (!evt.source_id && !evt.machine_identifier) score -= 20;
  if (!evt.timestamp) score -= 15;
  if (evt.value == null) score -= 10;
  if (!evt.domain && !evt.category) score -= 10;
  return Math.max(0, score);
}

function _safeClone(obj) {
  try { return JSON.parse(JSON.stringify(obj)); }
  catch { return {}; }
}

function _pushToRing(normalized) {
  _ringBuffer.push(normalized);
  if (_ringBuffer.length > MAX_RING_BUFFER) {
    _ringBuffer.splice(0, _ringBuffer.length - MAX_RING_BUFFER);
  }
}

function _notifyHooks(eventType, data) {
  for (const hook of _hooks) {
    try { hook(eventType, data); } catch {}
  }
}

/**
 * Ingestão principal — ponto único de entrada para TODOS os dados operacionais.
 * @param {Object|Object[]} events - evento(s) operacionais brutos
 * @returns {{ ingested: number, deduped: number, errors: number }}
 */
function ingest(events) {
  if (!TELEMETRY_ENABLED) return { ingested: 0, deduped: 0, errors: 0 };

  const batch = Array.isArray(events) ? events : [events];
  const limited = batch.slice(0, MAX_EVENTS_PER_BATCH);
  let ingested = 0, deduped = 0, errors = 0;

  _pruneDedup();

  for (const raw of limited) {
    try {
      const normalized = normalizeEvent(raw);
      if (!normalized) { errors++; _errorCount++; continue; }
      if (_isDuplicate(normalized)) { deduped++; continue; }

      _pushToRing(normalized);
      _ingestedTotal++;
      ingested++;

      _updateSnapshot(normalized);
      _notifyHooks('ingested', normalized);
    } catch (err) {
      errors++;
      _errorCount++;
    }
  }

  return { ingested, deduped, errors };
}

function _updateSnapshot(evt) {
  if (!evt.company_id) return;
  const key = evt.company_id;

  if (!_snapshotCache.has(key)) {
    _snapshotCache.set(key, {
      ...JSON.parse(JSON.stringify(SNAPSHOT_SCHEMA)),
      _meta: { created_at: _now(), updated_at: _now(), event_count: 0 }
    });
  }

  const snap = _snapshotCache.get(key);
  const domain = evt.domain;

  if (!snap[domain]) {
    snap[domain] = { _events: [], _last_updated: null, _freshness_ms: null };
  }

  const domainData = snap[domain];
  domainData._last_updated = evt.timestamp;
  domainData._freshness_ms = Date.now() - new Date(evt.timestamp).getTime();

  if (evt.metric_key && evt.value != null) {
    domainData[evt.metric_key] = {
      value: evt.value,
      unit: evt.unit,
      ts: evt.timestamp,
      source: evt.source_type,
      quality: evt.quality_score
    };
  }

  domainData._events.push({
    event_id: evt.event_id,
    metric_key: evt.metric_key,
    value: evt.value,
    ts: evt.timestamp
  });

  if (domainData._events.length > 100) {
    domainData._events = domainData._events.slice(-100);
  }

  snap._meta.updated_at = _now();
  snap._meta.event_count++;
  _lastSnapshotTs = _now();
}

/**
 * Retorna o snapshot operacional unificado para um tenant.
 * Formato padrão: { production, maintenance, quality, energy, logistics, workforce, environment, telemetry }
 */
function getUnifiedSnapshot(companyId) {
  if (!companyId) return { ...JSON.parse(JSON.stringify(SNAPSHOT_SCHEMA)), _meta: { error: 'no_company_id' } };
  return _snapshotCache.get(String(companyId)) || {
    ...JSON.parse(JSON.stringify(SNAPSHOT_SCHEMA)),
    _meta: { created_at: null, updated_at: null, event_count: 0, empty: true }
  };
}

/**
 * Data Freshness Governance (Fase 1.4)
 * Avalia a "frescura" dos dados para cada domínio de um tenant.
 */
function evaluateFreshness(companyId, thresholds) {
  const defaults = {
    fresh_ms: 60000,       // < 1min = fresh
    stale_ms: 300000,      // 1-5min = stale
    degraded_ms: 900000    // > 15min = degraded
  };
  const th = { ...defaults, ...thresholds };
  const snap = getUnifiedSnapshot(companyId);
  const result = { company_id: companyId, evaluated_at: _now(), domains: {}, overall_score: 0, mode: 'normal' };
  let totalScore = 0, domainCount = 0;

  for (const domain of Object.values(DOMAINS)) {
    const d = snap[domain];
    if (!d || !d._last_updated) {
      result.domains[domain] = { status: 'no_data', freshness_ms: null, score: 0 };
      continue;
    }

    const age = Date.now() - new Date(d._last_updated).getTime();
    let status, score;

    if (age <= th.fresh_ms) { status = 'fresh'; score = 100; }
    else if (age <= th.stale_ms) { status = 'stale'; score = 60; }
    else if (age <= th.degraded_ms) { status = 'degraded'; score = 30; }
    else { status = 'offline'; score = 0; }

    result.domains[domain] = { status, freshness_ms: age, score, last_updated: d._last_updated };
    totalScore += score;
    domainCount++;
  }

  result.overall_score = domainCount > 0 ? Math.round(totalScore / domainCount) : 0;
  result.mode = result.overall_score >= 70 ? 'normal'
    : result.overall_score >= 40 ? 'degraded'
    : 'critical';

  return result;
}

/**
 * Registrar hook para eventos operacionais (integração com event backbone).
 */
function registerHook(fn) {
  if (typeof fn === 'function') _hooks.push(fn);
}

function getRecentEvents(companyId, opts = {}) {
  const limit = Math.min(opts.limit || 50, 500);
  const domain = opts.domain || null;
  let filtered = _ringBuffer;

  if (companyId) filtered = filtered.filter(e => e.company_id === String(companyId));
  if (domain) filtered = filtered.filter(e => e.domain === domain);

  return filtered.slice(-limit);
}

function getMetrics() {
  return {
    ingested_total: _ingestedTotal,
    deduped_total: _dedupedTotal,
    normalized_total: _normalizedTotal,
    error_count: _errorCount,
    ring_buffer_size: _ringBuffer.length,
    snapshot_cache_size: _snapshotCache.size,
    dedup_map_size: _dedupMap.size,
    last_snapshot_ts: _lastSnapshotTs,
    hooks_registered: _hooks.length,
    telemetry_enabled: TELEMETRY_ENABLED
  };
}

function getHealth() {
  const m = getMetrics();
  const errorRate = m.ingested_total > 0 ? m.error_count / (m.ingested_total + m.error_count) : 0;

  return {
    status: !TELEMETRY_ENABLED ? 'disabled'
      : errorRate > 0.3 ? 'critical'
      : errorRate > 0.1 ? 'degraded'
      : 'healthy',
    metrics: m,
    error_rate: Math.round(errorRate * 10000) / 100,
    uptime_ms: process.uptime() * 1000
  };
}

module.exports = {
  DOMAINS,
  SOURCE_TYPES,
  SNAPSHOT_SCHEMA,
  ingest,
  normalizeEvent,
  getUnifiedSnapshot,
  evaluateFreshness,
  registerHook,
  getRecentEvents,
  getMetrics,
  getHealth,
  TELEMETRY_ENABLED
};
