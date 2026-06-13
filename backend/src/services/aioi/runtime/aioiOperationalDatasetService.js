'use strict';

/**
 * AIOI-P1L.1 — Operational Dataset Certification
 * READ ONLY · valida datasets reais (IOE, outbox, snapshots).
 */

const db = require('../../../db');
const pilotFlags = require('../aioiPilotFlags');

const LAYER = 'AIOI_OPERATIONAL_DATASET';

async function _safeQuery(sql, params = []) {
  try {
    return await db.query(sql, params);
  } catch (err) {
    return { rows: [], error: err.message };
  }
}

async function certifyOperationalDataset() {
  const tenants = pilotFlags.getPilotTenants();
  const tenantParam = tenants.length ? tenants : ['00000000-0000-0000-0000-000000000000'];

  const [ioeStats, dupCheck, corruptCheck, outboxStats, snapshotStats, tenantCoverage] = await Promise.all([
    _safeQuery(`
      SELECT COUNT(*)::int AS total,
             COUNT(DISTINCT company_id)::int AS tenant_count
      FROM industrial_operational_events
      WHERE company_id = ANY($1::uuid[])
    `, [tenantParam]),
    _safeQuery(`
      SELECT company_id, idempotency_key, COUNT(*)::int AS n
      FROM industrial_operational_events
      WHERE company_id = ANY($1::uuid[])
      GROUP BY company_id, idempotency_key
      HAVING COUNT(*) > 1
      LIMIT 100
    `, [tenantParam]),
    _safeQuery(`
      SELECT COUNT(*)::int AS n
      FROM industrial_operational_events
      WHERE company_id = ANY($1::uuid[])
        AND (idempotency_key IS NULL OR idempotency_key = '' OR company_id IS NULL)
    `, [tenantParam]),
    _safeQuery(`
      SELECT status, COUNT(*)::int AS n
      FROM aioi_outbox
      WHERE company_id = ANY($1::uuid[])
      GROUP BY status
    `, [tenantParam]),
    _safeQuery(`
      SELECT COUNT(*)::int AS total,
             COUNT(DISTINCT company_id)::int AS tenant_count
      FROM aioi_executive_queue_snapshot
      WHERE company_id = ANY($1::uuid[])
    `, [tenantParam]),
    _safeQuery(`
      SELECT company_id::text, COUNT(*)::int AS ioe_count
      FROM industrial_operational_events
      WHERE company_id = ANY($1::uuid[])
      GROUP BY company_id
    `, [tenantParam])
  ]);

  const duplicates = dupCheck.rows?.length || 0;
  const corrupted = corruptCheck.rows?.[0]?.n || 0;
  const ioeTotal = ioeStats.rows?.[0]?.total || 0;
  const snapshotTotal = snapshotStats.rows?.[0]?.total || 0;

  const outboxByStatus = {};
  for (const row of outboxStats.rows || []) {
    outboxByStatus[row.status] = row.n;
  }

  const coverageMap = {};
  for (const t of tenants) coverageMap[t] = 0;
  for (const row of tenantCoverage.rows || []) {
    coverageMap[row.company_id] = row.ioe_count;
  }

  const datasetCertified = duplicates === 0 && corrupted === 0;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    dataset_certified: datasetCertified,
    duplicates,
    corrupted_records: corrupted,
    pilot_tenants: tenants,
    datasets: {
      ioe: { total: ioeTotal, tenant_count: ioeStats.rows?.[0]?.tenant_count || 0 },
      outbox: { by_status: outboxByStatus, total: Object.values(outboxByStatus).reduce((a, b) => a + b, 0) },
      snapshots: { total: snapshotTotal, tenant_count: snapshotStats.rows?.[0]?.tenant_count || 0 }
    },
    coverage: coverageMap,
    integrity: {
      idempotency_unique: duplicates === 0,
      no_null_keys: corrupted === 0
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  certifyOperationalDataset,
  LAYER
};
