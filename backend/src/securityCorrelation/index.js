'use strict';

/**
 * SEC-02 — Enterprise Security Correlation Engine (public API).
 */

const flags = require('./config/securityCorrelationFlags');
const runtime = require('./runtime/correlationRuntime');
const engine = require('./engine/correlationEngine');
const store = require('./store/incidentStore');
const dto = require('./dto/securityIncidentDto');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityCorrelationEngineEnabled,
  flags,
  runtime,
  engine,
  store,
  metrics: require('./metrics/correlationMetrics'),
  dto,
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  correlateEvent: engine.correlateEvent,
  correlateBatch: engine.correlateBatch
};
