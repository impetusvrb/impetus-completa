'use strict';

/**
 * SEC-13 — Enterprise Controlled Protection Execution (public API).
 */

const flags = require('./config/securityControlledExecutionFlags');
const runtime = require('./runtime/controlledExecutionRuntime');
const engine = require('./engine/controlledExecutionEngine');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityControlledExecutionEnabled,
  flags,
  runtime,
  engine,
  registry: require('./registry/actionExecutorRegistry'),
  journal: require('./engine/executionJournalService'),
  metrics: require('./metrics/controlledExecutionMetrics'),
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  evaluateExecution: engine.evaluateExecution,
  rollbackExecution: runtime.rollbackExecution
};
