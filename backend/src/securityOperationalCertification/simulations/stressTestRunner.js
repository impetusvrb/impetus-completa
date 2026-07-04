'use strict';

/**
 * SEC-19 — Stress operacional simulado (contadores virtuais, sem tráfego HTTP real).
 */

const os = require('os');
const catalog = require('./attackScenarioCatalog');
const store = require('../store/operationalCertificationStore');
const metrics = require('../metrics/operationalCertificationMetrics');
const flags = require('../config/securityOperationalCertificationFlags');

function sampleRuntime() {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  return {
    heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    rssMb: Math.round(mem.rss / 1024 / 1024),
    cpuUserMs: Math.round(cpu.user / 1000),
    cpuSystemMs: Math.round(cpu.system / 1000),
    loadAvg: os.loadavg(),
    uptimeSeconds: Math.floor(process.uptime())
  };
}

function simulateVirtualRequestBatch(virtualCount) {
  const start = process.hrtime.bigint();
  let buckets = { ok: 0, simulated404: 0, simulated403: 0 };
  const windowMs = Math.min(virtualCount / 10, 5000);

  for (let i = 0; i < virtualCount; i++) {
    const mod = i % 100;
    if (mod < 85) buckets.ok += 1;
    else if (mod < 95) buckets.simulated404 += 1;
    else buckets.simulated403 += 1;
  }

  const elapsedNs = process.hrtime.bigint() - start;
  const latencyMs = Number(elapsedNs / BigInt(1e6));
  const throughputPerSec = virtualCount / Math.max(latencyMs / 1000, 0.001);

  return {
    virtualRequests: virtualCount,
    windowMs: Math.round(windowMs),
    latencyMs: Math.round(latencyMs * 100) / 100,
    throughputPerSec: Math.round(throughputPerSec),
    buckets,
    simulated: flags.stressSimulationOnly()
  };
}

function evaluateModulesUnderLoad(virtualCount) {
  const incidents = Math.min(Math.ceil(virtualCount / 5000), 20);
  const notifications = Math.min(Math.ceil(virtualCount / 10000), 10);
  return {
    incidentBuckets: incidents,
    notificationBuckets: notifications,
    responseTimeMs: Math.round(15 + virtualCount / 5000)
  };
}

function runStressTier(virtualCount) {
  metrics.increment('stress_runs');
  const before = sampleRuntime();
  const batch = simulateVirtualRequestBatch(virtualCount);
  const moduleLoad = evaluateModulesUnderLoad(virtualCount);
  const after = sampleRuntime();

  const stable =
    after.heapUsedMb < 2048 &&
    after.rssMb < 4096 &&
    batch.latencyMs < virtualCount / 2;

  const result = {
    tier: virtualCount,
    label: `${virtualCount} virtual requests`,
    before,
    after,
    batch,
    moduleLoad,
    stable,
    simulated: true,
    completedAt: new Date().toISOString()
  };
  store.addStressResult(result);
  return result;
}

function runAllStressTests() {
  const tiers = catalog.STRESS_TIERS;
  const results = tiers.map((t) => runStressTier(t));
  const allStable = results.every((r) => r.stable);
  return {
    completed: true,
    simulated: true,
    tiers: tiers.length,
    allStable,
    results,
    completedAt: new Date().toISOString()
  };
}

module.exports = {
  runStressTier,
  runAllStressTests,
  simulateVirtualRequestBatch,
  sampleRuntime
};
