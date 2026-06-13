'use strict';

/**
 * AIOI-P1D.2 — Snapshot Retention Service
 *
 * Mantém os N snapshots mais recentes por tenant; remove excedentes.
 * ADDITIVE ONLY · dry-run por padrão.
 *
 * Config:
 *   IMPETUS_AIOI_SNAPSHOT_RETENTION_COUNT=1000
 *   IMPETUS_AIOI_SNAPSHOT_RETENTION_EXECUTE=false
 */

const db = require('../../../db');

const LAYER = 'AIOI_SNAPSHOT_RETENTION';
const DEFAULT_RETENTION_COUNT = 1000;

function _getRetentionCount() {
  const n = parseInt(String(process.env.IMPETUS_AIOI_SNAPSHOT_RETENTION_COUNT || DEFAULT_RETENTION_COUNT), 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : DEFAULT_RETENTION_COUNT, 10), 100000);
}

function _isExecuteEnabled() {
  return String(process.env.IMPETUS_AIOI_SNAPSHOT_RETENTION_EXECUTE || 'false').toLowerCase() === 'true';
}

/**
 * Conta snapshots por tenant.
 * @returns {Promise<object[]>}
 */
async function countSnapshotsPerTenant() {
  const r = await db.query(
    `SELECT company_id::text AS company_id,
            COUNT(*)::int AS snapshot_count,
            MIN(generated_at) AS oldest_at,
            MAX(generated_at) AS newest_at
     FROM aioi_executive_queue_snapshot
     GROUP BY company_id
     ORDER BY snapshot_count DESC`
  );
  return r.rows.map(row => ({
    company_id: row.company_id,
    snapshot_count: row.snapshot_count,
    oldest_at: row.oldest_at,
    newest_at: row.newest_at
  }));
}

/**
 * Estima crescimento e excesso acima do limite de retenção.
 * @param {object} [opts]
 * @param {string} [opts.companyId]
 * @returns {Promise<object>}
 */
async function estimateSnapshotGrowth({ companyId } = {}) {
  const limit = _getRetentionCount();
  const perTenant = await countSnapshotsPerTenant();
  const filtered = companyId
    ? perTenant.filter(t => t.company_id === companyId)
    : perTenant;

  let totalSnapshots = 0;
  let totalExcess = 0;
  const tenants = filtered.map(t => {
    const excess = Math.max(0, t.snapshot_count - limit);
    totalSnapshots += t.snapshot_count;
    totalExcess += excess;
    return { ...t, retention_limit: limit, excess_count: excess };
  });

  const tableSize = await db.query(
    `SELECT pg_total_relation_size('aioi_executive_queue_snapshot'::regclass)::bigint AS bytes`
  );
  const tableBytes = parseInt(tableSize.rows[0]?.bytes || 0, 10);
  const avgBytesPerSnapshot = totalSnapshots > 0 ? Math.round(tableBytes / totalSnapshots) : 0;

  return {
    layer: LAYER,
    retention_count: limit,
    total_snapshots: totalSnapshots,
    total_excess: totalExcess,
    tenants,
    table_bytes: tableBytes,
    avg_bytes_per_snapshot: avgBytesPerSnapshot,
    projected_reclaim_bytes: totalExcess * avgBytesPerSnapshot,
    execute_enabled: _isExecuteEnabled(),
    mode: _isExecuteEnabled() ? 'execute_available' : 'dry_run_only'
  };
}

/**
 * Dry-run — quantos snapshots seriam removidos por tenant.
 * @param {object} [opts]
 * @returns {Promise<object>}
 */
async function retentionDryRun({ companyId } = {}) {
  const growth = await estimateSnapshotGrowth({ companyId });
  const limit = growth.retention_count;

  const tenantsWithExcess = growth.tenants.filter(t => t.excess_count > 0);

  return {
    ok: true,
    layer: LAYER,
    mode: 'dry_run',
    retention_count: limit,
    would_purge_total: growth.total_excess,
    tenants_affected: tenantsWithExcess.length,
    tenant_details: tenantsWithExcess,
    growth_estimate: growth,
    execute_enabled: _isExecuteEnabled(),
    message: 'Mantém sempre os N snapshots mais recentes por tenant. Purge nunca remove os N mais recentes.'
  };
}

/**
 * Remove snapshots acima do limite (mantém N mais recentes por tenant).
 * @param {object} opts
 * @param {boolean} opts.confirm
 * @param {string} [opts.companyId]
 * @returns {Promise<object>}
 */
async function purgeOldSnapshots({ confirm = false, companyId } = {}) {
  if (!confirm) {
    return { ok: false, error: 'confirm=true obrigatório para purge', mode: 'aborted' };
  }
  if (!_isExecuteEnabled()) {
    return {
      ok: false,
      error: 'IMPETUS_AIOI_SNAPSHOT_RETENTION_EXECUTE=false — purge bloqueado',
      mode: 'dry_run_only'
    };
  }

  const dry = await retentionDryRun({ companyId });
  if (dry.would_purge_total === 0) {
    return { ok: true, purged: 0, mode: 'nothing_to_purge', dry_run: dry };
  }

  const limit = _getRetentionCount();
  const params = [limit];
  let companyFilter = '';
  if (companyId) {
    params.push(companyId);
    companyFilter = ` AND company_id = $2::uuid`;
  }

  const result = await db.query(
    `DELETE FROM aioi_executive_queue_snapshot
     WHERE id IN (
       SELECT id FROM (
         SELECT id,
                ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY generated_at DESC) AS rn
         FROM aioi_executive_queue_snapshot
         WHERE 1=1 ${companyFilter}
       ) ranked
       WHERE rn > $1
     )
     RETURNING id`,
    params
  );

  return {
    ok: true,
    layer: LAYER,
    mode: 'executed',
    purged: result.rowCount || 0,
    retention_count: limit,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  countSnapshotsPerTenant,
  estimateSnapshotGrowth,
  retentionDryRun,
  purgeOldSnapshots,
  LAYER,
  DEFAULT_RETENTION_COUNT
};
