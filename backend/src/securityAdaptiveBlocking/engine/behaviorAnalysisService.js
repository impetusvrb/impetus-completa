'use strict';

/**
 * SEC-14 — Behavior Analysis Engine.
 */

const metrics = require('../metrics/adaptiveBlockingMetrics');

const BEHAVIOR_TYPES = Object.freeze([
  'credential_scanning',
  'enumeration',
  'aggressive_crawling',
  'distributed_scan',
  'repeated_probing',
  'brute_force',
  'endpoint_discovery',
  'suspicious_rate'
]);

const CLASSIFICATION_MAP = {
  CREDENTIAL_SCAN: 'credential_scanning',
  PATH_ENUMERATION: 'enumeration',
  API_ENUMERATION: 'endpoint_discovery',
  API_PROBE: 'endpoint_discovery',
  RECONNAISSANCE: 'repeated_probing',
  BOT_SCAN: 'aggressive_crawling',
  BRUTEFORCE: 'brute_force',
  GENERIC_SCAN: 'suspicious_rate'
};

function analyzeIncidentBehavior(incident) {
  const behaviors = new Set();
  const cls = incident.classification || 'UNKNOWN';
  if (CLASSIFICATION_MAP[cls]) behaviors.add(CLASSIFICATION_MAP[cls]);

  const metricsInc = incident.metrics || {};
  const reqCount = metricsInc.requestCount || 0;
  const uniqueIps = metricsInc.uniqueIps || (incident.participants?.ips?.length || 0);
  const duration = incident.durationMs || 1;
  const rate = reqCount / (duration / 1000);

  if (reqCount >= 5000) behaviors.add('aggressive_crawling');
  if (uniqueIps >= 5) behaviors.add('distributed_scan');
  if (rate > 10) behaviors.add('suspicious_rate');
  if ((incident.tags || []).includes('recurrence')) behaviors.add('repeated_probing');
  if (reqCount >= 1000 && cls.includes('ENUM')) behaviors.add('enumeration');

  if (behaviors.size === 0) behaviors.add('repeated_probing');

  return {
    incidentId: incident.incidentId,
    behaviors: [...behaviors],
    behaviorScore: Math.min(1, behaviors.size * 0.15 + (reqCount / 20000)),
    requestCount: reqCount,
    rate
  };
}

function analyzeAllBehaviors(incidents) {
  const profiles = (incidents || []).map(analyzeIncidentBehavior);
  metrics.increment('behavior_profiles', profiles.length);
  return profiles;
}

function aggregateBehaviorScore(profiles) {
  if (!profiles.length) return 0;
  return profiles.reduce((s, p) => s + p.behaviorScore, 0) / profiles.length;
}

module.exports = {
  BEHAVIOR_TYPES,
  analyzeIncidentBehavior,
  analyzeAllBehaviors,
  aggregateBehaviorScore
};
