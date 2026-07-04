'use strict';

/**
 * SEC-17 — Enterprise Exfiltration Detection & Data Protection (public API).
 */

const flags = require('./config/securityExfiltrationFlags');
const runtime = require('./runtime/exfiltrationRuntime');
const engine = require('./engine/exfiltrationDetectionEngine');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityExfiltrationDetectionEnabled,
  flags,
  runtime,
  engine,
  store: require('./store/exfiltrationStore'),
  metrics: require('./metrics/exfiltrationMetrics'),
  registry: require('./engine/sensitiveAssetRegistry'),
  movement: require('./engine/dataMovementAnalysisService'),
  accessProfiler: require('./engine/assetAccessProfiler'),
  confidence: require('./engine/exfiltrationConfidenceService'),
  planner: require('./engine/dataProtectionPlanner'),
  timeline: require('./engine/exfiltrationTimelineBuilder'),
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  evaluateExfiltrationDetection: engine.evaluateExfiltrationDetection
};
