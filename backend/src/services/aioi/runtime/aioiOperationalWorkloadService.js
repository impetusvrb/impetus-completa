'use strict';

/**
 * AIOI-P1L.2 — Real Workload Validation
 * Mede carga real · não altera comportamento operacional.
 */

const pilotFlags = require('../aioiPilotFlags');
const continuousWorker = require('./aioiContinuousWorkerService');
const runtimeMetrics = require('./aioiRuntimeMetricsService');
const distributedRuntime = require('./aioiDistributedRuntimeService');

const LAYER = 'AIOI_OPERATIONAL_WORKLOAD';

let _lastWorkloadResult = null;

async function validateRealWorkload({ cycles = 10 } = {}) {
  const tenants = pilotFlags.getPilotTenants();
  let eventsProcessed = 0;
  let eventsFailed = 0;
  let duplicates = 0;
  let cyclesCompleted = 0;
  let workerCrashes = 0;

  const beforeSoak = { ...distributedRuntime.getDistributedSoakMetrics() };

  for (let i = 0; i < cycles; i++) {
    try {
      const result = await continuousWorker.executeCycle();
      if (result.ok && result.summary) {
        cyclesCompleted += 1;
        eventsProcessed += result.summary.total_classified || 0;
        eventsFailed += result.summary.total_failed || 0;
      }
    } catch {
      workerCrashes += 1;
    }
  }

  const afterSoak = distributedRuntime.getDistributedSoakMetrics();
  duplicates = Math.max(0, (afterSoak.duplicates || 0) - (beforeSoak.duplicates || 0));
  const metrics = await runtimeMetrics.getMetricsSnapshot();

  const result = {
    ok: true,
    layer: LAYER,
    read_only: false,
    observation_only: true,
    real_workload_certified: workerCrashes === 0 && duplicates === 0,
    events_processed: eventsProcessed,
    events_failed: eventsFailed,
    duplicates,
    cycles_requested: cycles,
    cycles_completed: cyclesCompleted,
    worker_crashes: workerCrashes,
    pilot_tenants: tenants,
    tenant_count: tenants.length,
    metrics_snapshot: {
      latency_p50: metrics.latency_p50,
      latency_p95: metrics.latency_p95,
      cycle_count: metrics.cycle_count
    },
    timestamp: new Date().toISOString()
  };

  _lastWorkloadResult = result;
  return result;
}

function getLastWorkloadResult() {
  return _lastWorkloadResult || {
    ok: true,
    layer: LAYER,
    read_only: true,
    real_workload_certified: null,
    events_processed: 0,
    events_failed: 0,
    duplicates: 0,
    note: 'no_workload_cert_run_yet'
  };
}

module.exports = {
  validateRealWorkload,
  getLastWorkloadResult,
  LAYER
};
