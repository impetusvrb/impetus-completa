'use strict';

/**
 * AIOI-P1L.3 — Enterprise Load Certification
 * Carga normal / elevada / pico · READ ONLY metrics.
 */

const continuousWorker = require('./aioiContinuousWorkerService');

const LAYER = 'AIOI_OPERATIONAL_LOAD';

let _lastLoadResult = null;

function _percentile(sorted, pct) {
  if (!sorted.length) return 0;
  const idx = Math.max(0, Math.ceil(pct * sorted.length) - 1);
  return sorted[idx];
}

async function _runTier(label, cycles) {
  const latencies = [];
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < cycles; i++) {
    const t0 = Date.now();
    try {
      const r = await continuousWorker.executeCycle();
      latencies.push(Date.now() - t0);
      if (r.ok) completed += 1;
      else failed += 1;
    } catch {
      failed += 1;
      latencies.push(Date.now() - t0);
    }
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const totalMs = latencies.reduce((a, b) => a + b, 0);
  const throughput = totalMs > 0 ? +((completed / (totalMs / 1000)).toFixed(4)) : 0;

  return {
    tier: label,
    cycles,
    completed,
    failed,
    latency_p50: _percentile(sorted, 0.5),
    latency_p95: _percentile(sorted, 0.95),
    latency_p99: _percentile(sorted, 0.99),
    throughput_eps: throughput
  };
}

async function certifyEnterpriseLoad() {
  const normal = await _runTier('normal', 10);
  const elevated = await _runTier('elevated', 25);
  const peak = await _runTier('peak', 50);

  const allLatencies = [];
  for (const tier of [normal, elevated, peak]) {
    allLatencies.push(tier.latency_p50, tier.latency_p95, tier.latency_p99);
  }
  const sorted = allLatencies.filter(n => n > 0).sort((a, b) => a - b);

  const aggregate = {
    latency_p50: _percentile(sorted, 0.5),
    latency_p95: _percentile(sorted, 0.95),
    latency_p99: _percentile(sorted, 0.99),
    throughput_eps: Math.max(normal.throughput_eps, elevated.throughput_eps, peak.throughput_eps)
  };

  const enterpriseLoadCertified = peak.failed === 0 && normal.completed > 0;

  const result = {
    ok: true,
    layer: LAYER,
    read_only: false,
    observation_only: true,
    enterprise_load_certified: enterpriseLoadCertified,
    ...aggregate,
    tiers: { normal, elevated, peak },
    timestamp: new Date().toISOString()
  };

  _lastLoadResult = result;
  return result;
}

function getLastLoadResult() {
  return _lastLoadResult || {
    ok: true,
    layer: LAYER,
    read_only: true,
    enterprise_load_certified: null,
    latency_p50: 0,
    latency_p95: 0,
    latency_p99: 0,
    throughput_eps: 0,
    note: 'no_load_cert_run_yet'
  };
}

module.exports = {
  certifyEnterpriseLoad,
  getLastLoadResult,
  LAYER
};
