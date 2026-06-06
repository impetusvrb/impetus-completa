'use strict';

/**
 * AIOI-P1.4 — Metrics Snapshot Persistence Service
 *
 * Persistência histórica de métricas agregadas em aioi_metrics_snapshots.
 *
 * PROIBIÇÕES: somente INSERT nas novas tabelas; sem soberanos funcionais.
 */

const db = require('../../db');
const { isValidUUID } = require('../../utils/security');
const metrics = require('./aioiPersistenceMetrics');

const TABLE = 'aioi_metrics_snapshots';

const VALID_SNAPSHOT_TYPES = Object.freeze([
  'lifecycle_snapshot',
  'cycle_kpis',
  'backlog_snapshot'
]);

async function _withTenantClient(companyId, fn) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function _buildIdempotencyKey(snapshotType, keySuffix) {
  const suffix = keySuffix || new Date().toISOString().slice(0, 16);
  return `${snapshotType}:${suffix}`;
}

async function _persistSnapshot({ companyId, snapshotType, snapshotPayload, idempotencyKey }) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }
  if (!VALID_SNAPSHOT_TYPES.includes(snapshotType)) {
    return { ok: false, error: 'snapshotType inválido' };
  }

  metrics.assertAllowedTable(TABLE);

  const sql = `INSERT INTO ${TABLE}
    (company_id, snapshot_type, snapshot_payload, idempotency_key)
    VALUES ($1::uuid, $2, $3::jsonb, $4)
    ON CONFLICT (company_id, idempotency_key) DO NOTHING
    RETURNING id`;

  metrics.assertInsertOnlySql(sql);

  try {
    const row = await _withTenantClient(companyId, async (client) => {
      const result = await client.query(sql, [
        companyId,
        snapshotType,
        JSON.stringify(snapshotPayload || {}),
        idempotencyKey
      ]);
      return result.rows[0] || null;
    });

    if (!row) {
      metrics.recordSkipped(companyId, `snapshot_duplicate:${snapshotType}`);
      return { ok: true, alreadyPersisted: true };
    }

    metrics.recordMetricSnapshotPersisted(companyId, snapshotType);
    return { ok: true, persisted: true, id: row.id };

  } catch (err) {
    metrics.recordError(companyId, 'persistSnapshot', err.message);
    return { ok: false, error: err.message };
  }
}

async function persistLifecycleSnapshot({ companyId, snapshot, idempotencyKey }) {
  return _persistSnapshot({
    companyId,
    snapshotType: 'lifecycle_snapshot',
    snapshotPayload: snapshot,
    idempotencyKey: idempotencyKey || _buildIdempotencyKey('lifecycle_snapshot')
  });
}

async function persistCycleKpis({ companyId, kpis, idempotencyKey }) {
  return _persistSnapshot({
    companyId,
    snapshotType: 'cycle_kpis',
    snapshotPayload: kpis,
    idempotencyKey: idempotencyKey || _buildIdempotencyKey('cycle_kpis')
  });
}

async function persistBacklogSnapshot({ companyId, backlogs, idempotencyKey }) {
  return _persistSnapshot({
    companyId,
    snapshotType: 'backlog_snapshot',
    snapshotPayload: backlogs,
    idempotencyKey: idempotencyKey || _buildIdempotencyKey('backlog_snapshot')
  });
}

module.exports = {
  VALID_SNAPSHOT_TYPES,
  persistLifecycleSnapshot,
  persistCycleKpis,
  persistBacklogSnapshot
};
