'use strict';

/**
 * SEC-05 — Enterprise Security Notification Center (public API).
 */

const flags = require('./config/securityNotificationFlags');
const runtime = require('./runtime/notificationRuntime');
const engine = require('./engine/notificationEngine');
const store = require('./store/notificationStore');
const dto = require('./dto/notificationDto');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityNotificationCenterEnabled,
  flags,
  runtime,
  engine,
  store,
  dto,
  metrics: require('./metrics/notificationMetrics'),
  channels: require('./channels/channelRouter'),
  getAuditPayload: runtime.getAuditPayload,
  getPendingPayload: runtime.getPendingPayload,
  buildDashboard: runtime.buildDashboard,
  processAllSources: engine.processAllSources
};
