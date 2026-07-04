'use strict';

/**
 * SEC-07 — Enterprise Security Operations Center (public API).
 */

const flags = require('./config/securitySOCFlags');
const runtime = require('./runtime/socRuntime');
const builder = require('./engine/socDashboardBuilder');
const dto = require('./dto/securitySOCDto');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecuritySOCEnabled,
  flags,
  runtime,
  builder,
  dto,
  metrics: require('./metrics/socMetrics'),
  getAuditPayload: runtime.getAuditPayload,
  getExecutivePayload: runtime.getExecutivePayload,
  getOperationsPayload: runtime.getOperationsPayload,
  buildSOC: builder.buildSOC
};
