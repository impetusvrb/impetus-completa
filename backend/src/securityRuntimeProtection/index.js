'use strict';

/**
 * SEC-18 — Enterprise Adaptive Runtime Protection (public API).
 */

const flags = require('./config/securityRuntimeProtectionFlags');
const runtime = require('./runtime/runtimeProtectionRuntime');
const engine = require('./engine/runtimeProtectionEngine');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityRuntimeProtectionEnabled,
  flags,
  runtime,
  engine,
  store: require('./store/runtimeProtectionStore'),
  metrics: require('./metrics/runtimeProtectionMetrics'),
  profiles: require('./engine/protectionProfileManager'),
  riskEngine: require('./engine/runtimeRiskAssessment'),
  planner: require('./engine/adaptiveProtectionPlanner'),
  safety: require('./engine/runtimeSafetyValidator'),
  approval: require('./engine/runtimeApprovalCoordinator'),
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  evaluateRuntimeProtection: engine.evaluateRuntimeProtection
};
