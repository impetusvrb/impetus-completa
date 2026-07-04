'use strict';

/**
 * SEC-16 — Enterprise Threat Deception Framework (public API).
 */

const flags = require('./config/securityThreatDeceptionFlags');
const runtime = require('./runtime/threatDeceptionRuntime');
const engine = require('./engine/threatDeceptionEngine');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityThreatDeceptionEnabled,
  flags,
  runtime,
  engine,
  store: require('./store/threatDeceptionStore'),
  metrics: require('./metrics/threatDeceptionMetrics'),
  honeypot: require('./engine/honeypotProfileService'),
  scenarios: require('./engine/deceptionScenarioService'),
  engagement: require('./engine/engagementAnalysisService'),
  evidence: require('./engine/deceptionEvidenceService'),
  planner: require('./engine/threatDeceptionPlanner'),
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  evaluateThreatDeception: engine.evaluateThreatDeception
};
