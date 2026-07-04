'use strict';

/**
 * SEC-10 — Enterprise Active Defense Layer (public API).
 */

const flags = require('./config/securityActiveDefenseFlags');
const runtime = require('./runtime/activeDefenseRuntime');
const engine = require('./engine/activeDefenseEngine');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityActiveDefenseEnabled,
  flags,
  runtime,
  engine,
  store: require('./store/activeDefenseStore'),
  metrics: require('./metrics/activeDefenseMetrics'),
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  evaluateDefense: engine.evaluateDefense
};
