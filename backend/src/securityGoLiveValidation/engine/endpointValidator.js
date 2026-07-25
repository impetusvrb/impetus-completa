'use strict';

/**
 * SEC-21C — Endpoints audit SEC-01 → SEC-21B (read-only in-process).
 */

const MODULES = Object.freeze([
  { phase: 'SEC-01', module: 'securityObservatory', auditRoute: '/security-observatory' },
  { phase: 'SEC-02', module: 'securityCorrelation', auditRoute: '/security-incidents' },
  { phase: 'SEC-03', module: 'securityThreatIntelligence', auditRoute: '/security-threat-intelligence' },
  { phase: 'SEC-04', module: 'securityRuntimeIntegrity', auditRoute: '/security-runtime-integrity' },
  { phase: 'SEC-05', module: 'securityNotification', auditRoute: '/security-notifications' },
  { phase: 'SEC-06', module: 'securityResponse', auditRoute: '/security-response' },
  { phase: 'SEC-07', module: 'securitySOC', auditRoute: '/security-soc' },
  { phase: 'SEC-10', module: 'securityActiveDefense', auditRoute: '/security-active-defense' },
  { phase: 'SEC-11', module: 'securityAdaptiveProtection', auditRoute: '/security-adaptive-protection' },
  { phase: 'SEC-12', module: 'securityExecutionValidation', auditRoute: '/security-execution-validation' },
  { phase: 'SEC-13', module: 'securityControlledExecution', auditRoute: '/security-controlled-execution' },
  { phase: 'SEC-13A', module: 'securityPromotionOperational', auditRoute: '/security-operational-promotion' },
  { phase: 'SEC-14', module: 'securityAdaptiveBlocking', auditRoute: '/security-adaptive-blocking' },
  { phase: 'SEC-15', module: 'securityAntiScanner', auditRoute: '/security-anti-scanner' },
  { phase: 'SEC-16', module: 'securityThreatDeception', auditRoute: '/security-threat-deception' },
  { phase: 'SEC-17', module: 'securityExfiltrationDetection', auditRoute: '/security-exfiltration' },
  { phase: 'SEC-18', module: 'securityRuntimeProtection', auditRoute: '/security-runtime-protection' },
  { phase: 'SEC-19', module: 'securityOperationalCertification', auditRoute: '/security-operational-certification' },
  { phase: 'SEC-20', module: 'securityCertificationV2', auditRoute: '/security-certification-v2' },
  { phase: 'SEC-21', module: 'securityProductionActivation', auditRoute: '/security-production-activation' },
  { phase: 'SEC-21A', module: 'securityGoLiveGate', auditRoute: '/security-go-live-gate' },
  { phase: 'SEC-21B', module: 'securityBaselineSynchronization', auditRoute: '/security-baseline-synchronization' }
]);

function probeEndpoint(entry) {
  const start = Date.now();
  try {
    const mod = require(`../../${entry.module}`);
    const payload = mod.getAuditPayload?.() || mod.getPromotionPayload?.() || mod.runSynchronization?.();
    const ok = !!payload && payload.ok !== false;
    const hasAuth =
      payload.read_only === true ||
      payload.consultive_only === true ||
      payload.no_runtime_changes === true ||
      payload.read_only_dashboard === true;
    return {
      phase: entry.phase,
      route: entry.auditRoute,
      ok,
      elapsedMs: Date.now() - start,
      authExpected: true,
      authOk: hasAuth || ok,
      payloadOk: ok,
      error: ok ? null : 'empty or failed payload'
    };
  } catch (e) {
    return {
      phase: entry.phase,
      route: entry.auditRoute,
      ok: false,
      elapsedMs: Date.now() - start,
      error: e.message
    };
  }
}

function probeModuleChain() {
  const results = MODULES.map((m) => {
    const ep = probeEndpoint(m);
    let status = 'UNKNOWN';
    if (ep.ok) status = 'READY';
    else if (ep.error) status = 'ERROR';
    else status = 'FAILED';
    return { ...m, ...ep, status, healthy: ep.ok, degraded: !ep.ok && ep.elapsedMs < 5000 };
  });

  const failed = results.filter((r) => r.status === 'FAILED' || r.status === 'ERROR');
  const degraded = results.filter((r) => r.degraded && r.status !== 'FAILED');
  const latencies = results.map((r) => r.elapsedMs);
  const avgMs = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

  return {
    ok: failed.length === 0,
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: failed.length,
    degraded: degraded.length,
    results,
    failedModules: failed.map((r) => ({ phase: r.phase, status: r.status, error: r.error })),
    latency: { avgMs, maxMs: Math.max(...latencies, 0) },
    blocking: failed.length > 0,
    endpointHealth: failed.length === 0 ? (degraded.length ? 'DEGRADED' : 'HEALTHY') : 'UNHEALTHY'
  };
}

function validateEndpoints() {
  const chain = probeModuleChain();
  const criticalFail = chain.failedModules.some((f) =>
    ['SEC-01', 'SEC-04', 'SEC-07', 'SEC-15', 'SEC-17', 'SEC-21', 'SEC-21A', 'SEC-21B'].includes(f.phase)
  );

  return {
    ...chain,
    blocking: chain.blocking || criticalFail,
    blockingFindings: chain.failedModules.map((f) => ({ code: 'ENDPOINT_FAIL', phase: f.phase, error: f.error }))
  };
}

module.exports = { validateEndpoints, probeModuleChain, MODULES };
