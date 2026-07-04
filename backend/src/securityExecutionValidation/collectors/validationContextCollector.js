'use strict';

/**
 * SEC-12 — Colector read-only SEC-11 (+ snapshot SEC layers).
 */

function safeRequire(getter) {
  try {
    return getter();
  } catch (_e) {
    return null;
  }
}

function collectValidationContext() {
  const data = { collected_at: new Date().toISOString() };

  data.sec11 = safeRequire(() => {
    const m = require('../../securityAdaptiveProtection');
    return {
      enabled: m.isEnabled?.(),
      dashboard: m.buildDashboard?.({ force: true }),
      audit: m.getAuditPayload?.()
    };
  });

  data.actionRegistrySize = safeRequire(() => {
    const r = require('../registry/protectionActionRegistry');
    return r.getAllActions().length;
  });

  return data;
}

module.exports = { collectValidationContext, safeRequire };
