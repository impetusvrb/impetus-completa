'use strict';

/**
 * SEC-18 — Colector read-only SEC-02→SEC-17.
 */

function safeRequire(getter) {
  try {
    return getter();
  } catch (_e) {
    return null;
  }
}

function collectRuntimeProtectionContext() {
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

  data.sec04 = safeRequire(() => {
    const m = require('../../securityRuntimeIntegrity');
    return { enabled: m.isEnabled?.(), snapshot: m.buildDashboard?.({ force: true }) };
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

  data.sec13 = safeRequire(() => {
    const m = require('../../securityControlledExecution');
    return { enabled: m.isEnabled?.(), dashboard: m.buildDashboard?.({ force: true }) };
  });

  data.sec14 = safeRequire(() => {
    const m = require('../../securityAdaptiveBlocking');
    return { enabled: m.isEnabled?.(), dashboard: m.buildDashboard?.({ force: true }) };
  });

  data.sec15 = safeRequire(() => {
    const m = require('../../securityAntiScanner');
    return { enabled: m.isEnabled?.(), dashboard: m.buildDashboard?.({ force: true }) };
  });

  data.sec16 = safeRequire(() => {
    const m = require('../../securityThreatDeception');
    return { enabled: m.isEnabled?.(), dashboard: m.buildDashboard?.({ force: true }) };
  });

  data.sec17 = safeRequire(() => {
    const m = require('../../securityExfiltrationDetection');
    return { enabled: m.isEnabled?.(), dashboard: m.buildDashboard?.({ force: true }) };
  });

  return data;
}

module.exports = { collectRuntimeProtectionContext, safeRequire };
