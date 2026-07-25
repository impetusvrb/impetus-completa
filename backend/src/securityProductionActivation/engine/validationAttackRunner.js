'use strict';

/**
 * SEC-21 — Ataques de validação controlados (reutiliza SEC-19).
 */

const metrics = require('../metrics/productionActivationMetrics');

function runValidationAttacks() {
  const results = [];
  let ok = true;

  const record = (id, fn) => {
    const item = { id, ok: false, probes: {} };
    try {
      item.probes = fn();
      const values = Object.values(item.probes);
      item.ok = values.length > 0 && values.every((p) => p && (p.ok === true || p.skipped === true));
    } catch (e) {
      item.error = e.message;
      item.ok = false;
    }
    if (!item.ok) ok = false;
    results.push(item);
    return item;
  };

  record('scanner-credential-env', () => {
    const sec01 = require('../../securityObservatory');
    const sec15 = require('../../securityAntiScanner');
    sec01.ingest?.ingestNginxLines?.([
      '203.0.113.50 - - [04/Jul/2026:12:00:00 +0000] "GET /.env HTTP/1.1" 403 0 "-" "Silvy X Ran"'
    ]);
    const dash15 = sec15.getAuditPayload?.() || sec15.buildDashboard?.({ force: true });
    return {
      sec01: { ok: sec01.isEnabled?.() },
      sec15: { ok: sec15.isEnabled?.(), hasDashboard: !!dash15 }
    };
  });

  record('enumeration-mass-404', () => {
    const sec02 = require('../../securityCorrelation');
    const sec01 = require('../../securityObservatory');
    for (let i = 0; i < 5; i++) {
      sec01.ingest?.ingestNginxLines?.([
        `203.0.113.51 - - [04/Jul/2026:12:0${i}:00 +0000] "GET /path${i} HTTP/1.1" 404 146 "-" "scanner/1.0"`
      ]);
    }
    const incidents = sec02.store?.getOpenIncidents?.() || sec02.store?.getAllIncidents?.() || [];
    return {
      sec01: { ok: sec01.isEnabled?.() },
      sec02: { ok: sec02.isEnabled?.(), incidentCount: incidents.length }
    };
  });

  record('exfiltration-simulation', () => {
    let simOk = false;
    try {
      const sec19 = require('../../securityOperationalCertification');
      const runner = require('../../securityOperationalCertification/simulations/attackSimulationRunner');
      if (runner.runAttackSimulation) {
        const sim = runner.runAttackSimulation({ maxScenarios: 8 });
        simOk = sim?.ok !== false;
      } else {
        simOk = sec19.isEnabled?.();
      }
    } catch (e) {
      return { sec19: { ok: false, error: e.message } };
    }
    const sec17 = require('../../securityExfiltrationDetection');
    const dash17 = sec17.getAuditPayload?.() || sec17.evaluateExfiltrationDetection?.({ force: true });
    return {
      sec19: { ok: simOk },
      sec17: { ok: sec17.isEnabled?.(), hasDashboard: !!dash17 }
    };
  });

  record('integrity-probe', () => {
    const sec04 = require('../../securityRuntimeIntegrity');
    const payload = sec04.getAuditPayload?.() || sec04.buildDashboard?.({ force: true });
    return { sec04: { ok: sec04.isEnabled?.() && !!payload } };
  });

  record('soc-visibility', () => {
    const sec07 = require('../../securitySOC');
    const payload = sec07.getAuditPayload?.();
    return {
      sec07: {
        ok: sec07.isEnabled?.() && !!(payload?.soc || payload?.ok),
        status: payload?.soc?.socStatus
      }
    };
  });

  record('sec20-consolidation', () => {
    const sec20 = require('../../securityCertificationV2');
    const payload = sec20.getAuditPayload?.();
    return {
      sec20: {
        ok: !!(payload?.dashboard || payload?.evidence),
        decision: payload?.dashboard?.globalDecision || payload?.dashboard?.decision
      }
    };
  });

  metrics.recordAttackValidation();
  return { ok, results, simulated: true, noRealTraffic: true, validatedAt: new Date().toISOString() };
}

module.exports = { runValidationAttacks };
