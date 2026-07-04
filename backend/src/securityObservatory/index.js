'use strict';

/**
 * SEC-01 — Enterprise Security Observatory (public API).
 */

const flags = require('./config/securityObservatoryFlags');
const runtime = require('./observatory/securityObservatoryRuntime');
const bus = require('./bus/securityEventBus');
const dto = require('./dto/securityEventDto');
const middleware = require('./middleware/securityObservatoryMiddleware');
const ingest = require('./ingest/nginxLogIngestor');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityObservatoryEnabled,
  flags,
  runtime,
  bus,
  dto,
  middleware,
  ingest,
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  recordExternalEvent: runtime.recordExternalEvent
};
