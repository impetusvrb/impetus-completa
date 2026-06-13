'use strict';

/**
 * AIOI-P1D.1 — Outbox Retention Service
 *
 * Framework de retenção para aioi_outbox (status='delivered' apenas).
 * ADDITIVE ONLY · dry-run por padrão · ZERO impacto em pending/processing/failed.
 *
 * Config:
 *   IMPETUS_AIOI_OUTBOX_RETENTION_DAYS=90
 *   IMPETUS_AIOI_OUTBOX_RETENTION_EXECUTE=false  (true para purge real)
 */

const db = require('../../../db');

const LAYER = 'AIOI_OUTBOX_RETENTION';
const DEFAULT_RETENTION_DAYS = 90;
const PROTECTED_STATUSES = ['pending', 'processing', 'failed'];

function _getRetentionDays() {
  const n = parseInt(String(process.env.IMPETUS_AIOI_OUTBOX_RETENTION_DAYS || DEFAULT_RETENTION_DAYS), 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : DEFAULT_RETENTION_DAYS, 7), 3650);
}

function _isExecuteEnabled() {
  return String(process.env.IMPETUS_AIOI_OUTBOX_RETENTION_EXECUTE || 'false').toLowerCase() === 'true';
}

function _cutoffDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/**
 * Conta registros delivered elegíveis para purge (mais antigos que retention).
 * @param {object} [opts]
 * @param {string} [opts.companyId] — filtro opcional por tenant
 * @returns {Promise<object>}
 */
async function countEligibleDeliveredRecords({ companyId } = {}) {
  const days = _getRetentionDays();
  const cutoff = _cutoffDate(days);
  const params = [cutoff];
  let companyFilter = '';
  if (companyId) {
    params.push(companyId);
    companyFilter = ` AND company_id = $${params.length}::uuid`;
  }

  const r = await db.query(
    `SELECT COUNT(*)::int AS eligible
     FROM aioi_outbox
     WHERE status = 'delivered'
       AND COALESCE(processed_at, updated_at, created_at) < $1::timestamptz
       ${companyFilter}`,
    params
  );

  const totalDelivered = await db.query(
    `SELECT COUNT(*)::int AS n FROM aioi_outbox WHERE status = 'delivered'${companyId ? ' AND company_id = $1::uuid' : ''}`,
    companyId ? [companyId] : []
  );

  return {
    layer: LAYER,
    retention_days: days,
    cutoff_at: cutoff,
    eligible_for_purge: r.rows[0]?.eligible || 0,
    total_delivered: totalDelivered.rows[0]?.n || 0,
    protected_statuses: PROTECTED_STATUSES,
    company_id: companyId || null
  };
}

/**
 * Estima impacto de retenção (bytes, percentual).
 * @param {object} [opts]
 * @returns {Promise<object>}
 */
async function estimateRetentionImpact({ companyId } = {}) {
  const counts = await countEligibleDeliveredRecords({ companyId });
  const days = counts.retention_days;

  const params = [_cutoffDate(days)];
  let companyFilter = '';
  if (companyId) {
    params.push(companyId);
    companyFilter = ` AND company_id = $${params.length}::uuid`;
  }

  const sizeR = await db.query(
    `SELECT COALESCE(SUM(pg_column_size(aioi_outbox.*)), 0)::bigint AS est_bytes
     FROM aioi_outbox
     WHERE status = 'delivered'
       AND COALESCE(processed_at, updated_at, created_at) < $1::timestamptz
       ${companyFilter}`,
    params
  );

  const tableSize = await db.query(
    `SELECT pg_total_relation_size('aioi_outbox'::regclass)::bigint AS bytes`
  );
  const estBytes = parseInt(sizeR.rows[0]?.est_bytes || 0, 10);
  const tableBytes = parseInt(tableSize.rows[0]?.bytes || 0, 10);

  return {
    ...counts,
    estimated_bytes_reclaimed: estBytes,
    estimated_bytes_human: _formatBytes(estBytes),
    table_bytes_total: tableBytes,
    reclaim_percent: tableBytes > 0 ? +((estBytes / tableBytes) * 100).toFixed(2) : 0,
    execute_enabled: _isExecuteEnabled(),
    mode: _isExecuteEnabled() ? 'execute_available' : 'dry_run_only'
  };
}

function _formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Dry-run — lista o que seria removido sem DELETE.
 * @param {object} [opts]
 * @returns {Promise<object>}
 */
async function retentionDryRun({ companyId, sampleLimit = 5 } = {}) {
  const impact = await estimateRetentionImpact({ companyId });
  const days = impact.retention_days;
  const cutoff = _cutoffDate(days);
  const params = [cutoff, sampleLimit];
  let companyFilter = '';
  if (companyId) {
    params.splice(1, 0, companyId);
    companyFilter = ` AND company_id = $2::uuid`;
    params[2] = sampleLimit;
  }

  const sample = await db.query(
    `SELECT id, company_id, status, processed_at, created_at
     FROM aioi_outbox
     WHERE status = 'delivered'
       AND COALESCE(processed_at, updated_at, created_at) < $1::timestamptz
       ${companyFilter}
     ORDER BY created_at ASC
     LIMIT $${params.length}`,
    params
  );

  return {
    ok: true,
    layer: LAYER,
    mode: 'dry_run',
    would_purge_count: impact.eligible_for_purge,
    retention_days: days,
    cutoff_at: cutoff,
    estimated_impact: impact,
    sample_records: sample.rows,
    execute_enabled: _isExecuteEnabled(),
    message: _isExecuteEnabled()
      ? 'Dry-run completo. Purge real requer chamada explícita a purgeDeliveredRecords({ confirm: true }).'
      : 'Dry-run only. IMPETUS_AIOI_OUTBOX_RETENTION_EXECUTE=false.'
  };
}

/**
 * Purge de registros delivered antigos.
 * Requer confirm=true E IMPETUS_AIOI_OUTBOX_RETENTION_EXECUTE=true.
 * @param {object} opts
 * @param {boolean} opts.confirm
 * @param {string} [opts.companyId]
 * @returns {Promise<object>}
 */
async function purgeDeliveredRecords({ confirm = false, companyId } = {}) {
  if (!confirm) {
    return { ok: false, error: 'confirm=true obrigatório para purge', mode: 'aborted' };
  }
  if (!_isExecuteEnabled()) {
    return {
      ok: false,
      error: 'IMPETUS_AIOI_OUTBOX_RETENTION_EXECUTE=false — purge bloqueado',
      mode: 'dry_run_only'
    };
  }

  const dry = await retentionDryRun({ companyId });
  if (dry.would_purge_count === 0) {
    return { ok: true, purged: 0, mode: 'nothing_to_purge', dry_run: dry };
  }

  const days = _getRetentionDays();
  const cutoff = _cutoffDate(days);
  const params = [cutoff];
  let companyFilter = '';
  if (companyId) {
    params.push(companyId);
    companyFilter = ` AND company_id = $2::uuid`;
  }

  const result = await db.query(
    `DELETE FROM aioi_outbox
     WHERE status = 'delivered'
       AND COALESCE(processed_at, updated_at, created_at) < $1::timestamptz
       ${companyFilter}
     RETURNING id`,
    params
  );

  return {
    ok: true,
    layer: LAYER,
    mode: 'executed',
    purged: result.rowCount || 0,
    retention_days: days,
    cutoff_at: cutoff,
    protected_statuses: PROTECTED_STATUSES,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  estimateRetentionImpact,
  countEligibleDeliveredRecords,
  retentionDryRun,
  purgeDeliveredRecords,
  LAYER,
  DEFAULT_RETENTION_DAYS,
  PROTECTED_STATUSES
};
