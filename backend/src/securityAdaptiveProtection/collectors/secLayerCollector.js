'use strict';

/**
 * SEC-11 — Colector read-only SEC-01→SEC-10.
 */

function safeRequire(getter) {
  try {
    return getter();
  } catch (_e) {
    return null;
  }
}

function collectSecLayerData() {
  const data = { collected_at: new Date().toISOString() };

  data.sec01 = safeRequire(() => {
    const m = require('../../securityObservatory');
    return { enabled: m.isEnabled?.(), audit: m.getAuditPayload?.() };
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

  data.sec04 = safeRequire(() => {
    const m = require('../../securityRuntimeIntegrity');
    return { enabled: m.isEnabled?.(), lastReport: m.store?.getLastReport?.() };
  });

  data.sec05 = safeRequire(() => {
    const m = require('../../securityNotification');
    return { enabled: m.isEnabled?.(), pending: m.store?.getPending?.() || [] };
  });

  data.sec06 = safeRequire(() => {
    const m = require('../../securityResponse');
    return { enabled: m.isEnabled?.(), history: m.store?.getHistory?.(20) || [] };
  });

  data.sec07 = safeRequire(() => {
    const m = require('../../securitySOC');
    return { enabled: m.isEnabled?.(), soc: m.buildSOC?.({ force: true }) };
  });

  data.sec10 = safeRequire(() => {
    const m = require('../../securityActiveDefense');
    return {
      enabled: m.isEnabled?.(),
      dashboard: m.buildDashboard?.({ force: true }),
      audit: m.getAuditPayload?.()
    };
  });

  return data;
}

module.exports = { collectSecLayerData, safeRequire };
