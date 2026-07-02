'use strict';

/**
 * CERT-EVENT-RETENTION-01 — Event Archive Service
 * Camada aditiva sobre industrialArchiveService: arquivar, consultar, restaurar metadados, integridade.
 */

const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const industrialArchive = require('../archive/industrialArchiveService');
const { classifyEvent } = require('./eventBackboneCategoryRegistry');
const { LIFECYCLE_STATES } = require('./eventLifecycleStates');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

function _checksum(payload) {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Arquiva batch via serviço W2 existente e enriquece com lifecycle/category.
 */
async function archiveWithLifecycle(opts = {}) {
  const runId = uuidv4();
  const result = await industrialArchive.archiveDeliveredBatch(opts);
  if (!result.ok || result.archived === 0) {
    return { ...result, lifecycle_run_id: runId };
  }

  try {
    const upd = await db.query(
      `UPDATE industrial_event_archive
       SET lifecycle_state = $1,
           event_category = COALESCE(event_category,
             CASE
               WHEN domain ILIKE '%telemetry%' OR event_name ILIKE '%telemetry%' THEN 'operational_telemetry'
               WHEN domain IN ('pulse','hr','human') OR event_name ILIKE 'pulse.%' OR event_name ILIKE 'hr.%' THEN 'human_pulse'
               WHEN domain IN ('cognitive','ai','anam') OR event_name ILIKE 'cognitive.%' THEN 'cognitive'
               WHEN domain IN ('audit','governance','lgpd') OR event_name ILIKE 'audit.%' THEN 'audit_compliance'
               ELSE 'operational_industrial'
             END),
           explainability = COALESCE(explainability, '{}'::jsonb) || $2::jsonb
       WHERE metadata->>'run_id' = $3
         AND lifecycle_state = 'ARCHIVED'`,
      [
        LIFECYCLE_STATES.ARCHIVED,
        JSON.stringify({
          archived_by: 'eventArchiveService',
          policy: 'CERT-EVENT-RETENTION-01',
          run_id: result.run_id || runId
        }),
        result.run_id || runId
      ]
    );
    return { ...result, lifecycle_run_id: runId, lifecycle_rows_updated: upd.rowCount || 0 };
  } catch (err) {
    return { ...result, lifecycle_run_id: runId, lifecycle_warning: err?.message || String(err) };
  }
}

/**
 * Consulta eventos arquivados (não participa de consultas operacionais por defeito).
 */
async function queryArchivedEvents(opts = {}) {
  const limit = Math.min(500, Math.max(1, Number(opts.limit) || 50));
  const params = [limit];
  const clauses = ['1=1'];

  if (opts.company_id) {
    params.push(opts.company_id);
    clauses.push(`company_id = $${params.length}::uuid`);
  }
  if (opts.lifecycle_state) {
    params.push(String(opts.lifecycle_state).toUpperCase());
    clauses.push(`lifecycle_state = $${params.length}`);
  }
  if (opts.category) {
    params.push(String(opts.category));
    clauses.push(`event_category = $${params.length}`);
  }
  if (opts.event_name) {
    params.push(String(opts.event_name));
    clauses.push(`event_name = $${params.length}`);
  }
  if (opts.since) {
    params.push(opts.since);
    clauses.push(`archived_at >= $${params.length}::timestamptz`);
  }

  const r = await db.query(
    `SELECT id, event_name, domain, company_id, lifecycle_state, event_category,
            correlation_id, archived_at, created_at, delivered_at, integrity_checksum,
            (compressed_payload IS NOT NULL) AS is_compressed
     FROM industrial_event_archive
     WHERE ${clauses.join(' AND ')}
     ORDER BY archived_at DESC
     LIMIT $1`,
    params
  );
  return { ok: true, events: r.rows || [], count: (r.rows || []).length };
}

/**
 * Restaura metadados de consulta (não re-enfileira no outbox — reversível apenas como metadado).
 */
async function restoreArchiveMetadata(archiveId, opts = {}) {
  const r = await db.query(
    `SELECT id, lifecycle_state, event_name, domain, company_id, envelope, metadata
     FROM industrial_event_archive WHERE id = $1::uuid LIMIT 1`,
    [archiveId]
  );
  const row = r.rows?.[0];
  if (!row) return { ok: false, reason: 'not_found' };

  return {
    ok: true,
    restore_request_id: uuidv4(),
    archive_id: row.id,
    lifecycle_state: row.lifecycle_state,
    event_name: row.event_name,
    domain: row.domain,
    company_id: row.company_id,
    dry_run: opts.dry_run !== false,
    note: 'Metadados disponíveis para auditoria/investigação. Re-enfileiramento no outbox requer fluxo governado separado.'
  };
}

async function validateIntegrity(archiveId) {
  const r = await db.query(
    `SELECT id, envelope, compressed_payload, integrity_checksum
     FROM industrial_event_archive WHERE id = $1::uuid LIMIT 1`,
    [archiveId]
  );
  const row = r.rows?.[0];
  if (!row) return { ok: false, reason: 'not_found' };

  let payload = row.envelope;
  if (row.compressed_payload) {
    try {
      const buf = await gunzip(row.compressed_payload);
      payload = JSON.parse(buf.toString('utf8'));
    } catch (e) {
      return { ok: false, reason: 'decompress_failed', error: e?.message };
    }
  }

  const computed = _checksum(payload);
  const stored = row.integrity_checksum;
  return {
    ok: true,
    archive_id: row.id,
    valid: !stored || stored === computed,
    checksum: computed,
    stored_checksum: stored || null
  };
}

/**
 * Compressão transparente de payloads arquivados (preserva envelope + checksum).
 */
async function compressArchivedBatch(opts = {}) {
  const batchSize = Math.min(200, Math.max(1, Number(opts.batch_size) || 50));
  const r = await db.query(
    `SELECT id, envelope, integrity_checksum
     FROM industrial_event_archive
     WHERE compressed_payload IS NULL
       AND lifecycle_state IN ('ARCHIVED', 'HISTORICAL')
     ORDER BY archived_at ASC
     LIMIT $1`,
    [batchSize]
  );
  const rows = r.rows || [];
  let compressed = 0;
  for (const row of rows) {
    try {
      const json = typeof row.envelope === 'object' ? JSON.stringify(row.envelope) : String(row.envelope || '{}');
      const checksum = row.integrity_checksum || _checksum(json);
      const buf = await gzip(Buffer.from(json, 'utf8'));
      await db.query(
        `UPDATE industrial_event_archive
         SET compressed_payload = $2,
             integrity_checksum = $3,
             explainability = COALESCE(explainability, '{}'::jsonb) || $4::jsonb
         WHERE id = $1::uuid`,
        [
          row.id,
          buf,
          checksum,
          JSON.stringify({ compressed_at: new Date().toISOString(), compression: 'gzip' })
        ]
      );
      compressed += 1;
    } catch (_e) {
      /* continua batch */
    }
  }
  return { ok: true, compressed, candidates: rows.length };
}

async function getArchiveStatistics() {
  const [byState, byCategory, totalSize] = await Promise.all([
    db.query(
      `SELECT lifecycle_state, COUNT(*)::bigint AS count
       FROM industrial_event_archive GROUP BY lifecycle_state`
    ),
    db.query(
      `SELECT COALESCE(event_category, 'unclassified') AS category, COUNT(*)::bigint AS count
       FROM industrial_event_archive GROUP BY 1`
    ),
    db.query(
      `SELECT COUNT(*)::bigint AS total,
              COUNT(*) FILTER (WHERE compressed_payload IS NOT NULL)::bigint AS compressed,
              pg_size_pretty(pg_total_relation_size('industrial_event_archive')) AS table_size
       FROM industrial_event_archive`
    )
  ]);

  return {
    ok: true,
    by_state: byState.rows || [],
    by_category: byCategory.rows || [],
    totals: totalSize.rows?.[0] || {},
    industrial_stats: industrialArchive.getArchiveStats()
  };
}

module.exports = {
  archiveWithLifecycle,
  queryArchivedEvents,
  restoreArchiveMetadata,
  validateIntegrity,
  compressArchivedBatch,
  getArchiveStatistics,
  _checksum
};
