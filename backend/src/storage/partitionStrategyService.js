'use strict';

/**
 * WAVE 3 — estratégia de particionamento (metadados + manutenção opt-in em tabelas NOVAS).
 */

const flags = require('./storageFlags');

async function listPartitionPlans() {
  try {
    const db = require('../db');
    const r = await db.query(
      `SELECT p.id, p.logical_name, p.strategy, p.partition_key, p.premake_partitions, p.status, p.applied_at
       FROM impetus_partition_plan p
       ORDER BY p.created_at DESC
       LIMIT 100`
    );
    return r.rows || [];
  } catch (_e) {
    return [];
  }
}

/**
 * Cria partição mensal futura apenas para industrial_telemetry_samples (tabela nova).
 * Nunca toca em tabelas legadas.
 */
async function ensureTelemetrySamplePartition(partitionDate) {
  if (!flags.isPartitionMaintenanceEnabled()) {
    return { ok: false, reason: 'partition_maintenance_disabled' };
  }

  const d = partitionDate instanceof Date ? partitionDate : new Date(partitionDate || Date.now());
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  const suffix = `${start.getUTCFullYear()}${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
  const tableName = `industrial_telemetry_samples_y${suffix}`;

  const db = require('../db');
  const fromIso = start.toISOString();
  const toIso = end.toISOString();

  await db.query(
    `CREATE TABLE IF NOT EXISTS ${tableName}
     PARTITION OF industrial_telemetry_samples
     FOR VALUES FROM ($1::timestamptz) TO ($2::timestamptz)`,
    [fromIso, toIso]
  );

  return { ok: true, partition_table: tableName, from: fromIso, to: toIso };
}

function getPartitioningStrategyDoc() {
  const strategy = flags.partitioningStrategy();
  return {
    strategy,
    applies_to: ['industrial_telemetry_samples', 'telemetry_timeseries_v1 (futuro)'],
    legacy_tables: 'registry only — no DDL',
    maintenance_enabled: flags.isPartitionMaintenanceEnabled()
  };
}

module.exports = {
  listPartitionPlans,
  ensureTelemetrySamplePartition,
  getPartitioningStrategyDoc
};
