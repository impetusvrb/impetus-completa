'use strict';

/**
 * SEC-11 — Enterprise Adaptive Protection (public API).
 */

const flags = require('./config/securityAdaptiveProtectionFlags');
const runtime = require('./runtime/adaptiveProtectionRuntime');
const engine = require('./engine/adaptiveProtectionEngine');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityAdaptiveProtectionEnabled,
  flags,
  runtime,
  engine,
  store: require('./store/adaptiveProtectionStore'),
  metrics: require('./metrics/adaptiveProtectionMetrics'),
  approval: require('./engine/administratorApprovalService'),
  profiles: require('./engine/protectionProfileService'),
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  evaluateProtection: engine.evaluateProtection,
  registerApproval: runtime.requestApproval
};
