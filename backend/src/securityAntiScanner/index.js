'use strict';

/**
 * SEC-15 — Enterprise Anti-Scanner & Anti-Enumeration (public API).
 */

const flags = require('./config/securityAntiScannerFlags');
const runtime = require('./runtime/antiScannerRuntime');
const engine = require('./engine/antiScannerEngine');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityAntiScannerEnabled,
  flags,
  runtime,
  engine,
  store: require('./store/antiScannerStore'),
  metrics: require('./metrics/antiScannerMetrics'),
  scannerFingerprint: require('./engine/scannerFingerprintService'),
  enumerationDetection: require('./engine/enumerationDetectionService'),
  scannerConfidence: require('./engine/scannerConfidenceService'),
  surfacePlanner: require('./engine/surfaceProtectionPlanner'),
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  evaluateAntiScanner: engine.evaluateAntiScanner
};
