'use strict';

/**
 * SEC-11 — Adaptive Protection Engine.
 * Consome SEC-01→10 — produz Protection Plan apenas.
 */

const flags = require('../config/securityAdaptiveProtectionFlags');
const metrics = require('../metrics/adaptiveProtectionMetrics');
const store = require('../store/adaptiveProtectionStore');
const { collectSecLayerData } = require('../collectors/secLayerCollector');
const profiles = require('./protectionProfileService');
const surface = require('./adaptiveSurfaceManager');
const antiScanner = require('./antiScannerService');
const runtimeShield = require('./runtimeShieldService');
const approval = require('./administratorApprovalService');
const recovery = require('./recoveryPlanner');
const {
  createProtectionPlanDto,
  createAdaptiveProtectionDashboardDto,
  freezeDto
} = require('../dto/adaptiveProtectionDto');

function buildTimeline(incidents, sec10Dashboard) {
  const events = [];
  for (const inc of incidents || []) {
    events.push({
      ts: inc.lastSeen || inc.firstSeen,
      type: 'INCIDENT',
      label: `${inc.severity} ${inc.classification}`,
      incidentId: inc.incidentId
    });
  }
  for (const e of sec10Dashboard?.timeline || []) {
    events.push({ ...e, source: 'SEC-10' });
  }
  return events.sort((a, b) => String(b.ts).localeCompare(String(a.ts))).slice(0, 50);
}

function evaluateProtection(opts = {}) {
  if (!flags.isSecurityAdaptiveProtectionEnabled() && !opts.force) return null;

  const start = Date.now();
  metrics.increment('evaluations');

  const data = collectSecLayerData();
  const openIncidents = data.sec02?.open || [];
  const integrity = data.sec04?.lastReport || {};
  const sec10Dashboard = data.sec10?.dashboard || null;
  const sec07 = data.sec07?.soc || null;

  const threatLevel = sec10Dashboard?.threatLevel || 'LOW';
  const securityMode = sec10Dashboard?.currentMode || 'NORMAL';
  const threatScore = sec10Dashboard?.metrics?.escalation?.compositeScore ?? 0;

  const shield = runtimeShield.computeRuntimeProtectionScore({
    openIncidents,
    integrityReport: integrity,
    sec07Score: sec07?.overallSecurityScore,
    threatLevel
  });
  metrics.setRuntimeScore(shield.runtime_protection_score);

  const recommendedProfile = profiles.recommendProfile(
    threatLevel,
    securityMode,
    shield.runtime_protection_score
  );
  metrics.increment('recommended_profiles');

  const currentProfile = store.getCurrentProfile();
  const profileDef = profiles.getProfile(recommendedProfile);

  const scannerPatterns = antiScanner.detectScannerPatterns(
    openIncidents,
    sec10Dashboard?.attackPatterns
  );
  metrics.increment('scanner_patterns', scannerPatterns.length);

  const antiScannerRecs = antiScanner.buildAntiScannerRecommendations(scannerPatterns);
  const surfacePlan = surface.buildSurfacePlan(
    profileDef,
    openIncidents,
    sec10Dashboard?.recommendations
  );

  const primaryIncident = openIncidents[0] || null;
  const primaryProfile = primaryIncident
    ? (data.sec03?.profiles || []).find((p) => p.incidentId === primaryIncident.incidentId)
    : null;

  const rollbackPlan = recovery.buildRollbackPlan(recommendedProfile);
  metrics.increment('rollback_plans');

  const recoveryPlan = recovery.buildRecoveryPlan({
    incidents: openIncidents,
    recommendedProfile,
    integrityReport: integrity,
    threatLevel
  });
  metrics.increment('recovery_plans');

  const postIncidentPlan = recovery.buildPostIncidentPlan(openIncidents);

  const protectionPlan = createProtectionPlanDto({
    incidentId: primaryIncident?.incidentId || null,
    currentProfile,
    recommendedProfile,
    surfacePlan,
    antiScannerRecommendations: antiScannerRecs,
    summary: `Protection plan — ${recommendedProfile} (threat ${threatLevel}, runtime score ${shield.runtime_protection_score.toFixed(2)})`,
    rollback: rollbackPlan,
    requiresApproval: flags.requireApproval()
  });
  metrics.increment('adaptive_protection_plans');
  store.addPlan(protectionPlan);

  let approvalRequest = null;
  if (flags.requireApproval() && recommendedProfile !== 'NORMAL') {
    approvalRequest = approval.createApprovalRequest(protectionPlan);
  }

  const protectionScore = Math.min(
    1,
    Math.max(0, shield.runtime_protection_score * 0.5 + (1 - threatScore) * 0.3 + (recommendedProfile === 'NORMAL' ? 0.2 : 0))
  );

  const dashboard = createAdaptiveProtectionDashboardDto({
    enabled: flags.isSecurityAdaptiveProtectionEnabled(),
    protection_mode: flags.protectionMode(),
    currentProtectionProfile: currentProfile,
    recommendedProfile,
    runtimeScore: shield.runtime_protection_score,
    threatScore,
    protectionScore,
    approvalStatus: {
      status: approvalRequest ? approvalRequest.status : 'NOT_REQUIRED',
      request: approvalRequest,
      canExecute: approval.canExecutePlan(approvalRequest)
    },
    protectionPlan,
    recoveryPlan,
    rollbackPlan,
    postIncidentPlan,
    timeline: buildTimeline(openIncidents, sec10Dashboard),
    scannerPatterns,
    modules_snapshot: {
      sec01: data.sec01?.enabled ?? false,
      sec02: data.sec02?.enabled ?? false,
      sec03: data.sec03?.enabled ?? false,
      sec04: data.sec04?.enabled ?? false,
      sec05: data.sec05?.enabled ?? false,
      sec06: data.sec06?.enabled ?? false,
      sec07: data.sec07?.enabled ?? false,
      sec10: data.sec10?.enabled ?? false,
      primaryThreatProfile: primaryProfile?.threatProfileId || null
    },
    metrics: { shield: shield.factors, ...metrics.getSnapshot() }
  });

  store.setCurrentProfile(recommendedProfile);
  store.setLastEvaluation({
    at: new Date().toISOString(),
    recommendedProfile,
    threatLevel,
    runtimeScore: shield.runtime_protection_score
  });
  store.setLastDashboard(dashboard);
  metrics.recordEvaluationTime(Date.now() - start);

  return freezeDto(dashboard);
}

module.exports = { evaluateProtection, buildTimeline };
