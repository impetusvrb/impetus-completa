'use strict';

/**
 * SEC-17 — Exfiltration Detection Engine.
 * Consome SEC-01→SEC-16 read-only; nunca bloqueia downloads ou altera infra.
 */

const flags = require('../config/securityExfiltrationFlags');
const metrics = require('../metrics/exfiltrationMetrics');
const store = require('../store/exfiltrationStore');
const collector = require('../collectors/secExfiltrationCollector');
const registry = require('./sensitiveAssetRegistry');
const movement = require('./dataMovementAnalysisService');
const accessProfiler = require('./assetAccessProfiler');
const confidence = require('./exfiltrationConfidenceService');
const planner = require('./dataProtectionPlanner');
const timelineBuilder = require('./exfiltrationTimelineBuilder');
const { createExfiltrationDashboardDto, freezeDto } = require('../dto/exfiltrationDto');

function getIncidents(context) {
  const open = context?.sec02?.open || [];
  const closed = context?.sec02?.closed || [];
  return [...open, ...closed];
}

function resolveDetectionStatus(conf) {
  if (conf.exfiltrationConfidence >= 0.75) return 'EXFILTRATION_LIKELY';
  if (conf.exfiltrationConfidence >= 0.5) return 'EXFILTRATION_SUSPECTED';
  if (conf.scrapingConfidence >= 0.5) return 'SCRAPING_DETECTED';
  if (conf.dataExposureRisk >= 0.4) return 'EXPOSURE_ELEVATED';
  if (conf.exfiltrationConfidence >= 0.25) return 'MONITORING';
  return 'CLEAR';
}

function collectSuspiciousAssets(accessProfiles, allAssets) {
  const ids = new Set();
  for (const ap of accessProfiles) {
    for (const a of ap.assetsAccessed || []) ids.add(a.assetId);
  }
  return allAssets.filter((a) => ids.has(a.assetId));
}

function evaluateExfiltrationDetection(opts = {}) {
  const start = Date.now();
  const enabled = flags.isSecurityExfiltrationDetectionEnabled();
  const context = collector.collectExfiltrationContext();
  const incidents = getIncidents(context);
  const allAssets = registry.getAllAssets();
  const threatProfiles = context.sec03?.profiles || [];

  const movementProfiles = movement.analyzeAllMovements(incidents);
  const accessProfiles = accessProfiler.profileAllAccess(incidents, movementProfiles);
  const conf = confidence.buildConfidenceReport(
    movementProfiles,
    accessProfiles,
    threatProfiles,
    allAssets,
    incidents.length
  );
  const suspiciousAssets = collectSuspiciousAssets(accessProfiles, allAssets);
  const timeline = timelineBuilder.buildTimeline(incidents, movementProfiles, accessProfiles);
  const recommendations = planner.generateProtectionPlans(conf, accessProfiles, suspiciousAssets);

  const detectionStatus = resolveDetectionStatus(conf);
  const aggregateMovement = movementProfiles.length
    ? {
      count: movementProfiles.length,
      avgScore: movementProfiles.reduce((s, p) => s + p.movementScore, 0) / movementProfiles.length,
      types: [...new Set(movementProfiles.flatMap((p) => p.movementTypes))]
    }
    : null;

  const dashboard = freezeDto(createExfiltrationDashboardDto({
    enabled,
    mode: flags.dataProtectionMode(),
    detectionStatus,
    exfiltrationConfidence: conf.exfiltrationConfidence,
    scrapingConfidence: conf.scrapingConfidence,
    protectedAssets: allAssets,
    suspiciousAssets,
    movementProfile: aggregateMovement,
    timeline,
    evidenceStrength: conf.evidenceStrength,
    recommendations: recommendations.slice(0, 20),
    approvalRequired: flags.requireApproval(),
    confidence: conf,
    accessProfiles: accessProfiles.slice(0, 20),
    movementProfiles: movementProfiles.slice(0, 20),
    modules_snapshot: {
      sec01: { enabled: context.sec01?.enabled },
      sec02: { enabled: context.sec02?.enabled, incidents: incidents.length },
      sec03: { enabled: context.sec03?.enabled },
      sec04: { enabled: context.sec04?.enabled },
      sec14: { enabled: context.sec14?.enabled },
      sec15: { enabled: context.sec15?.enabled },
      sec16: { enabled: context.sec16?.enabled }
    },
    metrics: metrics.getSnapshot()
  }));

  store.setLastDashboard(dashboard);
  metrics.increment('evaluations');
  metrics.recordEvaluationTime(Date.now() - start);

  return dashboard;
}

module.exports = { evaluateExfiltrationDetection, getIncidents, resolveDetectionStatus };
