'use strict';

/**
 * SEC-21A — POST_ACTIVATION_OBSERVATION + GO_LIVE_GUARD (consultivo).
 * Fase 1: 10 min @ 5s | Fase 2: 20 min @ 30s | Fase 3: normal SEC monitoring
 * SEC21A_FAST_OBSERVATION: 10s @ 500ms + 20s @ 1s
 */

const flags = require('../config/securityGoLiveGateFlags');

const PHASE1_MS = () => (flags.fastObservation() ? 10_000 : 10 * 60_000);
const PHASE2_MS = () => (flags.fastObservation() ? 20_000 : 20 * 60_000);
const INTERVAL_P1 = () => (flags.fastObservation() ? 500 : 5_000);
const INTERVAL_P2 = () => (flags.fastObservation() ? 1_000 : 30_000);

const LIMITS = Object.freeze({
  maxHeapMb: 768,
  maxRssMb: 1536,
  maxLatencyMs: 3000,
  max500Count: 0,
  max503Count: 0,
  minIntegrityScore: 0.95
});

function sampleOnce() {
  const mem = process.memoryUsage();
  const sample = {
    ts: new Date().toISOString(),
    heapMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
    uptimeSec: Math.round(process.uptime())
  };

  let integrityScore = null;
  try {
    const sec04 = require('../../securityRuntimeIntegrity');
    const dash = sec04.buildDashboard?.();
    integrityScore = dash?.integrity_score ?? null;
  } catch (_e) {
    /* ignore */
  }

  let endpointOk = true;
  let latencyMs = 0;
  try {
    const start = Date.now();
    const sec01 = require('../../securityObservatory');
    sec01.getAuditPayload?.();
    latencyMs = Date.now() - start;
    endpointOk = latencyMs < LIMITS.maxLatencyMs;
  } catch (_e) {
    endpointOk = false;
  }

  const alerts = [];
  if (sample.heapMb > LIMITS.maxHeapMb) alerts.push({ code: 'HEAP_HIGH', value: sample.heapMb });
  if (sample.rssMb > LIMITS.maxRssMb) alerts.push({ code: 'RSS_HIGH', value: sample.rssMb });
  if (integrityScore != null && integrityScore < LIMITS.minIntegrityScore) {
    alerts.push({ code: 'INTEGRITY_DEGRADED', value: integrityScore });
  }
  if (!endpointOk) alerts.push({ code: 'ENDPOINT_SLOW', latencyMs });

  return { ...sample, integrityScore, endpointOk, latencyMs, alerts, critical: alerts.some((a) => a.code === 'INTEGRITY_DEGRADED') };
}

function runPhase(durationMs, intervalMs, phaseName) {
  const samples = [];
  const alerts = [];
  const start = Date.now();
  let criticalHit = false;

  while (Date.now() - start < durationMs) {
    const s = sampleOnce();
    samples.push(s);
    if (s.alerts.length) alerts.push(...s.alerts.map((a) => ({ ...a, phase: phaseName, ts: s.ts })));
    if (s.critical) criticalHit = true;
    if (phaseName === 'GO_LIVE_GUARD_INTENSIVE' && s.critical) break;
  }

  return {
    phase: phaseName,
    mode: phaseName === 'GO_LIVE_GUARD_INTENSIVE' ? 'GO_LIVE_GUARD' : 'POST_ACTIVATION_OBSERVATION',
    durationMs,
    intervalMs,
    samples: samples.length,
    alerts,
    failed: criticalHit || (phaseName === 'GO_LIVE_GUARD_INTENSIVE' && alerts.some((a) => a.code === 'INTEGRITY_DEGRADED')),
    operators: ['Wellington', 'Gustavo'],
    autoAction: false,
    humanInterventionRequired: criticalHit
  };
}

function runPostActivationObservation() {
  const phase1 = runPhase(PHASE1_MS(), INTERVAL_P1(), 'GO_LIVE_GUARD_INTENSIVE');
  const phase2 = phase1.failed ? { skipped: true, reason: 'phase1_failed' } : runPhase(PHASE2_MS(), INTERVAL_P2(), 'STABILIZATION');

  return {
    mode: 'POST_ACTIVATION_OBSERVATION',
    goLiveGuard: true,
    phase1,
    phase2,
    phase3: { mode: 'CONTINUOUS_SEC_MONITORING', note: 'SEC-01→20 monitoramento normal após fases 1-2' },
    failed: phase1.failed,
    completedAt: new Date().toISOString()
  };
}

module.exports = {
  runPostActivationObservation,
  sampleOnce,
  LIMITS,
  PHASE1_MS,
  PHASE2_MS
};
