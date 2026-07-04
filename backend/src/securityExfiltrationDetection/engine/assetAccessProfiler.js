'use strict';

/**
 * SEC-17 — Asset Access Profiler.
 */

const store = require('../store/exfiltrationStore');
const metrics = require('../metrics/exfiltrationMetrics');
const registry = require('./sensitiveAssetRegistry');

function profileAccess(incident, movementProfile, matchedAssets) {
  const m = incident.metrics || {};
  const reqCount = m.requestCount || 0;
  const endpoints = incident.affectedComponents || [];
  const duration = incident.durationMs || 3600000;
  const velocity = reqCount / (duration / 1000);

  const assetDiversity = matchedAssets.length;
  const depth = endpoints.length;
  const frequency = reqCount;

  const expectedRate = incident.classification?.includes('SCAN') ? 0.5 : 2;
  const observedVsExpected = velocity / Math.max(expectedRate, 0.1);
  const anomalyScore = Math.min(1, Math.max(0, (observedVsExpected - 1) * 0.3));

  const profile = {
    schema_version: 'asset_access_v1',
    profileId: `aap-${incident.incidentId}`,
    incidentId: incident.incidentId,
    frequency,
    depth,
    velocity: Math.round(velocity * 100) / 100,
    assetDiversity,
    expectedVsObserved: Math.round(observedVsExpected * 100) / 100,
    anomalyScore: Math.round(anomalyScore * 100) / 100,
    assetsAccessed: matchedAssets.map((a) => ({
      assetId: a.assetId,
      name: a.name,
      criticality: a.criticality,
      category: a.category
    }))
  };

  store.addAccessProfile(profile);
  if (anomalyScore >= 0.3 || assetDiversity >= 2) {
    metrics.increment('suspicious_asset_access');
  }
  if (matchedAssets.some((a) => a.criticality === 'CRITICAL')) {
    metrics.increment('asset_exposure');
  }
  return profile;
}

function profileAllAccess(incidents, movementProfiles) {
  const movById = new Map(movementProfiles.map((p) => [p.incidentId, p]));
  return (incidents || []).map((inc) => {
    const mov = movById.get(inc.incidentId);
    const assets = registry.matchAssetsFromPaths(inc.affectedComponents || []);
    return profileAccess(inc, mov, assets);
  });
}

module.exports = { profileAccess, profileAllAccess };
