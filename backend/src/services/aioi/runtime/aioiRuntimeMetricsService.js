'use strict';

/**
 * AIOI-P1A.5 — Runtime Metrics Service
 *
 * Coleta e expõe métricas operacionais do pipeline AIOI em tempo real.
 * In-process store + consulta ao BD para métricas persistentes.
 *
 * ADDITIVE ONLY — não modifica nenhum serviço existente.
 * READ ONLY para consumidores — apenas o worker pode gravar via recordXxx().
 *
 * Métricas expostas:
 *   - ingested_events       — total IOEs ingeridos (desde reset)
 *   - classified_events     — total IOEs classificados (triaged)
 *   - projected_snapshots   — total snapshots projetados
 *   - outbox_pending        — pendente no aioi_outbox
 *   - outbox_delivered      — entregues no aioi_outbox
 *   - outbox_failed         — falhas no aioi_outbox
 *   - dlq_count             — itens na DLQ
 *   - latency_p50/p95/p99   — latências de ciclo (ms)
 */

const db = require('../../../db');

const LAYER = 'AIOI_RUNTIME_METRICS';
const MAX_LATENCY_SAMPLES = 500;

// In-memory accumulators — reset on process restart (by design)
let _ingestedEvents      = 0;
let _classifiedEvents    = 0;
let _projectedSnapshots  = 0;
let _cycleCount          = 0;
let _lastResetAt         = new Date().toISOString();

// Circular latency buffer
const _latencySamples = [];

// ─── Writers (called by continuous worker) ─────────────────────────────────

/**
 * Registra ingestion (chamado pelo adapter após INSERT IOE).
 * @param {number} count
 */
function recordIngestion(count = 1) {
  _ingestedEvents += Math.max(0, count);
}

/**
 * Registra batch de classificação.
 * @param {object} params
 * @param {number} params.processed
 */
function recordClassification({ processed = 0 } = {}) {
  _classifiedEvents += Math.max(0, processed);
}

/**
 * Registra projeção de snapshot.
 * @param {number} count
 */
function recordSnapshotProjection(count = 1) {
  _projectedSnapshots += Math.max(0, count);
}

/**
 * Registra latência de ciclo (ms).
 * @param {number} ms
 */
function recordCycleLatency(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return;
  _latencySamples.push(ms);
  if (_latencySamples.length > MAX_LATENCY_SAMPLES) _latencySamples.shift();
  _cycleCount += 1;
}

/**
 * Reseta contadores in-memory.
 */
function resetCounters() {
  _ingestedEvents     = 0;
  _classifiedEvents   = 0;
  _projectedSnapshots = 0;
  _cycleCount         = 0;
  _latencySamples.length = 0;
  _lastResetAt = new Date().toISOString();
}

// ─── Percentile calculation ────────────────────────────────────────────────

function _percentile(sorted, pct) {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.ceil(pct * sorted.length) - 1);
  return sorted[idx];
}

function _computeLatencies() {
  if (_latencySamples.length === 0) {
    return { p50: 0, p95: 0, p99: 0, count: 0, min: 0, max: 0 };
  }
  const sorted = [..._latencySamples].sort((a, b) => a - b);
  return {
    p50:   _percentile(sorted, 0.50),
    p95:   _percentile(sorted, 0.95),
    p99:   _percentile(sorted, 0.99),
    count: sorted.length,
    min:   sorted[0],
    max:   sorted[sorted.length - 1]
  };
}

// ─── DB live counters ──────────────────────────────────────────────────────

/**
 * Lê contadores ao vivo do aioi_outbox no BD.
 * @returns {Promise<object>}
 */
async function _fetchOutboxCounters() {
  try {
    const result = await db.query(`
      SELECT
        COUNT(CASE WHEN status = 'pending'   THEN 1 END)::int  AS pending,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END)::int  AS delivered,
        COUNT(CASE WHEN status = 'failed'    THEN 1 END)::int  AS failed,
        COUNT(CASE WHEN status = 'dlq'       THEN 1 END)::int  AS dlq
      FROM aioi_outbox
    `);
    const r = result.rows[0] || {};
    return {
      outbox_pending:   r.pending   || 0,
      outbox_delivered: r.delivered || 0,
      outbox_failed:    r.failed    || 0,
      dlq_count:        r.dlq       || 0
    };
  } catch {
    return { outbox_pending: 0, outbox_delivered: 0, outbox_failed: 0, dlq_count: 0 };
  }
}

// ─── Main snapshot ─────────────────────────────────────────────────────────

/**
 * Retorna snapshot completo de métricas operacionais.
 * @returns {Promise<object>}
 */
async function getMetricsSnapshot() {
  const [outbox, latencies] = await Promise.all([
    _fetchOutboxCounters(),
    Promise.resolve(_computeLatencies())
  ]);

  return {
    ok: true,
    layer: LAYER,
    timestamp: new Date().toISOString(),
    last_reset: _lastResetAt,
    cycle_count: _cycleCount,
    ingested_events:     _ingestedEvents,
    classified_events:   _classifiedEvents,
    projected_snapshots: _projectedSnapshots,
    outbox_pending:      outbox.outbox_pending,
    outbox_delivered:    outbox.outbox_delivered,
    outbox_failed:       outbox.outbox_failed,
    dlq_count:           outbox.dlq_count,
    latency_p50: latencies.p50,
    latency_p95: latencies.p95,
    latency_p99: latencies.p99,
    latency_count: latencies.count,
    latency_min: latencies.min,
    latency_max: latencies.max
  };
}

/**
 * Retorna snapshot leve (sem queries DB — para health checks frequentes).
 * @returns {object}
 */
function getMetricsSummary() {
  const latencies = _computeLatencies();
  return {
    layer: LAYER,
    cycle_count: _cycleCount,
    ingested_events:     _ingestedEvents,
    classified_events:   _classifiedEvents,
    projected_snapshots: _projectedSnapshots,
    latency_p50: latencies.p50,
    latency_p95: latencies.p95,
    latency_p99: latencies.p99
  };
}

module.exports = {
  recordIngestion,
  recordClassification,
  recordSnapshotProjection,
  recordCycleLatency,
  resetCounters,
  getMetricsSnapshot,
  getMetricsSummary,
  LAYER
};
