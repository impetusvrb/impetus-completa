'use strict';

/**
 * SEC-15 — Scanner Fingerprint Engine.
 * Detecta padrões de scanner — nunca identifica pessoas.
 */

const store = require('../store/antiScannerStore');
const metrics = require('../metrics/antiScannerMetrics');

const SCANNER_PATTERNS = Object.freeze([
  'credential_scanner',
  'directory_brute_force',
  'endpoint_enumeration',
  'mass_404',
  'source_discovery',
  'aggressive_bot',
  'distributed_scanner',
  'framework_fingerprinting'
]);

const CLASSIFICATION_MAP = {
  CREDENTIAL_SCAN: 'credential_scanner',
  PATH_ENUMERATION: 'directory_brute_force',
  API_ENUMERATION: 'endpoint_enumeration',
  API_PROBE: 'endpoint_enumeration',
  RECONNAISSANCE: 'source_discovery',
  BOT_SCAN: 'aggressive_bot',
  GENERIC_SCAN: 'aggressive_bot',
  BRUTEFORCE: 'credential_scanner'
};

function detectPatternsFromIncident(incident) {
  const patterns = new Set();
  const mapped = CLASSIFICATION_MAP[incident.classification];
  if (mapped) patterns.add(mapped);

  const m = incident.metrics || {};
  const reqCount = m.requestCount || 0;
  const uniqueIps = m.uniqueIps || (incident.participants?.ips?.length || 0);
  const endpoints = incident.affectedComponents || [];
  const ua = ((incident.participants?.userAgents || [])[0] || '').toLowerCase();

  if (reqCount >= 3000 && endpoints.length >= 5) patterns.add('mass_404');
  if (uniqueIps >= 5) patterns.add('distributed_scanner');
  if (reqCount >= 5000) patterns.add('aggressive_bot');
  if (endpoints.some((e) => /\/\.env|\/\.git|\/docker-compose|backup|config/i.test(String(e)))) {
    patterns.add('source_discovery');
  }
  if (endpoints.some((e) => /express|swagger|graphql|actuator|wp-/i.test(String(e)))) {
    patterns.add('framework_fingerprinting');
  }
  if (ua.includes('nikto') || ua.includes('nmap') || ua.includes('zap') || ua.includes('scanner')) {
    patterns.add('aggressive_bot');
  }
  if (endpoints.length >= 3) patterns.add('endpoint_enumeration');

  if (patterns.size === 0) patterns.add('endpoint_enumeration');

  return [...patterns];
}

function buildScannerFingerprint(incident) {
  const patterns = detectPatternsFromIncident(incident);
  const m = incident.metrics || {};

  const fp = {
    schema_version: 'scanner_fingerprint_v1',
    fingerprintId: `sfp-${incident.incidentId}`,
    incidentId: incident.incidentId,
    patterns,
    primaryIp: (incident.participants?.ips || [])[0] || null,
    userAgent: (incident.participants?.userAgents || [])[0] || null,
    requestCount: m.requestCount || 0,
    uniqueIps: m.uniqueIps || (incident.participants?.ips?.length || 0),
    endpointSample: (incident.affectedComponents || []).slice(0, 8),
    classification: incident.classification,
    severity: incident.severity,
    disclaimer: 'Fingerprint comportamental — não identifica pessoa',
    detectedAt: new Date().toISOString()
  };

  store.setScannerFingerprint(fp.fingerprintId, fp);
  metrics.increment('scanner_detections');
  return fp;
}

function detectAllScannerFingerprints(incidents) {
  return (incidents || []).map(buildScannerFingerprint);
}

function resolveAttackPattern(fingerprints) {
  if (!fingerprints.length) return 'NONE';
  const all = new Set();
  for (const fp of fingerprints) {
    for (const p of fp.patterns || []) all.add(p);
  }
  if (all.has('credential_scanner')) return 'CREDENTIAL_SCANNING';
  if (all.has('distributed_scanner')) return 'DISTRIBUTED_RECONNAISSANCE';
  if (all.has('directory_brute_force') || all.has('source_discovery')) return 'SURFACE_ENUMERATION';
  if (all.has('framework_fingerprinting')) return 'FRAMEWORK_FINGERPRINTING';
  if (all.has('mass_404')) return 'MASS_PROBING';
  if (all.has('endpoint_enumeration')) return 'API_DISCOVERY';
  return 'AUTOMATED_SCAN';
}

module.exports = {
  SCANNER_PATTERNS,
  detectPatternsFromIncident,
  buildScannerFingerprint,
  detectAllScannerFingerprints,
  resolveAttackPattern
};
