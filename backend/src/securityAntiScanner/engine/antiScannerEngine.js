'use strict';

/**
 * SEC-15 — Anti-Scanner Engine.
 * Consome SEC-01, SEC-02, SEC-03, SEC-14 read-only; nunca modifica runtime ou HTTP.
 */

const flags = require('../config/securityAntiScannerFlags');
const metrics = require('../metrics/antiScannerMetrics');
const store = require('../store/antiScannerStore');
const collector = require('../collectors/secAntiScannerCollector');
const scannerFingerprint = require('./scannerFingerprintService');
const enumerationDetection = require('./enumerationDetectionService');
const scannerConfidence = require('./scannerConfidenceService');
const surfacePlanner = require('./surfaceProtectionPlanner');
const { createAntiScannerDashboardDto, freezeDto } = require('../dto/antiScannerDto');

function getCertifiedIncidents(context) {
  const open = context?.sec02?.open || [];
  const closed = context?.sec02?.closed || [];
  return [...open, ...closed];
}

function evaluateAntiScanner(opts = {}) {
  const start = Date.now();
  const enabled = flags.isSecurityAntiScannerEnabled();
  const context = collector.collectAntiScannerContext();
  const incidents = getCertifiedIncidents(context);
  const threatProfiles = context.sec03?.profiles || [];

  const fingerprints = scannerFingerprint.detectAllScannerFingerprints(incidents);
  const enumerationProfiles = enumerationDetection.detectAllEnumerations(incidents);
  const enumerationDetected = enumerationDetection.isEnumerationDetected(enumerationProfiles);
  const scannerDetected = fingerprints.length > 0 &&
    fingerprints.some((fp) => (fp.patterns?.length || 0) >= 1);

  const confidence = scannerConfidence.buildConfidenceReport(
    fingerprints,
    enumerationProfiles,
    threatProfiles,
    incidents
  );

  const attackPattern = scannerFingerprint.resolveAttackPattern(fingerprints);
  const { plans, recommendedSurfaceProfile } = surfacePlanner.generateSurfaceProtectionPlans(
    fingerprints,
    enumerationProfiles,
    confidence
  );

  const topPlan = plans.find((p) => p.action !== 'no_action') || plans[0] || null;

  const dashboard = freezeDto(createAntiScannerDashboardDto({
    enabled,
    mode: flags.surfaceProtectionMode(),
    scannerDetected,
    scannerConfidence: confidence.scannerConfidence,
    enumerationDetected,
    attackPattern,
    protectionRecommendation: topPlan?.action || 'no_action',
    recommendedSurfaceProfile,
    approvalRequired: flags.requireApproval(),
    confidence,
    scannerFingerprints: fingerprints.slice(0, 20),
    enumerationProfiles: enumerationProfiles.slice(0, 20),
    surfacePlans: plans.slice(0, 20),
    modules_snapshot: {
      sec01: { enabled: context.sec01?.enabled },
      sec02: { enabled: context.sec02?.enabled, incidents: incidents.length },
      sec03: { enabled: context.sec03?.enabled, profiles: threatProfiles.length },
      sec14: { enabled: context.sec14?.enabled }
    },
    metrics: metrics.getSnapshot()
  }));

  store.setLastDashboard(dashboard);
  metrics.increment('evaluations');
  metrics.increment('anti_scanner_reports');
  metrics.recordEvaluationTime(Date.now() - start);

  return dashboard;
}

module.exports = { evaluateAntiScanner, getCertifiedIncidents };
