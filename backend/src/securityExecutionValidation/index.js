'use strict';

/**
 * SEC-12 — Enterprise Execution Validation (public API).
 */

const flags = require('./config/securityExecutionValidationFlags');
const runtime = require('./runtime/executionValidationRuntime');
const engine = require('./engine/executionValidationEngine');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityExecutionValidationEnabled,
  flags,
  runtime,
  engine,
  registry: require('./registry/protectionActionRegistry'),
  store: require('./store/executionValidationStore'),
  metrics: require('./metrics/executionValidationMetrics'),
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  evaluateValidation: engine.evaluateValidation
};
