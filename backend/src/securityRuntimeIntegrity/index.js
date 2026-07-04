'use strict';

/**
 * SEC-04 — Enterprise Runtime Integrity (public API).
 */

const flags = require('./config/securityRuntimeIntegrityFlags');
const runtime = require('./runtime/integrityRuntime');
const engine = require('./engine/integrityEngine');
const store = require('./store/integrityReportStore');
const dto = require('./dto/runtimeIntegrityDto');
const baseline = require('./baseline/baselineLoader');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityRuntimeIntegrityEnabled,
  flags,
  runtime,
  engine,
  store,
  dto,
  baseline,
  metrics: require('./metrics/integrityMetrics'),
  validators: {
    hash: require('./validators/hashValidator'),
    runtime: require('./validators/runtimeValidator'),
    config: require('./validators/configValidator'),
    filesystem: require('./validators/filesystemValidator'),
    network: require('./validators/networkValidator')
  },
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  runIntegrityCheck: engine.runIntegrityCheck
};
