'use strict';

/**
 * SEC-17 — Data Movement Analyzer.
 */

const store = require('../store/exfiltrationStore');
const metrics = require('../metrics/exfiltrationMetrics');
const registry = require('./sensitiveAssetRegistry');

const MOVEMENT_TYPES = Object.freeze([
  'mass_download',
  'sequential_anomaly',
  'repetitive_read',
  'automated_scraping',
  'chained_downloads',
  'non_human_navigation'
]);

function analyzeMovementFromIncident(incident) {
  const types = new Set();
  const m = incident.metrics || {};
  const reqCount = m.requestCount || 0;
  const endpoints = incident.affectedComponents || [];
  const duration = incident.durationMs || 1;
  const rate = reqCount / (duration / 1000);

  if (reqCount >= 5000) types.add('mass_download');
  if (reqCount >= 2000 && endpoints.length >= 5) types.add('sequential_anomaly');
  if (reqCount >= 1000 && rate > 5) types.add('repetitive_read');
  if (rate > 10 || (incident.participants?.userAgents || []).some((ua) =>
    /bot|curl|wget|python|scrapy/i.test(String(ua))
  )) types.add('automated_scraping');
  if (endpoints.length >= 8) types.add('chained_downloads');
  if (rate > 3 && endpoints.length >= 4) types.add('non_human_navigation');

  const matchedAssets = registry.matchAssetsFromPaths(endpoints);
  const movementScore = Math.min(
    1,
    types.size * 0.12 + reqCount / 30000 + matchedAssets.length * 0.08
  );

  const profile = {
    schema_version: 'data_movement_v1',
    profileId: `mov-${incident.incidentId}`,
    incidentId: incident.incidentId,
    movementTypes: [...types],
    movementScore: Math.round(movementScore * 100) / 100,
    requestCount: reqCount,
    ratePerSecond: Math.round(rate * 100) / 100,
    endpointCount: endpoints.length,
    matchedAssets: matchedAssets.map((a) => a.assetId),
    endpointsSample: endpoints.slice(0, 10)
  };

  store.addMovementProfile(profile);
  if (types.has('automated_scraping')) metrics.increment('scraping_patterns');
  if (reqCount >= 3000) metrics.increment('download_profiles');
  if (movementScore >= 0.4) metrics.increment('exfiltration_candidates');
  return profile;
}

function analyzeAllMovements(incidents) {
  return (incidents || []).map(analyzeMovementFromIncident);
}

module.exports = {
  MOVEMENT_TYPES,
  analyzeMovementFromIncident,
  analyzeAllMovements
};
