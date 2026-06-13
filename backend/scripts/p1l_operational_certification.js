'use strict';

/**
 * AIOI-P1L — Enterprise Operational Production Certification
 * ADDITIVE ONLY · mede comportamento real · sem LLM/cognição
 */

process.env.IMPETUS_AIOI_ENABLED = process.env.IMPETUS_AIOI_ENABLED || 'true';
process.env.IMPETUS_AIOI_PILOT_TENANTS = process.env.IMPETUS_AIOI_PILOT_TENANTS ||
  '21dd3cee-2efa-4936-908f-9ff1ba04e2a3,ffd94fb8-79f4-4a38-af21-fe596adfffb5';
process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'true';
process.env.IMPETUS_AIOI_WORKER_COUNT = '2';
process.env.IMPETUS_AIOI_WORKER_ID = '0';
process.env.IMPETUS_AIOI_SHARD_COUNT = '4';
process.env.IMPETUS_AIOI_REGISTRY_ACTIVE = 'true';
process.env.IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION = 'true';
process.env.IMPETUS_AIOI_OWNERSHIP_RUNTIME_ACTIVE = 'true';
process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED = 'true';

const operationalDataset = require('../src/services/aioi/runtime/aioiOperationalDatasetService');
const operationalWorkload = require('../src/services/aioi/runtime/aioiOperationalWorkloadService');
const operationalLoad = require('../src/services/aioi/runtime/aioiOperationalLoadService');
const operationalConsistency = require('../src/services/aioi/runtime/aioiOperationalConsistencyService');
const operationalShadow = require('../src/services/aioi/runtime/aioiOperationalShadowService');
const operationalCertification = require('../src/services/aioi/runtime/aioiOperationalCertificationService');
const continuousWorker = require('../src/services/aioi/runtime/aioiContinuousWorkerService');
const distributed = require('../src/services/aioi/runtime/aioiDistributedRuntimeService');

function assertInvariants(label) {
  const inv = continuousWorker.RUNTIME_INVARIANTS;
  if (inv.runtime_enabled || inv.runtime_active || inv.cognitive_execution_allowed) {
    throw new Error(`INVARIANT_VIOLATION at ${label}`);
  }
  if (inv.auto_execute_band !== 'none') throw new Error(`INVARIANT_VIOLATION auto_execute at ${label}`);
}

async function main() {
  assertInvariants('start');

  operationalShadow.resetBaselineForCert();

  const results = {
    tag: 'P1L-OPERATIONAL-CERTIFICATION',
    started_at: new Date().toISOString(),
    invariants: continuousWorker.RUNTIME_INVARIANTS
  };

  results.p1k_baseline = await operationalShadow.captureP1kBaseline();
  results.dataset = await operationalDataset.certifyOperationalDataset();
  results.consistency = await operationalConsistency.certifyOperationalConsistency();
  results.workload = await operationalWorkload.validateRealWorkload({ cycles: 10 });
  results.load = await operationalLoad.certifyEnterpriseLoad();
  results.shadow = await operationalShadow.compareProductionShadow({
    events_processed: results.workload.events_processed,
    duplicates: results.workload.duplicates
  });
  results.extended_soak = await operationalCertification.runExtendedOperationalSoak(336);

  distributed.resetDistributedSoakMetrics();

  results.certification = await operationalCertification.generateOperationalCertification();
  operationalCertification.setCertResults(results.certification);

  assertInvariants('end');

  results.criteria = results.certification.criteria;
  results.completed_at = new Date().toISOString();
  results.verdict = results.certification.verdict;

  console.log(JSON.stringify({
    phase: 'P1L',
    pass: results.criteria.enterprise_operational_ready
  }));
  console.log('P1L_RESULTS:' + JSON.stringify(results));

  process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'false';
  process.env.IMPETUS_AIOI_WORKER_COUNT = '1';
  process.env.IMPETUS_AIOI_REGISTRY_ACTIVE = 'false';
  process.env.IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION = 'false';
  process.env.IMPETUS_AIOI_OWNERSHIP_RUNTIME_ACTIVE = 'false';

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }

  process.exit(results.criteria.enterprise_operational_ready ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
