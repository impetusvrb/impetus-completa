'use strict';

/**
 * SEC-17 — Exfiltration Confidence Engine.
 */

const metrics = require('../metrics/exfiltrationMetrics');

function computeExfiltrationConfidence(movementProfiles, accessProfiles, threatProfiles) {
  if (!movementProfiles.length) return 0;
  let score = 0;
  for (const mp of movementProfiles) {
    score += (mp.movementScore || 0) * 0.35;
    if ((mp.movementTypes || []).includes('mass_download')) score += 0.15;
    if ((mp.matchedAssets || []).length >= 2) score += 0.1;
  }
  for (const ap of accessProfiles) {
    score += (ap.anomalyScore || 0) * 0.2;
    if (ap.assetDiversity >= 3) score += 0.1;
  }
  for (const tp of threatProfiles || []) {
    score += (tp.confidence || 0) * 0.05;
  }
  return Math.min(1, score / Math.max(1, movementProfiles.length));
}

function computeScrapingConfidence(movementProfiles) {
  const scraping = movementProfiles.filter((p) =>
    (p.movementTypes || []).includes('automated_scraping') ||
    (p.movementTypes || []).includes('non_human_navigation')
  );
  if (!scraping.length) return 0;
  return Math.min(1, scraping.reduce((s, p) => s + (p.movementScore || 0), 0) / scraping.length);
}

function computeDataExposureRisk(accessProfiles, registryAssets) {
  const criticalHits = accessProfiles.filter((p) =>
    (p.assetsAccessed || []).some((a) => a.criticality === 'CRITICAL')
  );
  const base = criticalHits.length / Math.max(1, accessProfiles.length);
  const criticalCount = registryAssets.filter((a) => a.criticality === 'CRITICAL').length;
  return Math.min(1, base * 0.6 + criticalHits.length * 0.1 + criticalCount * 0.02);
}

function computeEvidenceStrength(movementProfiles, accessProfiles, incidentCount) {
  if (incidentCount === 0) return 0;
  const movEvidence = movementProfiles.reduce((s, p) => s + (p.requestCount || 0), 0);
  const accessEvidence = accessProfiles.length;
  return Math.min(1, movEvidence / 50000 + accessEvidence * 0.08 + incidentCount * 0.05);
}

function computeFalsePositiveProbability(exfiltrationConfidence, scrapingConfidence, evidenceStrength) {
  const combined = (exfiltrationConfidence + scrapingConfidence + evidenceStrength) / 3;
  if (combined >= 0.75) return Math.max(0.05, 0.35 - combined * 0.25);
  if (combined >= 0.5) return 0.25;
  if (combined >= 0.25) return 0.45;
  return 0.65;
}

function buildConfidenceReport(movementProfiles, accessProfiles, threatProfiles, registryAssets, incidentCount) {
  const exfiltrationConfidence = Math.round(
    computeExfiltrationConfidence(movementProfiles, accessProfiles, threatProfiles) * 100
  ) / 100;
  const scrapingConfidence = Math.round(
    computeScrapingConfidence(movementProfiles) * 100
  ) / 100;
  const dataExposureRisk = Math.round(
    computeDataExposureRisk(accessProfiles, registryAssets) * 100
  ) / 100;
  const evidenceStrength = Math.round(
    computeEvidenceStrength(movementProfiles, accessProfiles, incidentCount) * 100
  ) / 100;
  const falsePositiveProbability = Math.round(
    computeFalsePositiveProbability(exfiltrationConfidence, scrapingConfidence, evidenceStrength) * 100
  ) / 100;

  metrics.setGauge('evidence_strength', evidenceStrength);

  return {
    exfiltrationConfidence,
    scrapingConfidence,
    dataExposureRisk,
    evidenceStrength,
    falsePositiveProbability
  };
}

module.exports = {
  computeExfiltrationConfidence,
  computeScrapingConfidence,
  computeDataExposureRisk,
  computeEvidenceStrength,
  computeFalsePositiveProbability,
  buildConfidenceReport
};
