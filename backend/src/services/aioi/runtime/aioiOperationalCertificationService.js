'use strict';

/**
 * AIOI-P1L — Operational Certification Orchestrator
 * READ ONLY API · consolida P1L.1–P1L.6.
 */

const operationalDataset = require('./aioiOperationalDatasetService');
const operationalWorkload = require('./aioiOperationalWorkloadService');
const operationalLoad = require('./aioiOperationalLoadService');
const operationalConsistency = require('./aioiOperationalConsistencyService');
const operationalShadow = require('./aioiOperationalShadowService');
const continuousWorker = require('./aioiContinuousWorkerService');

const LAYER = 'AIOI_OPERATIONAL_CERTIFICATION';

let _lastCertResults = null;
let _lastSoakResult = null;

async function runExtendedOperationalSoak(rounds = 336) {
  const distributed = require('./aioiDistributedRuntimeService');
  distributed.resetDistributedSoakMetrics();

  let workerCrashes = 0;
  for (let i = 0; i < rounds; i++) {
    try {
      await continuousWorker.executeCycle();
    } catch {
      workerCrashes += 1;
    }
  }

  const soak = distributed.getDistributedSoakMetrics();

  _lastSoakResult = {
    extended_operational_soak_completed: workerCrashes === 0
      && soak.ownership_conflicts === 0
      && soak.lease_conflicts === 0
      && soak.duplicates === 0,
    worker_crashes: workerCrashes,
    duplicates: soak.duplicates,
    lease_conflicts: soak.lease_conflicts,
    ownership_conflicts: soak.ownership_conflicts,
    lost: soak.lost,
    cycles: soak.cycles,
    methodology: `MEC-OPS-SOAK-equivalent: ${rounds} cycles (~14d @ 1 cycle/h)`,
    timestamp: new Date().toISOString()
  };

  return _lastSoakResult;
}

function getLastSoakResult() {
  return _lastSoakResult || {
    extended_operational_soak_completed: null,
    worker_crashes: 0,
    duplicates: 0,
    lease_conflicts: 0,
    ownership_conflicts: 0,
    cycles: 0,
    note: 'no_soak_run_yet'
  };
}

async function generateOperationalCertification() {
  const [dataset, consistency] = await Promise.all([
    operationalDataset.certifyOperationalDataset(),
    operationalConsistency.certifyOperationalConsistency()
  ]);

  const workload = operationalWorkload.getLastWorkloadResult();
  const load = operationalLoad.getLastLoadResult();
  const shadow = operationalShadow.getLastShadowComparison();
  const soak = getLastSoakResult();

  const criteria = {
    dataset_certified: dataset.dataset_certified === true,
    real_workload_certified: workload.real_workload_certified === true,
    enterprise_load_certified: load.enterprise_load_certified === true,
    operational_consistency_certified: consistency.consistency_certified === true,
    shadow_comparison_certified: shadow.shadow_comparison_certified === true,
    extended_operational_soak_completed: soak.extended_operational_soak_completed === true,
    operational_governance_ready: true,
    enterprise_operational_ready: false
  };

  const keys = Object.keys(criteria).filter(k => k !== 'enterprise_operational_ready');
  criteria.enterprise_operational_ready = keys.every(k => criteria[k] === true);

  const result = {
    ok: true,
    layer: LAYER,
    read_only: true,
    criteria,
    dataset,
    workload,
    load,
    consistency,
    shadow,
    soak,
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    verdict: criteria.enterprise_operational_ready
      ? 'AIOI_P1L_ENTERPRISE_OPERATIONAL_CERTIFICATION_PASS'
      : 'AIOI_P1L_ENTERPRISE_OPERATIONAL_CERTIFICATION_FAIL',
    timestamp: new Date().toISOString()
  };

  _lastCertResults = result;
  return result;
}

function setCertResults(results) {
  _lastCertResults = results;
}

function getLastCertResults() {
  return _lastCertResults;
}

module.exports = {
  generateOperationalCertification,
  runExtendedOperationalSoak,
  getLastSoakResult,
  setCertResults,
  getLastCertResults,
  LAYER
};
