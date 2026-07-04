'use strict';

/**
 * SEC-13 — Colector SEC-11 + SEC-12.
 */

function safeRequire(getter) {
  try {
    return getter();
  } catch (_e) {
    return null;
  }
}

function collectExecutionContext() {
  return {
    collected_at: new Date().toISOString(),
    sec11: safeRequire(() => {
      const m = require('../../securityAdaptiveProtection');
      return {
        enabled: m.isEnabled?.(),
        dashboard: m.buildDashboard?.({ force: true }),
        audit: m.getAuditPayload?.()
      };
    }),
    sec12: safeRequire(() => {
      const m = require('../../securityExecutionValidation');
      return {
        enabled: m.isEnabled?.(),
        dashboard: m.buildDashboard?.({ force: true }),
        audit: m.getAuditPayload?.()
      };
    })
  };
}

module.exports = { collectExecutionContext, safeRequire };
