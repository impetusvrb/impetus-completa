'use strict';

/**
 * SEC-16 — Colector read-only SEC-14 e SEC-15.
 */

function safeRequire(getter) {
  try {
    return getter();
  } catch (_e) {
    return null;
  }
}

function collectDeceptionContext() {
  const data = { collected_at: new Date().toISOString() };

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

  data.sec15 = safeRequire(() => {
    const m = require('../../securityAntiScanner');
    return { enabled: m.isEnabled?.(), dashboard: m.buildDashboard?.({ force: true }) };
  });

  return data;
}

module.exports = { collectDeceptionContext, safeRequire };
