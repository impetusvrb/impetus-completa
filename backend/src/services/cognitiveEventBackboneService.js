'use strict';

/**
 * IMPETUS — Persistent Event Backbone (cognitive event bus enterprise-grade)
 * Publicação, memória + PostgreSQL opcional, replay, correlação, retenção.
 * Rollout: IMPETUS_EVENT_BACKBONE_ENABLED
 */

const { v4: uuidv4 } = require('uuid');

const EVENT_TYPES = Object.freeze({
  LLM_EXECUTION: 'llm_execution',
  SAFETY_BLOCK: 'safety_block',
  CONTEXT_INTEGRITY_FAIL: 'context_integrity_fail',
  CONSENSUS_DIVERGENCE: 'consensus_divergence',
  CALIBRATION_ANOMALY: 'calibration_anomaly',
  REPLAY_EXECUTION: 'replay_execution',
  DRIFT_DETECTION: 'drift_detection',
  VOTING_DOMINANCE: 'voting_dominance',
  CSI_CALCULATION: 'csi_calculation',
  INGRESS_BLOCK: 'ingress_block'
});

const CRITICAL_EVENT_TYPES = new Set([
  EVENT_TYPES.SAFETY_BLOCK,
  EVENT_TYPES.CONTEXT_INTEGRITY_FAIL,
  EVENT_TYPES.INGRESS_BLOCK,
  EVENT_TYPES.CONSENSUS_DIVERGENCE
]);

const MEMORY_CAP = 10000;

let _memory = [];
let _eventsPublished = 0;
let _replayRequests = 0;
let _correlatedTraces = 0;
let _persistFailures = 0;
let _pipelineHooksRegistered = false;

function isEventBackboneEnabled() {
  return String(process.env.IMPETUS_EVENT_BACKBONE_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';
}

function isPersistEnabled() {
  return String(process.env.IMPETUS_EVENT_BACKBONE_PERSIST || '')
    .trim()
    .toLowerCase() === 'true';
}

function retentionDays() {
  const n = Number(process.env.IMPETUS_EVENT_BACKBONE_RETENTION_DAYS || 90);
  return Number.isFinite(n) && n > 1 ? Math.min(3650, n) : 90;
}

function _safeJson(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (_e) {
    return {};
  }
}

function buildCognitiveEventEnvelope(partial) {
  const p = partial && typeof partial === 'object' ? partial : {};
  const event_id = p.event_id || uuidv4();
  const ts = p.timestamp || new Date().toISOString();
  return {
    event_id,
    event_type: String(p.event_type || 'unknown').slice(0, 128),
    timestamp: ts,
    trace_id: p.trace_id != null ? String(p.trace_id).slice(0, 128) : null,
    company_id: p.company_id != null ? String(p.company_id).slice(0, 64) : null,
    channel: p.channel != null ? String(p.channel).slice(0, 128) : null,
    runtime: p.runtime != null ? String(p.runtime).slice(0, 128) : null,
    context_hash: p.context_hash != null ? String(p.context_hash).slice(0, 128) : null,
    payload: _safeJson(p.payload || {}),
    metadata: _safeJson(p.metadata || {})
  };
}

function _isCriticalType(eventType) {
  return CRITICAL_EVENT_TYPES.has(String(eventType || ''));
}

function _hasCriticalMarker(p) {
  const meta = p && p.metadata && typeof p.metadata === 'object' ? p.metadata : {};
  const pay = p && p.payload && typeof p.payload === 'object' ? p.payload : {};
  if (meta.severity === 'critical' || pay.severity === 'critical') return true;
  if (meta.cognitive_severity === 'critical') return true;
  if (pay.critical === true || meta.critical === true) return true;
  return false;
}

/** Nunca dropar sob backpressure */
function _isNeverDropEvent(p) {
  const t = String((p && p.event_type) || '');
  if (CRITICAL_EVENT_TYPES.has(t)) return true;
  if (t === EVENT_TYPES.DRIFT_DETECTION && _hasCriticalMarker(p)) return true;
  if (t === EVENT_TYPES.CSI_CALCULATION && _hasCriticalMarker(p)) return true;
  return false;
}

/** Tipos que podem ser descartados quando a fila excede o limite */
function _isDroppableUnderBackpressure(p) {
  if (_isNeverDropEvent(p)) return false;
  const t = String((p && p.event_type) || '');
  const meta = p && p.metadata && typeof p.metadata === 'object' ? p.metadata : {};
  if (meta.never_drop === true || meta.cognitive_priority === 'critical') return false;
  if (t === EVENT_TYPES.LLM_EXECUTION) {
    if (meta.priority === 'critical' || meta.cognitive_severity === 'critical') return false;
    return true;
  }
  if (
    t === EVENT_TYPES.REPLAY_EXECUTION ||
    t === EVENT_TYPES.CALIBRATION_ANOMALY ||
    t === EVENT_TYPES.VOTING_DOMINANCE
  ) {
    return true;
  }
  if (t === EVENT_TYPES.DRIFT_DETECTION) return !_hasCriticalMarker(p);
  if (t === EVENT_TYPES.CSI_CALCULATION) return !_hasCriticalMarker(p);
  return false;
}

function _queueMax() {
  const n = Number(process.env.IMPETUS_EVENT_QUEUE_MAX || 5000);
  return Number.isFinite(n) && n > 10 ? Math.min(1000000, n) : 5000;
}

function _batchSize() {
  const n = Number(process.env.IMPETUS_EVENT_BATCH_SIZE || 100);
  return Number.isFinite(n) && n > 0 ? Math.min(5000, n) : 100;
}

function _flushMs() {
  const n = Number(process.env.IMPETUS_EVENT_FLUSH_MS || 1500);
  return Number.isFinite(n) && n >= 50 ? Math.min(600000, n) : 1500;
}

function isLegacyDeferredImmediate() {
  return String(process.env.IMPETUS_EVENT_LEGACY_DEFERRED_IMMEDIATE || '')
    .trim()
    .toLowerCase() === 'true';
}

let _droppedEvents = 0;
let _flushCycles = 0;
let _flushBatchesOk = 0;
let _flushItemsAttempted = 0;
let _flushItemsCompleted = 0;
let _backpressureActive = false;

/**
 * Fila assíncrona com batching e política de drop observável (governança de volume).
 */
class CognitiveEventQueue {
  constructor() {
    this._items = [];
    this._timer = null;
    this._flushing = false;
  }

  _ensureTimer() {
    if (this._timer || !isEventBackboneEnabled() || isLegacyDeferredImmediate()) return;
    this._timer = setInterval(() => {
      this.flushBatch().catch(() => {});
    }, _flushMs());
    if (this._timer && typeof this._timer.unref === 'function') this._timer.unref();
  }

  _clearTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _evictDroppableOne() {
    const max = _queueMax();
    if (this._items.length < max) return true;
    for (let i = 0; i < this._items.length; i += 1) {
      if (_isDroppableUnderBackpressure(this._items[i])) {
        const dropped = this._items.splice(i, 1)[0];
        _droppedEvents += 1;
        _backpressureActive = true;
        try {
          console.warn(
            '[EVENT_DROPPED]',
            JSON.stringify({
              event_type: dropped?.event_type,
              reason: 'queue_capacity',
              queue_depth: this._items.length
            })
          );
        } catch (_e) {}
        return true;
      }
    }
    return false;
  }

  enqueue(partial) {
    if (!isEventBackboneEnabled()) return;
    const max = _queueMax();
    while (this._items.length >= max) {
      if (!this._evictDroppableOne()) break;
    }
    if (this._items.length >= max) {
      if (_isNeverDropEvent(partial) || !_isDroppableUnderBackpressure(partial)) {
        _backpressureActive = true;
        try {
          console.warn(
            '[EVENT_BACKPRESSURE]',
            JSON.stringify({
              event_type: partial?.event_type,
              queue_depth: this._items.length,
              max,
              note: 'overflow_accepted_protected_or_non_droppable'
            })
          );
        } catch (_e) {}
        this._items.push(partial);
        this._ensureTimer();
        if (this._items.length >= _batchSize()) {
          setImmediate(() => {
            this.flushBatch().catch(() => {});
          });
        }
        return;
      }
      _droppedEvents += 1;
      _backpressureActive = true;
      try {
        console.warn(
          '[EVENT_DROPPED]',
          JSON.stringify({ event_type: partial?.event_type, reason: 'incoming_droppable_at_cap' })
        );
      } catch (_e2) {}
      return;
    }
    this._items.push(partial);
    this._ensureTimer();
    if (this._items.length >= _batchSize()) {
      setImmediate(() => {
        this.flushBatch().catch(() => {});
      });
    }
  }

  async flushBatch() {
    if (this._flushing || !isEventBackboneEnabled()) return;
    const sz = _batchSize();
    if (!this._items.length) return;
    this._flushing = true;
    _flushCycles += 1;
    const batch = this._items.splice(0, Math.min(sz, this._items.length));
    _flushItemsAttempted += batch.length;
    let ok = 0;
    for (const partial of batch) {
      try {
        await publishCognitiveEvent(partial);
        ok += 1;
        if (this._items.length < _queueMax() * 0.85) _backpressureActive = false;
      } catch (err) {
        try {
          console.warn('[EVENT_BACKBONE_ERROR]', JSON.stringify({ op: 'queue_flush', message: err?.message }));
        } catch (_e) {}
        if (!partial._eb_retry) {
          this._items.unshift({ ...partial, _eb_retry: true });
        }
      }
    }
    _flushItemsCompleted += ok;
    if (ok > 0) _flushBatchesOk += 1;
    try {
      console.info(
        '[EVENT_BATCH_FLUSH]',
        JSON.stringify({ batch_size: batch.length, published_ok: ok, queue_depth: this._items.length })
      );
    } catch (_e2) {}
    this._flushing = false;
    if (!this._items.length) this._clearTimer();
  }

  async drainForTests() {
    this._clearTimer();
    while (this._items.length) {
      await this.flushBatch();
    }
  }

  resetMetrics() {
    this._clearTimer();
    this._items = [];
  }
}

let _deferredQueue = null;
function getDeferredQueue() {
  if (!_deferredQueue) _deferredQueue = new CognitiveEventQueue();
  return _deferredQueue;
}

function getEventQueueHealth() {
  const q = _deferredQueue;
  const depth = q ? q._items.length : 0;
  const batch_flush_rate =
    _flushCycles > 0 ? Math.min(1, Math.round((100 * _flushBatchesOk) / _flushCycles) / 100) : 1;
  return {
    queue_depth: depth,
    batch_flush_rate,
    dropped_events: _droppedEvents,
    backpressure_active: _backpressureActive,
    flush_items_attempted: _flushItemsAttempted,
    flush_items_completed: _flushItemsCompleted
  };
}

/**
 * @param {object} partial — campos do envelope (event_type obrigatório)
 * @returns {Promise<object|null>} envelope gravado ou null se desligado
 */
async function publishCognitiveEvent(partial) {
  if (!isEventBackboneEnabled()) return null;
  const env = buildCognitiveEventEnvelope(partial);
  try {
    console.info('[EVENT_BACKBONE]', JSON.stringify({ action: 'publish', event_type: env.event_type, trace_id: env.trace_id }));
  } catch (_e) {}

  _memory.push({ ...env, _ingested_at: Date.now() });
  if (_memory.length > MEMORY_CAP) _memory.splice(0, _memory.length - MEMORY_CAP);
  _eventsPublished += 1;

  try {
    console.info(
      '[EVENT_PUBLISHED]',
      JSON.stringify({
        event_id: env.event_id,
        event_type: env.event_type,
        trace_id: env.trace_id,
        company_id: env.company_id
      })
    );
  } catch (_e2) {}

  if (isPersistEnabled()) {
    try {
      const db = require('../db');
      await db.query(
        `INSERT INTO cognitive_event_backbone
         (id, event_type, trace_id, company_id, channel, runtime, context_hash, payload, metadata, created_at, is_critical)
         VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6, $7, $8::jsonb, $9::jsonb, $10::timestamptz, $11)`,
        [
          env.event_id,
          env.event_type,
          env.trace_id,
          /^[0-9a-f-]{36}$/i.test(String(env.company_id || '')) ? String(env.company_id) : null,
          env.channel,
          env.runtime,
          env.context_hash,
          JSON.stringify(env.payload),
          JSON.stringify(env.metadata),
          env.timestamp,
          _isCriticalType(env.event_type)
        ]
      );
    } catch (err) {
      _persistFailures += 1;
      try {
        console.warn(
          '[EVENT_BACKBONE_ERROR]',
          JSON.stringify({ op: 'persist', message: err?.message || String(err) })
        );
      } catch (_e3) {}
    }
  }

  return env;
}

function publishCognitiveEventDeferred(partial) {
  if (!isEventBackboneEnabled()) return;
  if (isLegacyDeferredImmediate()) {
    setImmediate(() => {
      publishCognitiveEvent(partial).catch((err) => {
        try {
          console.warn('[EVENT_BACKBONE_ERROR]', JSON.stringify({ op: 'deferred', message: err?.message || String(err) }));
        } catch (_e) {}
      });
    });
    return;
  }
  getDeferredQueue().enqueue(partial && typeof partial === 'object' ? partial : {});
}

/**
 * @param {string} traceId
 * @param {{ companyId?: string|null, limit?: number }} [opts]
 */
async function replayEventsByTrace(traceId, opts = {}) {
  if (!isEventBackboneEnabled()) return { trace_id: traceId, timeline: [], events: [] };
  if (opts.skipReplayRequestMetric !== true) _replayRequests += 1;
  try {
    console.info('[EVENT_REPLAY]', JSON.stringify({ trace_id: traceId, source: 'replayEventsByTrace' }));
  } catch (_e) {}

  const limit = Math.min(500, Math.max(1, Number(opts.limit) || 200));
  const cid = opts.companyId != null ? String(opts.companyId).trim() : null;
  const tid = String(traceId || '').trim();

  const fromMemory = _memory.filter((e) => e.trace_id === tid && (!cid || e.company_id === cid));
  fromMemory.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

  let fromDb = [];
  if (isPersistEnabled() && tid) {
    try {
      const db = require('../db');
      const uuidOk = cid && /^[0-9a-f-]{36}$/i.test(cid);
      const params = uuidOk ? [tid, cid, limit] : [tid, limit];
      const sql = uuidOk
        ? `SELECT id, event_type, trace_id, company_id::text, channel, runtime, context_hash, payload, metadata, created_at
           FROM cognitive_event_backbone WHERE trace_id = $1 AND company_id = $2::uuid
           ORDER BY created_at ASC LIMIT $3`
        : `SELECT id, event_type, trace_id, company_id::text, channel, runtime, context_hash, payload, metadata, created_at
           FROM cognitive_event_backbone WHERE trace_id = $1
           ORDER BY created_at ASC LIMIT $2`;
      const r = await db.query(sql, params);
      fromDb = (r.rows || []).map((row) => ({
        event_id: row.id,
        event_type: row.event_type,
        trace_id: row.trace_id,
        company_id: row.company_id,
        channel: row.channel,
        runtime: row.runtime,
        context_hash: row.context_hash,
        payload: row.payload,
        metadata: row.metadata,
        timestamp: row.created_at ? new Date(row.created_at).toISOString() : null
      }));
    } catch (err) {
      try {
        console.warn('[EVENT_BACKBONE_ERROR]', JSON.stringify({ op: 'replay_db', message: err?.message }));
      } catch (_e) {}
    }
  }

  const merged = [...fromDb, ...fromMemory];
  merged.sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
  const dedup = new Map();
  for (const e of merged) {
    dedup.set(e.event_id, e);
  }
  const timeline = [...dedup.values()].sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
  return {
    trace_id: tid,
    timeline: timeline.map((e) => ({
      at: e.timestamp,
      event_type: e.event_type,
      event_id: e.event_id,
      channel: e.channel,
      runtime: e.runtime
    })),
    events: timeline.slice(-limit)
  };
}

/**
 * @param {string} traceId
 * @param {{ companyId?: string|null }} [opts]
 */
async function correlateCognitiveEvents(traceId, opts = {}) {
  if (!isEventBackboneEnabled()) {
    return { trace_id: traceId, timeline: [], correlated_events: [] };
  }
  _correlatedTraces += 1;
  const replay = await replayEventsByTrace(traceId, {
    companyId: opts.companyId,
    limit: 500,
    skipReplayRequestMetric: true
  });
  const events = replay.events || [];
  const byType = {};
  for (const e of events) {
    const t = e.event_type || 'unknown';
    if (!byType[t]) byType[t] = [];
    byType[t].push(e);
  }
  try {
    console.info(
      '[EVENT_CORRELATION]',
      JSON.stringify({
        trace_id: traceId,
        types: Object.keys(byType),
        count: events.length
      })
    );
  } catch (_e) {}

  const correlated_events = Object.entries(byType).map(([event_type, list]) => ({
    event_type,
    count: list.length,
    first_at: list[0]?.timestamp,
    last_at: list[list.length - 1]?.timestamp
  }));

  return {
    trace_id: String(traceId || ''),
    timeline: replay.timeline,
    correlated_events
  };
}

async function cleanupOldEvents() {
  if (!isPersistEnabled()) return { deleted: 0, skipped: true };
  const days = retentionDays();
  try {
    const db = require('../db');
    const r = await db.query(
      `DELETE FROM cognitive_event_backbone
       WHERE is_critical = false
         AND created_at < now() - ($1::int * interval '1 day')`,
      [days]
    );
    const deleted = r.rowCount != null ? r.rowCount : 0;
    try {
      console.info('[EVENT_BACKBONE]', JSON.stringify({ action: 'cleanup', deleted, retention_days: days }));
    } catch (_e) {}
    return { deleted, retention_days: days };
  } catch (err) {
    try {
      console.warn('[EVENT_BACKBONE_ERROR]', JSON.stringify({ op: 'cleanup', message: err?.message }));
    } catch (_e2) {}
    return { deleted: 0, error: err?.message };
  }
}

function getDashboardSnapshot() {
  const healthy = _persistFailures < 50;
  const qh = getEventQueueHealth();
  return {
    enabled: isEventBackboneEnabled(),
    persist: isPersistEnabled(),
    events_published: _eventsPublished,
    replay_requests: _replayRequests,
    correlated_traces: _correlatedTraces,
    persist_failures: _persistFailures,
    stream_health: isEventBackboneEnabled() ? (healthy ? 'healthy' : 'degraded') : 'disabled',
    queue_depth: qh.queue_depth,
    batch_flush_rate: qh.batch_flush_rate,
    dropped_events: qh.dropped_events,
    backpressure_active: qh.backpressure_active
  };
}

function getAdminMetricsPayload() {
  return {
    ok: true,
    backbone: getDashboardSnapshot(),
    retention_days: retentionDays()
  };
}

/**
 * Subscreve o bus do pipeline sem remover handlers existentes.
 */
function attachPipelineBusHooks() {
  if (!isEventBackboneEnabled() || _pipelineHooksRegistered) return { ok: false, reason: 'disabled_or_attached' };
  if (process.env.IMPETUS_EVENT_PIPELINE_ENABLED !== 'true') return { ok: false, reason: 'pipeline_disabled' };
  try {
    const { getEventBus } = require('../eventPipeline/eventBus');
    const bus = getEventBus();
    const types = ['chat_message', 'sensor_alert', 'task_update', 'external_data', 'system_health_snapshot'];
    for (const type of types) {
      bus.subscribe(type, (event) => {
        const pl = (event && event.payload) || {};
        publishCognitiveEventDeferred({
          event_type: EVENT_TYPES.LLM_EXECUTION,
          trace_id: pl.trace_id || event?.id || null,
          company_id: pl.company_id != null ? pl.company_id : null,
          channel: type,
          runtime: 'event_pipeline',
          context_hash: null,
          payload: {
            pipeline_type: type,
            event_id: event?.id,
            summary: pl.summary ? String(pl.summary).slice(0, 2000) : null
          },
          metadata: { source: 'event_pipeline_bus', priority: event?.priority }
        });
      });
    }
    _pipelineHooksRegistered = true;
    try {
      console.info('[EVENT_BACKBONE]', JSON.stringify({ action: 'pipeline_hooks_attached', types }));
    } catch (_e) {}
    return { ok: true, types };
  } catch (err) {
    try {
      console.warn('[EVENT_BACKBONE_ERROR]', JSON.stringify({ op: 'attach_pipeline', message: err?.message }));
    } catch (_e2) {}
    return { ok: false, reason: err?.message };
  }
}

function _resetForTests() {
  _memory = [];
  _eventsPublished = 0;
  _replayRequests = 0;
  _correlatedTraces = 0;
  _persistFailures = 0;
  _pipelineHooksRegistered = false;
  _droppedEvents = 0;
  _flushCycles = 0;
  _flushBatchesOk = 0;
  _flushItemsAttempted = 0;
  _flushItemsCompleted = 0;
  _backpressureActive = false;
  if (_deferredQueue) {
    _deferredQueue.resetMetrics();
    _deferredQueue = null;
  }
}

async function _flushDeferredQueueForTests() {
  if (_deferredQueue) await _deferredQueue.drainForTests();
}

module.exports = {
  EVENT_TYPES,
  CognitiveEventQueue,
  isEventBackboneEnabled,
  isPersistEnabled,
  isLegacyDeferredImmediate,
  buildCognitiveEventEnvelope,
  publishCognitiveEvent,
  publishCognitiveEventDeferred,
  replayEventsByTrace,
  correlateCognitiveEvents,
  cleanupOldEvents,
  getDashboardSnapshot,
  getEventQueueHealth,
  getAdminMetricsPayload,
  attachPipelineBusHooks,
  _resetForTests,
  _flushDeferredQueueForTests
};
