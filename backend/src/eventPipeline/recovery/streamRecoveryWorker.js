'use strict';

/**
 * Stream recovery WAVE 2 — reagenda eventos pending stale após crash ou drain interrompido.
 */

const { v4: uuidv4 } = require('uuid');
const {
  isIndustrialStreamRecoveryEnabled,
  isIndustrialOutboxEnabled,
  streamRecoveryStaleMs,
  isIndustrialBackboneActive
} = require('../industrialFlags');

let _stats = {
  runs: 0,
  stale_found: 0,
  reset: 0,
  errors: 0
};

async function _updateCheckpoint(meta) {
  if (!isIndustrialOutboxEnabled()) return;
  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO industrial_event_stream_checkpoint (id, last_recovery_at, stale_reset_count, pending_recovered, metadata, updated_at)
       VALUES ('default', now(), $1, $2, $3::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET
         last_recovery_at = now(),
         stale_reset_count = industrial_event_stream_checkpoint.stale_reset_count + EXCLUDED.stale_reset_count,
         pending_recovered = industrial_event_stream_checkpoint.pending_recovered + EXCLUDED.pending_recovered,
         metadata = EXCLUDED.metadata,
         updated_at = now()`,
      [
        meta.stale_reset_count || 0,
        meta.pending_recovered || 0,
        JSON.stringify(meta)
      ]
    );
  } catch (_e) {}
}

/**
 * @param {{ stale_ms?: number, limit?: number }} [opts]
 */
async function runStreamRecovery(opts = {}) {
  if (!isIndustrialStreamRecoveryEnabled() || !isIndustrialBackboneActive()) {
    return { ok: false, reason: 'recovery_disabled' };
  }
  if (!isIndustrialOutboxEnabled()) {
    return { ok: true, skipped: true, reason: 'outbox_disabled' };
  }

  const staleMs = opts.stale_ms != null ? Number(opts.stale_ms) : streamRecoveryStaleMs();
  const limit = Math.min(2000, Math.max(1, Number(opts.limit) || 500));
  _stats.runs += 1;

  const traceId = uuidv4();
  let reset = 0;

  try {
    const db = require('../../db');
    const staleBefore = new Date(Date.now() - staleMs).toISOString();
    const sel = await db.query(
      `SELECT id, attempts FROM industrial_event_outbox
       WHERE status = 'pending' AND updated_at < $1::timestamptz
       ORDER BY updated_at ASC
       LIMIT $2`,
      [staleBefore, limit]
    );
    const rows = sel.rows || [];
    _stats.stale_found += rows.length;

    if (rows.length === 0) {
      await _updateCheckpoint({ trace_id: traceId, reset: 0 });
      return { ok: true, trace_id: traceId, stale_found: 0, reset: 0 };
    }

    const ids = rows.map((r) => r.id);
    const upd = await db.query(
      `UPDATE industrial_event_outbox
       SET next_attempt_at = now(), last_error = COALESCE(last_error, 'stream_recovery_reset'), updated_at = now()
       WHERE id = ANY($1::uuid[]) AND status = 'pending'
       RETURNING id`,
      [ids]
    );
    reset = upd.rowCount || 0;
    _stats.reset += reset;

    try {
      const outbox = require('../outbox/industrialOutboxService');
      outbox.drainOutboxBatch().catch(() => {});
    } catch (_e) {}

    await _updateCheckpoint({
      trace_id: traceId,
      stale_reset_count: reset,
      pending_recovered: reset,
      stale_ms: staleMs
    });

    console.info(
      '[INDUSTRIAL_STREAM_RECOVERY]',
      JSON.stringify({
        event: 'INDUSTRIAL_STREAM_RECOVERY',
        trace_id: traceId,
        stale_found: rows.length,
        reset,
        stale_ms: staleMs
      })
    );

    return { ok: true, trace_id: traceId, stale_found: rows.length, reset };
  } catch (err) {
    _stats.errors += 1;
    return { ok: false, error: err?.message || String(err), trace_id: traceId };
  }
}

function getRecoveryStats() {
  return { ..._stats, stale_ms: streamRecoveryStaleMs() };
}

module.exports = {
  runStreamRecovery,
  getRecoveryStats
};
