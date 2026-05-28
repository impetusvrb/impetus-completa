'use strict';

/**
 * Archive WAVE 2 — move delivered (e opcionalmente antigos pending falhos) para industrial_event_archive.
 */

const { v4: uuidv4 } = require('uuid');
const {
  isIndustrialArchiveEnabled,
  isIndustrialOutboxEnabled,
  archiveDeliveredAfterDays,
  isIndustrialBackboneActive,
  isArchiveDryRun,
  industrialArchiveMode
} = require('../industrialFlags');

let _stats = {
  runs: 0,
  archived: 0,
  deleted: 0,
  errors: 0
};

/**
 * @param {{ delivered_days?: number, batch_size?: number, company_id?: string }} [opts]
 */
async function archiveDeliveredBatch(opts = {}) {
  if (!isIndustrialArchiveEnabled() || !isIndustrialBackboneActive()) {
    return { ok: false, reason: 'archive_disabled' };
  }
  if (!isIndustrialOutboxEnabled()) {
    return { ok: true, skipped: true, reason: 'outbox_disabled' };
  }

  const days = opts.delivered_days != null ? Number(opts.delivered_days) : archiveDeliveredAfterDays();
  const batchSize = Math.min(500, Math.max(1, Number(opts.batch_size) || 200));
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  _stats.runs += 1;
  const runId = uuidv4();

  try {
    const db = require('../../db');
    const params = [cutoff, batchSize];
    let where = `status = 'delivered' AND delivered_at IS NOT NULL AND delivered_at < $1::timestamptz`;
    if (opts.company_id) {
      where += ` AND company_id = $3::uuid`;
      params.push(opts.company_id);
    }

    const sel = await db.query(
      `SELECT id, event_name, domain, company_id, partition_key, partition_month,
              idempotency_key, correlation_id, envelope, status, created_at, delivered_at
       FROM industrial_event_outbox
       WHERE ${where}
       ORDER BY delivered_at ASC
       LIMIT $2`,
      params
    );

    const rows = sel.rows || [];
    if (rows.length === 0) {
      return { ok: true, run_id: runId, archived: 0, deleted: 0, dry_run: isArchiveDryRun() };
    }

    const dryRun = isArchiveDryRun();
    let archived = 0;
    let deleted = 0;

    for (const row of rows) {
      const archId = uuidv4();
      try {
        if (dryRun) {
          archived += 1;
          continue;
        }
        await db.query(
          `INSERT INTO industrial_event_archive
           (id, source_table, event_name, domain, company_id, partition_key, partition_month,
            idempotency_key, correlation_id, envelope, original_status, archived_at, created_at, delivered_at, metadata)
           VALUES ($1::uuid, 'industrial_event_outbox', $2, $3, $4::uuid, $5, $6, $7, $8, $9::jsonb, $10, now(), $11::timestamptz, $12::timestamptz, $13::jsonb)
           ON CONFLICT (idempotency_key) DO NOTHING`,
          [
            archId,
            row.event_name,
            row.domain,
            row.company_id,
            row.partition_key,
            row.partition_month || null,
            row.idempotency_key,
            row.correlation_id,
            typeof row.envelope === 'object' ? JSON.stringify(row.envelope) : row.envelope,
            row.status,
            row.created_at,
            row.delivered_at,
            JSON.stringify({ run_id: runId, wave: 2 })
          ]
        );
        await db.query(`DELETE FROM industrial_event_outbox WHERE id = $1::uuid`, [row.id]);
        archived += 1;
        deleted += 1;
      } catch (_rowErr) {
        _stats.errors += 1;
      }
    }

    _stats.archived += archived;
    _stats.deleted += deleted;

    console.info(
      '[INDUSTRIAL_ARCHIVE]',
      JSON.stringify({
        event: 'INDUSTRIAL_ARCHIVE',
        run_id: runId,
        archived,
        deleted,
        dry_run: dryRun,
        archive_mode: industrialArchiveMode(),
        cutoff,
        company_id: opts.company_id || null
      })
    );

    return { ok: true, run_id: runId, archived, deleted, cutoff, dry_run: dryRun, archive_mode: industrialArchiveMode() };
  } catch (err) {
    _stats.errors += 1;
    return { ok: false, error: err?.message || String(err), run_id: runId };
  }
}

function getArchiveStats() {
  return { ..._stats, delivered_days: archiveDeliveredAfterDays() };
}

module.exports = {
  archiveDeliveredBatch,
  getArchiveStats
};
