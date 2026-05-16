'use strict';

/**
 * WAVE 3 — runtime orquestrador de storage temporal.
 */

const flags = require('./storageFlags');
const governance = require('./storageGovernanceService');
const retention = require('./retentionPolicyService');
const partition = require('./partitionStrategyService');
const timescale = require('./timescaleReadinessService');
const cold = require('./coldStorageManifestService');
const telemetry = require('./telemetryIsolationService');
const compression = require('./compressionPlanningService');

let _booted = false;

async function bootstrap() {
  if (!flags.isStorageV3Enabled() || _booted) {
    return { booted: _booted, enabled: flags.isStorageV3Enabled() };
  }
  _booted = true;

  await compression.seedPlansIfEmpty().catch(() => {});
  await timescale.probeTimescaleExtension().catch(() => {});

  try {
    console.info(
      '[STORAGE_V3_BOOT]',
      JSON.stringify({
        event: 'STORAGE_V3_BOOT',
        partitioning: flags.partitioningStrategy(),
        retention_profile: flags.retentionProfile(),
        timescale: flags.isTimescaleEnabled(),
        telemetry_ingest: flags.isTelemetryIsolatedIngestEnabled()
      })
    );
  } catch (_e) {}

  return { booted: true, enabled: true };
}

async function getHealth() {
  const snapshot = await governance.getGovernanceSnapshot();
  return {
    enabled: flags.isStorageV3Enabled(),
    booted: _booted,
    retention_plan: retention.evaluateRetentionPlan(),
    partition_strategy: partition.getPartitioningStrategyDoc(),
    cold_storage: cold.getColdStorageArchitecture(),
    telemetry_isolation: telemetry.getIsolationStrategy(),
    snapshot
  };
}

async function runImpactAnalysis() {
  return {
    storage: {
      new_tables_only: true,
      legacy_tables_altered: false,
      estimated_empty_schema_mb: '< 5',
      hypertables_active: false
    },
    backup: {
      impact: 'minimal',
      note: 'Novas tabelas incluídas em backup full; sem dependência de boot'
    },
    queries: {
      legacy_plans_changed: false,
      new_tables_used: flags.isTelemetryIsolatedIngestEnabled()
    },
    rollback: {
      flag: 'IMPETUS_STORAGE_V3_ENABLED=false',
      drop_new_tables_optional: [
        'impetus_storage_tier',
        'impetus_retention_policy',
        'impetus_storage_table_registry',
        'telemetry_timeseries_v1',
        'industrial_telemetry_samples'
      ]
    }
  };
}

module.exports = {
  bootstrap,
  getHealth,
  runImpactAnalysis,
  flags,
  governance,
  retention,
  partition,
  timescale,
  cold,
  telemetry,
  compression
};
