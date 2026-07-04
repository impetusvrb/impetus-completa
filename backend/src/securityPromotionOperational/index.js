'use strict';

const flags = require('./config/securityOperationalPromotionFlags');
const runtime = require('./runtime/operationalPromotionRuntime');
const dashboard = require('./engine/promotionOperationalDashboard');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityOperationalPromotionEnabled,
  flags,
  runtime,
  dashboard,
  store: require('./store/operationalPromotionStore'),
  metrics: require('./metrics/securityOperationalMonitor'),
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: dashboard.buildDashboard
};
