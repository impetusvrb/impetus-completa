'use strict';

/**
 * SEC-10 — Threat Pattern Engine.
 * Detecta padrões a partir de incidentes SEC-02 (read-only).
 */

const PATTERNS = Object.freeze([
  'Reconnaissance',
  'Credential Scan',
  'Directory Bruteforce',
  'API Enumeration',
  'Bot Scan',
  'Cloud Scanner',
  'Distributed Scanner',
  'Slow Scan',
  'Repeated Campaign',
  'Persistent Campaign',
  'Massive Enumeration'
]);

const CLASSIFICATION_MAP = {
  RECONNAISSANCE: 'Reconnaissance',
  CREDENTIAL_SCAN: 'Credential Scan',
  PATH_ENUMERATION: 'Directory Bruteforce',
  API_ENUMERATION: 'API Enumeration',
  API_PROBE: 'API Enumeration',
  BOT_SCAN: 'Bot Scan',
  CLOUD_SCANNER: 'Cloud Scanner',
  GENERIC_SCAN: 'Bot Scan',
  BRUTEFORCE: 'Directory Bruteforce',
  UNKNOWN: 'Reconnaissance'
};

function detectPatternsFromIncident(incident) {
  if (!incident) return [];
  const patterns = new Set();
  const cls = incident.classification || 'UNKNOWN';
  if (CLASSIFICATION_MAP[cls]) patterns.add(CLASSIFICATION_MAP[cls]);

  const metrics = incident.metrics || {};
  const reqCount = metrics.requestCount || 0;
  const uniqueIps = metrics.uniqueIps || (incident.participants?.ips?.length || 0);
  const durationMs = incident.durationMs || 0;

  if (uniqueIps >= 5) patterns.add('Distributed Scanner');
  if (reqCount >= 10000) patterns.add('Massive Enumeration');
  if (durationMs > 3600000 && reqCount > 100) patterns.add('Persistent Campaign');
  if (durationMs > 600000 && reqCount > 500 && durationMs / Math.max(reqCount, 1) > 200) {
    patterns.add('Slow Scan');
  }
  if ((incident.tags || []).includes('recurrence')) patterns.add('Repeated Campaign');

  const uaCount = (incident.participants?.userAgents || []).length;
  if (uaCount >= 3 && uniqueIps >= 2) patterns.add('Distributed Scanner');

  if (patterns.size === 0) patterns.add('Reconnaissance');
  return [...patterns];
}

function detectPatternsFromIncidents(incidents) {
  const all = [];
  const seen = new Set();
  for (const inc of incidents || []) {
    for (const p of detectPatternsFromIncident(inc)) {
      const key = `${inc.incidentId}:${p}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push({
          pattern: p,
          incidentId: inc.incidentId,
          severity: inc.severity,
          classification: inc.classification
        });
      }
    }
  }
  return all;
}

function detectCampaigns(incidents) {
  const campaigns = [];
  const byClassification = new Map();
  for (const inc of incidents || []) {
    const key = inc.classification || 'UNKNOWN';
    if (!byClassification.has(key)) byClassification.set(key, []);
    byClassification.get(key).push(inc);
  }
  for (const [classification, group] of byClassification) {
    if (group.length < 2) continue;
    const ips = new Set();
    group.forEach((i) => (i.participants?.ips || []).forEach((ip) => ips.add(ip)));
    campaigns.push({
      campaignId: `camp-${classification}-${group.length}`,
      classification,
      incidentCount: group.length,
      uniqueIps: ips.size,
      persistent: group.some((i) => (i.durationMs || 0) > 3600000),
      repeated: group.length >= 3
    });
  }
  return campaigns;
}

module.exports = {
  PATTERNS,
  detectPatternsFromIncident,
  detectPatternsFromIncidents,
  detectCampaigns
};
