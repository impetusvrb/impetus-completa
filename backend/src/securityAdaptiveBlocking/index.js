'use strict';

/**
 * SEC-14 — Enterprise Adaptive Blocking Engine (public API).
 */

const flags = require('./config/securityAdaptiveBlockingFlags');
const runtime = require('./runtime/adaptiveBlockingRuntime');
const engine = require('./engine/adaptiveBlockingEngine');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityAdaptiveBlockingEnabled,
  flags,
  runtime,
  engine,
  store: require('./store/adaptiveBlockingStore'),
  metrics: require('./metrics/adaptiveBlockingMetrics'),
  reputation: require('./engine/reputationService'),
  behavior: require('./engine/behaviorAnalysisService'),
  fingerprint: require('./engine/fingerprintService'),
  blacklist: require('./engine/adaptiveBlacklistService'),
  recommendations: require('./engine/blockingRecommendationService'),
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  evaluateAdaptiveBlocking: engine.evaluateAdaptiveBlocking
};
