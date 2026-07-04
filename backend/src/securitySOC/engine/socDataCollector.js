'use strict';

/**
 * SEC-07 — Colector read-only de SEC-01→SEC-06.
 * Nunca modifica módulos upstream.
 */

function safeRequire(getter) {
  try {
    return getter();
  } catch (_e) {
    return null;
  }
}

function collectAllModulesData() {
  const data = {
    sec01: null,
    sec02: null,
    sec03: null,
    sec04: null,
    sec05: null,
    sec06: null,
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
      closed: m.store?.getClosedIncidents?.(50) || [],
      metrics: m.metrics?.getSnapshot?.()
    };
  });

  data.sec03 = safeRequire(() => {
    const m = require('../../securityThreatIntelligence');
    return {
      enabled: m.isEnabled?.(),
      audit: m.getAuditPayload?.(),
      profiles: m.store?.getAllProfiles?.() || [],
      metrics: m.metrics?.getSnapshot?.()
    };
  });

  data.sec04 = safeRequire(() => {
    const m = require('../../securityRuntimeIntegrity');
    return {
      enabled: m.isEnabled?.(),
      audit: m.getAuditPayload?.(),
      lastReport: m.store?.getLastReport?.(),
      metrics: m.metrics?.getSnapshot?.()
    };
  });

  data.sec05 = safeRequire(() => {
    const m = require('../../securityNotification');
    return {
      enabled: m.isEnabled?.(),
      audit: m.getAuditPayload?.(),
      notifications: m.store?.getAll?.() || [],
      pending: m.store?.getPending?.() || [],
      metrics: m.metrics?.getSnapshot?.()
    };
  });

  data.sec06 = safeRequire(() => {
    const m = require('../../securityResponse');
    return {
      enabled: m.isEnabled?.(),
      audit: m.getAuditPayload?.(),
      history: m.store?.getHistory?.(50) || [],
      latest: m.store?.getHistory?.(1)?.[0] || null,
      metrics: m.metrics?.getSnapshot?.()
    };
  });

  return data;
}

module.exports = { collectAllModulesData, safeRequire };
