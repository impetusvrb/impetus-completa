'use strict';

/**
 * SEC-10 — Colector read-only SEC-01→SEC-07.
 * Nunca modifica módulos upstream.
 */

function safeRequire(getter) {
  try {
    return getter();
  } catch (_e) {
    return null;
  }
}

function collectSecModulesData() {
  const data = {
    sec01: null,
    sec02: null,
    sec03: null,
    sec04: null,
    sec05: null,
    sec06: null,
    sec07: null,
    collected_at: new Date().toISOString()
  };

  data.sec01 = safeRequire(() => {
    const m = require('../../securityObservatory');
    return {
      enabled: m.isEnabled?.(),
      audit: m.getAuditPayload?.(),
      dashboard: m.buildDashboard?.()
    };
  });

  data.sec02 = safeRequire(() => {
    const m = require('../../securityCorrelation');
    return {
      enabled: m.isEnabled?.(),
      audit: m.getAuditPayload?.(),
      incidents: m.store?.getAllIncidents?.() || [],
      open: m.store?.getOpenIncidents?.() || [],
      closed: m.store?.getClosedIncidents?.(100) || []
    };
  });

  data.sec03 = safeRequire(() => {
    const m = require('../../securityThreatIntelligence');
    return {
      enabled: m.isEnabled?.(),
      audit: m.getAuditPayload?.(),
      profiles: m.store?.getAllProfiles?.() || []
    };
  });

  data.sec04 = safeRequire(() => {
    const m = require('../../securityRuntimeIntegrity');
    return {
      enabled: m.isEnabled?.(),
      audit: m.getAuditPayload?.(),
      lastReport: m.store?.getLastReport?.()
    };
  });

  data.sec05 = safeRequire(() => {
    const m = require('../../securityNotification');
    return {
      enabled: m.isEnabled?.(),
      audit: m.getAuditPayload?.(),
      notifications: m.store?.getAll?.() || [],
      pending: m.store?.getPending?.() || []
    };
  });

  data.sec06 = safeRequire(() => {
    const m = require('../../securityResponse');
    return {
      enabled: m.isEnabled?.(),
      audit: m.getAuditPayload?.(),
      history: m.store?.getHistory?.(50) || []
    };
  });

  data.sec07 = safeRequire(() => {
    const m = require('../../securitySOC');
    return {
      enabled: m.isEnabled?.(),
      audit: m.getAuditPayload?.(),
      soc: m.buildSOC?.({ force: true }) || null
    };
  });

  return data;
}

module.exports = { collectSecModulesData, safeRequire };
