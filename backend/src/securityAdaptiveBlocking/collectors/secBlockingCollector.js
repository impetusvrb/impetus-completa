'use strict';

/**
 * SEC-14 — Colector read-only SEC-01→SEC-13.
 */

function safeRequire(getter) {
  try {
    return getter();
  } catch (_e) {
    return null;
  }
}

function collectBlockingContext() {
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

  data.sec10 = safeRequire(() => {
    const m = require('../../securityActiveDefense');
    return { enabled: m.isEnabled?.(), dashboard: m.buildDashboard?.({ force: true }) };
  });

  data.sec11 = safeRequire(() => {
    const m = require('../../securityAdaptiveProtection');
    return { enabled: m.isEnabled?.(), dashboard: m.buildDashboard?.({ force: true }) };
  });

  data.sec12 = safeRequire(() => {
    const m = require('../../securityExecutionValidation');
    return { enabled: m.isEnabled?.(), dashboard: m.buildDashboard?.({ force: true }) };
  });

  data.sec07 = safeRequire(() => {
    const m = require('../../securitySOC');
    return { enabled: m.isEnabled?.(), soc: m.buildSOC?.({ force: true }) };
  });

  return data;
}

module.exports = { collectBlockingContext, safeRequire };
