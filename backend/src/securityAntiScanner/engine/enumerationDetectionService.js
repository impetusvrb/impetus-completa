'use strict';

/**
 * SEC-15 — Enumeration Detection Engine.
 */

const store = require('../store/antiScannerStore');
const metrics = require('../metrics/antiScannerMetrics');

const ENUMERATION_TYPES = Object.freeze([
  'sequential_endpoint_growth',
  'sensitive_file_probe',
  'api_enumeration',
  'asset_enumeration',
  'upload_enumeration'
]);

const SENSITIVE_FILES = [
  '.env', '.git', 'docker-compose', 'backup', 'config',
  'wp-config', 'database.yml', '.htaccess', 'id_rsa'
];

function detectEnumerationFromIncident(incident) {
  const types = new Set();
  const endpoints = incident.affectedComponents || [];
  const m = incident.metrics || {};

  const sensitiveHits = endpoints.filter((ep) =>
    SENSITIVE_FILES.some((s) => String(ep).toLowerCase().includes(s))
  );
  if (sensitiveHits.length >= 1) types.add('sensitive_file_probe');
  if (endpoints.length >= 4) types.add('sequential_endpoint_growth');
  if (endpoints.some((e) => /\/api\//i.test(String(e))) || incident.classification?.includes('API')) {
    types.add('api_enumeration');
  }
  if (endpoints.some((e) => /\/uploads|\/assets|\/static|\/media/i.test(String(e)))) {
    types.add('asset_enumeration');
  }
  if (endpoints.some((e) => /\/upload|\/files|multipart/i.test(String(e)))) {
    types.add('upload_enumeration');
  }
  if (incident.classification === 'PATH_ENUMERATION') types.add('sensitive_file_probe');

  const enumerationScore = Math.min(
    1,
    types.size * 0.18 + sensitiveHits.length * 0.12 + endpoints.length * 0.04
  );

  const profile = {
    schema_version: 'enumeration_attempt_v1',
    profileId: `enum-${incident.incidentId}`,
    incidentId: incident.incidentId,
    enumerationTypes: [...types],
    enumerationScore: Math.round(enumerationScore * 100) / 100,
    sensitiveFileHits: sensitiveHits,
    endpointCount: endpoints.length,
    endpointsSample: endpoints.slice(0, 10),
    requestCount: m.requestCount || 0
  };

  store.setEnumerationProfile(profile.profileId, profile);
  metrics.increment('enumeration_attempts');
  return profile;
}

function detectAllEnumerations(incidents) {
  return (incidents || []).map(detectEnumerationFromIncident);
}

function isEnumerationDetected(profiles) {
  return (profiles || []).some((p) => p.enumerationScore >= 0.25 || p.enumerationTypes.length > 0);
}

function aggregateEnumerationConfidence(profiles) {
  if (!profiles.length) return 0;
  return profiles.reduce((s, p) => s + p.enumerationScore, 0) / profiles.length;
}

module.exports = {
  ENUMERATION_TYPES,
  detectEnumerationFromIncident,
  detectAllEnumerations,
  isEnumerationDetected,
  aggregateEnumerationConfidence
};
