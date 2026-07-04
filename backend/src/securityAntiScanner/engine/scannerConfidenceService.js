'use strict';

/**
 * SEC-15 — Scanner Confidence Engine.
 */

const metrics = require('../metrics/antiScannerMetrics');

function computeScannerConfidence(fingerprints, threatProfiles) {
  if (!fingerprints.length) return 0;

  let score = 0;
  for (const fp of fingerprints) {
    score += (fp.patterns?.length || 0) * 0.08;
    score += Math.min(0.25, (fp.requestCount || 0) / 50000);
    if ((fp.uniqueIps || 0) >= 5) score += 0.1;
  }

  for (const tp of threatProfiles || []) {
    score += (tp.confidence || 0) * 0.15;
  }

  return Math.min(1, score / Math.max(1, fingerprints.length));
}

function computeEnumerationConfidence(enumerationProfiles) {
  if (!enumerationProfiles.length) return 0;
  const avg = enumerationProfiles.reduce((s, p) => s + (p.enumerationScore || 0), 0)
    / enumerationProfiles.length;
  const sensitiveBonus = enumerationProfiles.some((p) =>
    (p.enumerationTypes || []).includes('sensitive_file_probe')
  ) ? 0.15 : 0;
  return Math.min(1, avg + sensitiveBonus);
}

function computeAutomationConfidence(fingerprints, incidents) {
  let score = 0;
  for (const fp of fingerprints) {
    const ua = String(fp.userAgent || '').toLowerCase();
    if (ua.includes('bot') || ua.includes('scanner') || ua.includes('curl') || ua.includes('python')) {
      score += 0.2;
    }
    if ((fp.requestCount || 0) >= 1000) score += 0.15;
  }
  for (const inc of incidents || []) {
    const rate = inc.durationMs ? (inc.metrics?.requestCount || 0) / (inc.durationMs / 1000) : 0;
    if (rate > 5) score += 0.1;
  }
  return Math.min(1, score / Math.max(1, fingerprints.length));
}

function computeFalsePositiveProbability(scannerConfidence, enumerationConfidence, incidentCount) {
  if (incidentCount === 0) return 1;
  const combined = (scannerConfidence + enumerationConfidence) / 2;
  if (combined >= 0.75) return Math.max(0.05, 0.3 - combined * 0.2);
  if (combined >= 0.5) return 0.25;
  if (combined >= 0.25) return 0.45;
  return 0.65;
}

function buildConfidenceReport(fingerprints, enumerationProfiles, threatProfiles, incidents) {
  const scannerConfidence = Math.round(computeScannerConfidence(fingerprints, threatProfiles) * 100) / 100;
  const enumerationConfidence = Math.round(
    computeEnumerationConfidence(enumerationProfiles) * 100
  ) / 100;
  const automationConfidence = Math.round(
    computeAutomationConfidence(fingerprints, incidents) * 100
  ) / 100;
  const falsePositiveProbability = Math.round(
    computeFalsePositiveProbability(scannerConfidence, enumerationConfidence, incidents.length) * 100
  ) / 100;

  metrics.setGauge('scanner_confidence', scannerConfidence);
  metrics.setGauge('enumeration_confidence', enumerationConfidence);

  return {
    scannerConfidence,
    enumerationConfidence,
    automationConfidence,
    falsePositiveProbability
  };
}

module.exports = {
  computeScannerConfidence,
  computeEnumerationConfidence,
  computeAutomationConfidence,
  computeFalsePositiveProbability,
  buildConfidenceReport
};
