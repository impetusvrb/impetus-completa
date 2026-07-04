'use strict';

/**
 * SEC-15 — Colector read-only SEC-01, SEC-02, SEC-03, SEC-14.
 */

function safeRequire(getter) {
  try {
    return getter();
  } catch (_e) {
    return null;
  }
}

function collectAntiScannerContext() {
  const data = { collected_at: new Date().toISOString() };

  data.sec01 = safeRequire(() => {
    const m = require('../../securityObservatory');
    return { enabled: m.isEnabled?.(), snapshot: m.buildDashboard?.({ force: true }) };
  });

  data.sec02 = safeRequire(() => {
    const m = require('../../securityCorrelation');
    return {
      enabled: m.isEnabled?.(),
      open: m.store?.getOpenIncidents?.() || [],
      closed: m.store?.getClosedIncidents?.(50) || []
    };
  });

  data.sec03 = safeRequire(() => {
    const m = require('../../securityThreatIntelligence');
    return { enabled: m.isEnabled?.(), profiles: m.store?.getAllProfiles?.() || [] };
  });

  data.sec14 = safeRequire(() => {
    const m = require('../../securityAdaptiveBlocking');
    return { enabled: m.isEnabled?.(), dashboard: m.buildDashboard?.({ force: true }) };
  });

  return data;
}

module.exports = { collectAntiScannerContext, safeRequire };
