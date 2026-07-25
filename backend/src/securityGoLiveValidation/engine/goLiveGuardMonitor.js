'use strict';

/**
 * SEC-21C — GO_LIVE_GUARD (consultivo, sem acções automáticas).
 * Fase 1: 5 min @ 5s | Fase 2: 10 min @ 30s
 * SEC21C_FAST_GUARD: 5s @ 500ms + 10s @ 1s
 */

const flags = require('../config/securityGoLiveValidationFlags');
const { GUARD_STATUS } = require('../dto/goLiveValidationDto');

const PHASE1_MS = () => (flags.fastGuard() ? 5_000 : 5 * 60_000);
const PHASE2_MS = () => (flags.fastGuard() ? 10_000 : 10 * 60_000);
const INTERVAL_P1 = () => (flags.fastGuard() ? 500 : 5_000);
const INTERVAL_P2 = () => (flags.fastGuard() ? 1_000 : 30_000);

const LIMITS = Object.freeze({
  maxHeapMb: 768,
  maxRssMb: 1536,
  maxLatencyMs: 3000,
  minIntegrityScore: 0.95
});

function probeSecModules() {
  const probes = {};
  try {
    probes.scanner = require('../../securityAntiScanner').getAuditPayload?.()?.ok !== false;
  } catch (_e) {
    probes.scanner = false;
  }
  try {
    probes.exfiltration = require('../../securityExfiltrationDetection').getAuditPayload?.()?.ok !== false;
  } catch (_e) {
    probes.exfiltration = false;
  }
  try {
    probes.correlation = require('../../securityCorrelation').getAuditPayload?.()?.ok !== false;
  } catch (_e) {
    probes.correlation = false;
  }
  try {
    probes.enumeration = require('../../securityThreatDeception').getAuditPayload?.()?.ok !== false;
  } catch (_e) {
    probes.enumeration = false;
  }
  return probes;
}

function sampleOnce() {
  const mem = process.memoryUsage();
  const sample = {
    ts: new Date().toISOString(),
    heapMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
    cpuLoad: require('os').loadavg()[0]
  };

  let integrityScore = null;
  try {
    const eng = require('../../securityRuntimeIntegrity/engine/integrityEngine');
    const r = eng.runIntegrityCheck?.({ force: true });
    integrityScore = r?.integrityScore ?? null;
  } catch (_e) {
    /* ignore */
  }

  let latencyMs = 0;
  let endpointOk = true;
  try {
    const start = Date.now();
    require('../../securityObservatory').getAuditPayload?.();
    latencyMs = Date.now() - start;
    endpointOk = latencyMs < LIMITS.maxLatencyMs;
  } catch (_e) {
    endpointOk = false;
  }

  let pm2Online = true;
  try {
    const { execSync } = require('child_process');
    const list = JSON.parse(execSync('pm2 jlist 2>/dev/null', { encoding: 'utf8', timeout: 5000 }));
    pm2Online = list.find((p) => p.name === 'impetus-backend')?.pm2_env?.status === 'online';
  } catch (_e) {
    if (!flags.skipInfraProbes()) pm2Online = false;
  }

  const secProbes = probeSecModules();
  const alerts = [];
  if (sample.heapMb > LIMITS.maxHeapMb) alerts.push({ code: 'HEAP_HIGH', value: sample.heapMb });
  if (sample.rssMb > LIMITS.maxRssMb) alerts.push({ code: 'RSS_HIGH', value: sample.rssMb });
  if (integrityScore != null && integrityScore < LIMITS.minIntegrityScore) {
    alerts.push({ code: 'INTEGRITY_DEGRADED', value: integrityScore });
  }
  if (!endpointOk) alerts.push({ code: 'LATENCY_HIGH', latencyMs });
  if (!pm2Online) alerts.push({ code: 'PM2_OFFLINE' });
  if (!secProbes.scanner) alerts.push({ code: 'SCANNER_PROBE_FAIL' });
  if (!secProbes.exfiltration) alerts.push({ code: 'EXFIL_PROBE_FAIL' });

  const critical = alerts.some((a) =>
    ['INTEGRITY_DEGRADED', 'PM2_OFFLINE', 'SCANNER_PROBE_FAIL', 'EXFIL_PROBE_FAIL'].includes(a.code)
  );

  return { ...sample, integrityScore, latencyMs, endpointOk, pm2Online, secProbes, alerts, critical };
}

function runPhase(durationMs, intervalMs, phaseName, intensive) {
  const samples = [];
  const alerts = [];
  const start = Date.now();
  let failed = false;

  while (Date.now() - start < durationMs) {
    const s = sampleOnce();
    samples.push(s);
    if (s.alerts.length) alerts.push(...s.alerts.map((a) => ({ ...a, phase: phaseName, ts: s.ts })));
    if (intensive && s.critical) {
      failed = true;
      break;
    }
  }

  return {
    phase: phaseName,
    mode: intensive ? 'GO_LIVE_GUARD_INTENSIVE' : 'GO_LIVE_GUARD_STABILIZATION',
    durationMs,
    intervalMs,
    samples: samples.length,
    alerts,
    failed,
    autoAction: false,
    operators: ['Wellington', 'Gustavo']
  };
}

function runGoLiveGuard() {
  const phase1 = runPhase(PHASE1_MS(), INTERVAL_P1(), 'PHASE_1_INTENSIVE', true);
  const phase2 = phase1.failed
    ? { skipped: true, reason: 'phase1_failed' }
    : runPhase(PHASE2_MS(), INTERVAL_P2(), 'PHASE_2_STABILIZATION', false);

  const failed = phase1.failed || (phase2.failed === true);
  const status = failed ? GUARD_STATUS.FAILED : GUARD_STATUS.SUCCESS;

  return {
    mode: 'GO_LIVE_GUARD',
    status,
    phase1,
    phase2,
    failed,
    completedAt: new Date().toISOString(),
    autoAction: false,
    humanInterventionRequired: failed
  };
}

module.exports = {
  runGoLiveGuard,
  sampleOnce,
  PHASE1_MS,
  PHASE2_MS,
  LIMITS
};
