'use strict';

/**
 * SEC-03 — Enterprise Threat Intelligence Engine (public API).
 */

const flags = require('./config/securityThreatIntelligenceFlags');
const runtime = require('./runtime/threatIntelligenceRuntime');
const engine = require('./engine/threatIntelligenceEngine');
const store = require('./store/threatProfileStore');
const dto = require('./dto/threatProfileDto');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityThreatIntelligenceEnabled,
  flags,
  runtime,
  engine,
  store,
  dto,
  metrics: require('./metrics/threatIntelligenceMetrics'),
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  analyzeIncident: engine.analyzeIncident,
  analyzeAllIncidents: engine.analyzeAllIncidents,
  analyzeIncidentById: engine.analyzeIncidentById
};
