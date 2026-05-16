'use strict';

/**
 * WAVE 3 — Storage & Temporal Foundation
 */

const { v4: uuidv4 } = require('uuid');

let passed = 0;
let failed = 0;
const COMPANY_ID = 'cccccccc-dddd-eeee-ffff-000000000001';
const savedEnv = {};

function saveEnv(keys) {
  keys.forEach((k) => {
    savedEnv[k] = process.env[k];
  });
}

function restoreEnv(keys) {
  keys.forEach((k) => {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  });
}

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

function clearCache(sub) {
  for (const key of Object.keys(require.cache)) {
    if (key.includes(sub)) delete require.cache[key];
  }
}

const ENV_KEYS = [
  'IMPETUS_STORAGE_V3_ENABLED',
  'IMPETUS_TIMESCALE_ENABLED',
  'IMPETUS_PARTITIONING_STRATEGY',
  'IMPETUS_COLD_STORAGE_ENABLED',
  'IMPETUS_RETENTION_PROFILE',
  'IMPETUS_TELEMETRY_ISOLATED_INGEST_ENABLED',
  'IMPETUS_PARTITION_MAINTENANCE_ENABLED',
  'IMPETUS_RETENTION_PURGE_ENABLED'
];

(async () => {
  console.log('\n══ WAVE 3 — STORAGE TEMPORAL FOUNDATION ══\n');
  saveEnv(ENV_KEYS);

  try {
    for (const k of ENV_KEYS) delete process.env[k];

    console.log('── Flags default ──');
    clearCache('storage');
    const flags = require('../storage/storageFlags');
    assert('W3.1 storage v3 disabled', flags.isStorageV3Enabled() === false);
    assert('W3.2 timescale disabled', flags.isTimescaleEnabled() === false);
    assert('W3.3 partitioning none', flags.partitioningStrategy() === 'none');

    console.log('\n── Retention planning ──');
    clearCache('storage');
    const retention = require('../storage/retentionPolicyService');
    assert('W3.4 tier hot for age 1', retention.resolveTierForAge(1, { hot_days: 7, warm_days: 90, cold_days: 365 }) === 'hot');
    assert('W3.5 tier cold for age 400', retention.resolveTierForAge(400, { hot_days: 7, warm_days: 90, cold_days: 365 }) === 'cold');
    const plan = retention.evaluateRetentionPlan();
    assert('W3.6 purge off por defeito', plan.purge_would_run === false);

    console.log('\n── Telemetry isolation validate ──');
    const telemetry = require('../storage/telemetryIsolationService');
    const bad = telemetry.validateSample({ company_id: 'x', metric_key: 'm', value: 1 });
    assert('W3.7 sample inválido rejeitado', bad.ok === false);
    const good = telemetry.validateSample({
      company_id: COMPANY_ID,
      domain: 'quality',
      metric_key: 'spc.cp',
      value: 1.2
    });
    assert('W3.8 sample válido', good.ok === true);

    console.log('\n── Ingest gated ──');
    const ingOff = await telemetry.ingestTimeseriesV1(good.sample);
    assert('W3.9 ingest off sem flag', ingOff.reason === 'telemetry_ingest_disabled');

    process.env.IMPETUS_STORAGE_V3_ENABLED = 'true';
    process.env.IMPETUS_TELEMETRY_ISOLATED_INGEST_ENABLED = 'true';
    clearCache('storage');

    console.log('\n── Runtime (schema opcional) ──');
    const runtime = require('../storage/industrialStorageRuntime');
    runtime.bootstrap();
    const health = await runtime.getHealth();
    assert('W3.10 health enabled', health.enabled === true);

    const impact = await runtime.runImpactAnalysis();
    assert('W3.11 legado não alterado', impact.storage.legacy_tables_altered === false);
    assert('W3.12 hypertables inactivas', impact.storage.hypertables_active === false);

    const ingOn = await runtime.telemetry.ingestTimeseriesV1(good.sample);
    assert(
      'W3.13 ingest controlado',
      ingOn.ok === true || ingOn.schema_missing === true || ingOn.reason === 'telemetry_ingest_disabled'
    );

    console.log('\n── Partition strategy doc ──');
    const part = require('../storage/partitionStrategyService');
    const doc = part.getPartitioningStrategyDoc();
    assert('W3.14 strategy documentada', doc.legacy_tables === 'registry only — no DDL');

    console.log('\n── Compression plans ──');
    const comp = require('../storage/compressionPlanningService');
    const plans = await comp.listPlans();
    assert('W3.15 planos de compressão', plans.plans && plans.plans.length >= 1);

    console.log('\n── Cold storage architecture ──');
    const cold = require('../storage/coldStorageManifestService');
    const arch = cold.getColdStorageArchitecture();
    assert('W3.16 worker cold inactivo', arch.worker_active === false);

    console.log('\n── Timescale readiness ──');
    process.env.IMPETUS_STORAGE_V3_ENABLED = 'true';
    clearCache('storage');
    const ts = require('../storage/timescaleReadinessService');
    const ready = await ts.getReadiness();
    assert('W3.17 readiness sem autocreate', ready.autocreate_blocked === true);

    console.log('\n── Feature governance ──');
    process.env.IMPETUS_TIMESCALE_ENABLED = 'true';
    delete process.env.IMPETUS_STORAGE_V3_ENABLED;
    clearCache('featureGovernanceService');
    const fg = require('../services/featureGovernanceService');
    const v = fg.bootstrap().validation;
    assert(
      'W3.18 warn timescale sem v3',
      v.findings.some((f) => f.id === 'TIMESCALE_WITHOUT_STORAGE_V3')
    );
  } catch (e) {
    assert('W3.X ' + (e && e.message ? e.message : e), false);
    console.error(e);
  } finally {
    restoreEnv(ENV_KEYS);
  }

  console.log(`\n══ Resultado: ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
