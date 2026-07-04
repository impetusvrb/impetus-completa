'use strict';

/**
 * SEC-06 — Enterprise Security Response Orchestrator (public API).
 */

const flags = require('./config/securityResponseFlags');
const runtime = require('./runtime/responseRuntime');
const orchestrator = require('./engine/responseOrchestrator');
const store = require('./store/responseStore');
const dto = require('./dto/securityResponseDto');
const catalog = require('./catalog/actionCatalog');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityResponseOrchestratorEnabled,
  flags,
  runtime,
  orchestrator,
  store,
  dto,
  catalog,
  metrics: require('./metrics/responseMetrics'),
  assist: require('./engine/assistExecutor'),
  getAuditPayload: runtime.getAuditPayload,
  getHistoryPayload: runtime.getHistoryPayload,
  orchestrateResponse: orchestrator.orchestrateResponse,
  rollbackResponse: orchestrator.rollbackResponse,
  processPendingNotifications: orchestrator.processPendingNotifications
};
