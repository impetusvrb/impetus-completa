'use strict';

/**
 * SEC-14 — Fingerprint Engine.
 * Nunca infere identidade — apenas padrões técnicos.
 */

const store = require('../store/adaptiveBlockingStore');
const metrics = require('../metrics/adaptiveBlockingMetrics');

function buildFingerprintKey(incident) {
  const ip = (incident.participants?.ips || [])[0] || 'unknown';
  const ua = ((incident.participants?.userAgents || [])[0] || 'unknown').slice(0, 64);
  return `fp:${ip}:${ua}`;
}

function buildFingerprint(incident, behaviorProfile) {
  const ip = (incident.participants?.ips || [])[0] || null;
  const ua = (incident.participants?.userAgents || [])[0] || null;
  const asn = (incident.participants?.asns || [])[0] || null;

  const endpointPattern = incident.affectedComponents?.slice(0, 5) || [];
  const reqCount = incident.metrics?.requestCount || 0;
  const frequency = incident.durationMs ? reqCount / (incident.durationMs / 1000) : 0;

  const confidence = Math.min(
    1,
    (behaviorProfile?.behaviorScore || 0) * 0.5 +
      (incident.confidence || 0) * 0.3 +
      Math.min(0.2, (incident.participants?.ips?.length || 0) * 0.05)
  );

  const fp = {
    schema_version: 'scanner_fingerprint_v1',
    fingerprintId: buildFingerprintKey(incident),
    ip,
    asn,
    userAgent: ua ? String(ua).slice(0, 128) : null,
    accessPatterns: {
      classification: incident.classification,
      endpointSequence: endpointPattern,
      requestCount: reqCount,
      frequencyPerSecond: Math.round(frequency * 100) / 100
    },
    behaviors: behaviorProfile?.behaviors || [],
    fingerprintConfidence: confidence,
    disclaimer: 'Fingerprint técnico — não infere identidade do actor',
    generatedAt: new Date().toISOString()
  };

  store.setFingerprint(fp.fingerprintId, fp);
  metrics.increment('fingerprints_generated');
  return fp;
}

function buildFingerprintsForIncidents(incidents, behaviorProfiles) {
  const byId = new Map(behaviorProfiles.map((p) => [p.incidentId, p]));
  return (incidents || []).slice(0, 20).map((inc) =>
    buildFingerprint(inc, byId.get(inc.incidentId))
  );
}

module.exports = { buildFingerprint, buildFingerprintsForIncidents, buildFingerprintKey };
