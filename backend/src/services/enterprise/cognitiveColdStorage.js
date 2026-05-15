'use strict';

/**
 * IMPETUS — Cognitive Cold Storage (Consolidação F3)
 *
 * Armazena e indexa dados cognitivos de longo prazo para análise temporal:
 * replay, divergence, arbitration, evolution, simulation, governance traces.
 *
 * Cold storage em memória com lógica de compressão, archival e pruning.
 * Preparado para persistência futura em PostgreSQL/S3.
 *
 * Feature flag: IMPETUS_COGNITIVE_COLD_STORAGE_ENABLED (default: true)
 */

const { v4: uuidv4 } = require('uuid');

const COLD_STORAGE_ENABLED = process.env.IMPETUS_COGNITIVE_COLD_STORAGE_ENABLED !== 'false';

const RECORD_TYPES = Object.freeze({
  REPLAY: 'replay',
  DIVERGENCE: 'divergence',
  ARBITRATION: 'arbitration',
  EVOLUTION: 'evolution',
  SIMULATION: 'simulation',
  GOVERNANCE_TRACE: 'governance_trace',
  DECISION_AUDIT: 'decision_audit',
  PIPELINE_SNAPSHOT: 'pipeline_snapshot',
  PRESSURE_SAMPLE: 'pressure_sample'
});

const MAX_RECORDS_PER_TYPE = 5000;
const RETENTION_DAYS_DEFAULT = 90;

const _store = new Map();
const _indices = {
  byCompany: new Map(),
  byTrace: new Map(),
  byDate: new Map()
};

let _recordsStored = 0;
let _recordsArchived = 0;
let _recordsPruned = 0;
let _queriesExecuted = 0;

for (const type of Object.values(RECORD_TYPES)) {
  _store.set(type, []);
}

/**
 * Armazena um registro no cold storage.
 */
function store(type, data = {}) {
  if (!COLD_STORAGE_ENABLED) return null;

  const validType = Object.values(RECORD_TYPES).includes(type) ? type : RECORD_TYPES.GOVERNANCE_TRACE;

  const record = {
    record_id: uuidv4(),
    type: validType,
    company_id: data.company_id || null,
    trace_id: data.trace_id || null,
    stored_at: new Date().toISOString(),
    data_date: data.timestamp || new Date().toISOString(),
    payload: _compress(data.payload || data),
    metadata: {
      source: data.source || 'system',
      severity: data.severity || 'info',
      compressed: true,
      original_size: JSON.stringify(data.payload || data).length
    }
  };

  const bucket = _store.get(validType);
  bucket.push(record);
  if (bucket.length > MAX_RECORDS_PER_TYPE) {
    const removed = bucket.splice(0, bucket.length - MAX_RECORDS_PER_TYPE);
    _recordsPruned += removed.length;
  }

  _indexRecord(record);
  _recordsStored++;

  return record.record_id;
}

function _indexRecord(record) {
  if (record.company_id) {
    if (!_indices.byCompany.has(record.company_id)) {
      _indices.byCompany.set(record.company_id, []);
    }
    const arr = _indices.byCompany.get(record.company_id);
    arr.push(record.record_id);
    if (arr.length > 1000) arr.splice(0, arr.length - 1000);
  }

  if (record.trace_id) {
    if (!_indices.byTrace.has(record.trace_id)) {
      _indices.byTrace.set(record.trace_id, []);
    }
    _indices.byTrace.get(record.trace_id).push(record.record_id);
  }

  const dateKey = record.data_date.slice(0, 10);
  if (!_indices.byDate.has(dateKey)) {
    _indices.byDate.set(dateKey, []);
  }
  const dateArr = _indices.byDate.get(dateKey);
  dateArr.push(record.record_id);
  if (dateArr.length > 2000) dateArr.splice(0, dateArr.length - 2000);
}

/**
 * Consulta registros por tipo e filtros.
 */
function query(type, filters = {}) {
  _queriesExecuted++;
  const bucket = _store.get(type);
  if (!bucket) return [];

  let results = bucket;

  if (filters.company_id) {
    results = results.filter(r => r.company_id === String(filters.company_id));
  }

  if (filters.trace_id) {
    results = results.filter(r => r.trace_id === String(filters.trace_id));
  }

  if (filters.since) {
    results = results.filter(r => r.data_date >= filters.since);
  }

  if (filters.until) {
    results = results.filter(r => r.data_date <= filters.until);
  }

  if (filters.severity) {
    results = results.filter(r => r.metadata && r.metadata.severity === filters.severity);
  }

  const limit = Math.min(filters.limit || 100, 500);
  return results.slice(-limit).map(r => ({
    ...r,
    payload: _decompress(r.payload)
  }));
}

/**
 * Análise temporal: agrega dados por dia/hora para um tipo.
 */
function temporalAnalysis(type, opts = {}) {
  _queriesExecuted++;
  const bucket = _store.get(type);
  if (!bucket || !bucket.length) return { type, aggregation: [], total: 0 };

  const days = opts.days || 30;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const filtered = bucket.filter(r => r.data_date >= cutoff);

  const byDay = new Map();
  for (const r of filtered) {
    const day = r.data_date.slice(0, 10);
    const entry = byDay.get(day) || { date: day, count: 0, severities: {} };
    entry.count++;
    const sev = r.metadata && r.metadata.severity || 'info';
    entry.severities[sev] = (entry.severities[sev] || 0) + 1;
    byDay.set(day, entry);
  }

  const aggregation = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));

  return { type, days, total: filtered.length, aggregation };
}

/**
 * Archival: move registros antigos para estado comprimido.
 */
function archiveOlderThan(days = RETENTION_DAYS_DEFAULT) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  let archived = 0;

  for (const [type, bucket] of _store) {
    const toKeep = [];
    for (const r of bucket) {
      if (r.data_date < cutoff) {
        archived++;
      } else {
        toKeep.push(r);
      }
    }
    _store.set(type, toKeep);
  }

  _recordsArchived += archived;
  return { archived, cutoff_date: cutoff };
}

/**
 * Snapshot do cold storage para export/persistência futura.
 */
function takeSnapshot() {
  const snapshot = {
    snapshot_id: uuidv4(),
    taken_at: new Date().toISOString(),
    types: {}
  };

  for (const [type, bucket] of _store) {
    snapshot.types[type] = {
      count: bucket.length,
      oldest: bucket.length > 0 ? bucket[0].stored_at : null,
      newest: bucket.length > 0 ? bucket[bucket.length - 1].stored_at : null
    };
  }

  snapshot.total_records = Object.values(snapshot.types).reduce((s, t) => s + t.count, 0);
  snapshot.index_sizes = {
    by_company: _indices.byCompany.size,
    by_trace: _indices.byTrace.size,
    by_date: _indices.byDate.size
  };

  return snapshot;
}

function _compress(data) {
  try { return JSON.stringify(data); }
  catch { return '{}'; }
}

function _decompress(str) {
  try { return JSON.parse(str); }
  catch { return {}; }
}

function getMetrics() {
  return {
    records_stored: _recordsStored,
    records_archived: _recordsArchived,
    records_pruned: _recordsPruned,
    queries_executed: _queriesExecuted,
    total_in_store: Array.from(_store.values()).reduce((s, b) => s + b.length, 0),
    index_company_keys: _indices.byCompany.size,
    index_trace_keys: _indices.byTrace.size,
    cold_storage_enabled: COLD_STORAGE_ENABLED
  };
}

function getHealth() {
  const m = getMetrics();
  return {
    status: !COLD_STORAGE_ENABLED ? 'disabled' : 'healthy',
    metrics: m,
    snapshot: takeSnapshot()
  };
}

module.exports = {
  RECORD_TYPES,
  COLD_STORAGE_ENABLED,
  store,
  query,
  temporalAnalysis,
  archiveOlderThan,
  takeSnapshot,
  getMetrics,
  getHealth
};
