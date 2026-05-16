'use strict';

/**
 * WAVE 3 — governança de storage (registry, tiers, candidatos).
 */

const flags = require('./storageFlags');

async function _db() {
  return require('../db');
}

async function listTableRegistry() {
  if (!flags.isStorageV3Enabled()) return { enabled: false, tables: [] };
  try {
    const db = await _db();
    const r = await db.query(
      `SELECT logical_name, physical_table, data_class, tier_code, retention_policy_code,
              partition_strategy, partition_key, timescale_candidate, telemetry_isolated,
              immutable_audit, convert_allowed, notes
       FROM impetus_storage_table_registry
       ORDER BY logical_name`
    );
    return { enabled: true, tables: r.rows || [] };
  } catch (err) {
    return { enabled: true, tables: [], error: err.message, schema_missing: true };
  }
}

async function listTiers() {
  try {
    const db = await _db();
    const r = await db.query(`SELECT tier_code, description, latency_class, compression_policy FROM impetus_storage_tier ORDER BY tier_code`);
    return r.rows || [];
  } catch (_e) {
    return [];
  }
}

async function getGovernanceSnapshot() {
  const [registry, tiers, retention, timescale, compression] = await Promise.all([
    listTableRegistry(),
    listTiers(),
    require('./retentionPolicyService').listPolicies(),
    require('./timescaleReadinessService').getReadiness(),
    require('./compressionPlanningService').listPlans()
  ]);

  return {
    enabled: flags.isStorageV3Enabled(),
    flags: {
      timescale: flags.isTimescaleEnabled(),
      partitioning: flags.partitioningStrategy(),
      cold_storage: flags.isColdStorageEnabled(),
      retention_profile: flags.retentionProfile(),
      telemetry_ingest: flags.isTelemetryIsolatedIngestEnabled()
    },
    registry,
    tiers,
    retention,
    timescale,
    compression
  };
}

module.exports = {
  listTableRegistry,
  listTiers,
  getGovernanceSnapshot
};
