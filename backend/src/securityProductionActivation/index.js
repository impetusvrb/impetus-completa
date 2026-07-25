'use strict';

const runtime = require('./runtime/productionActivationRuntime');

module.exports = {
  init: runtime.init,
  shutdown: runtime.shutdown,
  isEnabled: runtime.isEnabled,
  flags: runtime.flags,
  store: runtime.store,
  metrics: runtime.metrics,
  orchestrator: runtime.orchestrator,
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  writeEvidencePackage: runtime.writeEvidencePackage,
  runActivation: runtime.runActivation
};
