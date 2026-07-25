'use strict';

/**
 * SEC-21A — Endpoint gate (audit routes in-process).
 */

const { MODULES } = require('./moduleGateValidator');

function probeEndpoint(entry) {
  const start = Date.now();
  try {
    if (entry.module === 'evidence') {
      const fs = require('fs');
      const path = require('path');
      const ok = fs.existsSync(path.resolve(__dirname, '../../../docs/evidence/sec-08/certification-latest.json'));
      return { phase: entry.phase, route: entry.auditRoute, ok, elapsedMs: Date.now() - start, error: ok ? null : 'missing evidence' };
    }
    const mod = require(`../../${entry.module}`);
    const payload = mod.getAuditPayload?.() || mod.getPromotionPayload?.();
    const ok = !!payload && payload.ok !== false;
    return {
      phase: entry.phase,
      route: entry.auditRoute || `/${entry.module}`,
      ok,
      elapsedMs: Date.now() - start,
      error: ok ? null : 'empty or failed payload'
    };
  } catch (e) {
    return { phase: entry.phase, route: entry.auditRoute, ok: false, elapsedMs: Date.now() - start, error: e.message };
  }
}

function validateEndpointGate() {
  const results = [
    ...MODULES.map((m) => probeEndpoint(m)),
    probeEndpoint({ phase: 'SEC-08', module: 'evidence', auditRoute: '/security-certification' }),
    probeEndpoint({ phase: 'SEC-09', module: 'securityPromotion', auditRoute: '/security-promotion' })
  ];

  const failures = results.filter((r) => !r.ok);
  const latencies = results.map((r) => r.elapsedMs);
  const avgMs = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const maxMs = latencies.length ? Math.max(...latencies) : 0;

  return {
    ok: failures.length === 0,
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: failures.length,
    failures,
    latency: { avgMs, maxMs },
    blocking: failures.some((f) => ['SEC-01', 'SEC-04', 'SEC-07', 'SEC-21'].includes(f.phase))
  };
}

module.exports = { validateEndpointGate };
