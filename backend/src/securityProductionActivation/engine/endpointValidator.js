'use strict';

/**
 * SEC-21 — Validação in-process de endpoints audit SEC.
 */

const sequence = require('../config/activationSequence');
const metrics = require('../metrics/productionActivationMetrics');

const MODULE_MAP = {
  securityObservatory: () => require('../../securityObservatory'),
  securityCorrelation: () => require('../../securityCorrelation'),
  securityThreatIntelligence: () => require('../../securityThreatIntelligence'),
  securityRuntimeIntegrity: () => require('../../securityRuntimeIntegrity'),
  securityNotification: () => require('../../securityNotification'),
  securityResponse: () => require('../../securityResponse'),
  securitySOC: () => require('../../securitySOC'),
  securityActiveDefense: () => require('../../securityActiveDefense'),
  securityAdaptiveProtection: () => require('../../securityAdaptiveProtection'),
  securityExecutionValidation: () => require('../../securityExecutionValidation'),
  securityControlledExecution: () => require('../../securityControlledExecution'),
  securityPromotionOperational: () => require('../../securityPromotionOperational'),
  securityAdaptiveBlocking: () => require('../../securityAdaptiveBlocking'),
  securityAntiScanner: () => require('../../securityAntiScanner'),
  securityThreatDeception: () => require('../../securityThreatDeception'),
  securityExfiltrationDetection: () => require('../../securityExfiltrationDetection'),
  securityRuntimeProtection: () => require('../../securityRuntimeProtection'),
  securityOperationalCertification: () => require('../../securityOperationalCertification'),
  securityCertificationV2: () => require('../../securityCertificationV2'),
  securityPromotion: () => require('../../securityPromotion')
};

function callEndpoint(entry) {
  const start = Date.now();
  let payload = null;
  let error = null;
  try {
    const mod = MODULE_MAP[entry.module]?.();
    if (!mod) throw new Error(`module ${entry.module} not found`);
    if (entry.module === 'securityPromotion') {
      payload = mod.getPromotionPayload?.();
    } else if (entry.module === 'securityCertificationV2') {
      payload = mod.getAuditPayload?.();
    } else {
      payload = mod.getAuditPayload?.() || mod.buildDashboard?.({ force: true });
    }
    if (!payload) throw new Error('empty payload');
  } catch (e) {
    error = e.message;
  }
  const elapsedMs = Date.now() - start;
  const ok = !error && payload && (payload.ok !== false);
  metrics.recordEndpointCheck(ok);
  return {
    phase: entry.phase,
    route: entry.auditRoute,
    module: entry.module,
    ok,
    elapsedMs,
    error,
    hasDashboard: !!(payload?.dashboard || payload?.evidence || payload?.steps)
  };
}

function validateAllEndpoints() {
  const results = [];
  const routes = [
    ...sequence.PRIMARY_FLAGS,
    ...sequence.READ_ONLY_AUDIT_ROUTES.map((r) => ({
      ...r,
      module: r.phase === 'SEC-09' ? 'securityPromotion' : null
    }))
  ];

  for (const entry of sequence.PRIMARY_FLAGS) {
    results.push(callEndpoint(entry));
  }

  for (const ro of sequence.READ_ONLY_AUDIT_ROUTES) {
    if (ro.phase === 'SEC-09') {
      results.push(callEndpoint({ ...ro, module: 'securityPromotion' }));
    } else if (ro.phase === 'SEC-08') {
      const start = Date.now();
      let ok = false;
      let error = null;
      try {
        const fs = require('fs');
        const path = require('path');
        const p = path.resolve(__dirname, '../../../docs/evidence/sec-08/certification-latest.json');
        ok = fs.existsSync(p);
        if (!ok) error = 'sec-08 evidence missing';
      } catch (e) {
        error = e.message;
      }
      metrics.recordEndpointCheck(ok);
      results.push({
        phase: 'SEC-08',
        route: ro.auditRoute,
        module: 'evidence-file',
        ok,
        elapsedMs: Date.now() - start,
        error,
        hasDashboard: ok
      });
    }
  }

  const failures = results.filter((r) => !r.ok);
  const latencies = results.map((r) => r.elapsedMs);
  const avgLatency = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;
  const maxLatency = latencies.length ? Math.max(...latencies) : 0;

  return {
    ok: failures.length === 0,
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: failures.length,
    failures,
    results,
    latency: { avgMs: avgLatency, maxMs: maxLatency }
  };
}

module.exports = { validateAllEndpoints, callEndpoint };
