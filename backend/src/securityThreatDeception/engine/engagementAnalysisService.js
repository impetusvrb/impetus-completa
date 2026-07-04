'use strict';

/**
 * SEC-16 — Engagement Analyzer.
 */

const store = require('../store/threatDeceptionStore');
const metrics = require('../metrics/threatDeceptionMetrics');

function analyzeEngagement(incidents, sec14Dashboard, sec15Dashboard, scenarios) {
  const openIncidents = incidents.filter((i) => i.status === 'OPEN');
  const recurrenceCount = incidents.filter((i) => (i.tags || []).includes('recurrence')).length;
  const totalRequests = incidents.reduce((s, i) => s + (i.metrics?.requestCount || 0), 0);
  const endpointDepth = incidents.reduce(
    (s, i) => s + (i.affectedComponents?.length || 0),
    0
  );

  const scannerConfidence = sec15Dashboard?.scannerConfidence
    ?? sec14Dashboard?.behaviorScore
    ?? 0;
  const blockingScore = sec14Dashboard?.reputationScore != null
    ? (100 - sec14Dashboard.reputationScore) / 100
    : 0;

  const deceptionConfidence = Math.min(
    1,
    scannerConfidence * 0.35 +
      blockingScore * 0.2 +
      Math.min(0.25, scenarios.length * 0.05) +
      Math.min(0.2, recurrenceCount * 0.08)
  );

  const attackerPersistence = Math.min(
    1,
    recurrenceCount * 0.15 +
      Math.min(0.4, openIncidents.length * 0.1) +
      Math.min(0.3, totalRequests / 50000)
  );

  const interactionDepth = Math.min(1, endpointDepth / 30 + scenarios.length * 0.08);

  const uaSet = new Set();
  let hasAdvancedUa = false;
  for (const inc of incidents) {
    for (const ua of inc.participants?.userAgents || []) {
      uaSet.add(ua);
      const l = String(ua).toLowerCase();
      if (l.includes('nikto') || l.includes('nmap') || l.includes('zap')) hasAdvancedUa = true;
    }
  }

  const scannerSophistication = Math.min(
    1,
    (hasAdvancedUa ? 0.35 : 0.1) +
      Math.min(0.3, uaSet.size * 0.05) +
      interactionDepth * 0.25 +
      (sec15Dashboard?.attackPattern === 'DISTRIBUTED_RECONNAISSANCE' ? 0.2 : 0)
  );

  const profile = {
    schema_version: 'engagement_profile_v1',
    profileId: `eng-${Date.now()}`,
    deceptionConfidence: Math.round(deceptionConfidence * 100) / 100,
    attackerPersistence: Math.round(attackerPersistence * 100) / 100,
    interactionDepth: Math.round(interactionDepth * 100) / 100,
    scannerSophistication: Math.round(scannerSophistication * 100) / 100,
    engagementLevel: resolveEngagementLevel(deceptionConfidence, attackerPersistence),
    incidentCount: incidents.length,
    scenarioCount: scenarios.length
  };

  store.setEngagementProfile(profile.profileId, profile);
  metrics.increment('engagement_profiles');
  metrics.setGauge('attacker_persistence', profile.attackerPersistence);
  metrics.setGauge('scanner_sophistication', profile.scannerSophistication);

  return profile;
}

function resolveEngagementLevel(deceptionConfidence, persistence) {
  if (deceptionConfidence >= 0.75 || persistence >= 0.7) return 'HIGH';
  if (deceptionConfidence >= 0.5 || persistence >= 0.4) return 'MEDIUM';
  if (deceptionConfidence >= 0.25) return 'LOW';
  return 'NONE';
}

module.exports = { analyzeEngagement, resolveEngagementLevel };
