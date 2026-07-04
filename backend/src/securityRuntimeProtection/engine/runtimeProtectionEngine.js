'use strict';

/**
 * SEC-18 — Runtime Protection Engine.
 * Consome SEC-02→SEC-17 read-only; nunca executa protecções.
 */

const flags = require('../config/securityRuntimeProtectionFlags');
const metrics = require('../metrics/runtimeProtectionMetrics');
const store = require('../store/runtimeProtectionStore');
const collector = require('../collectors/secRuntimeProtectionCollector');
const profiles = require('./protectionProfileManager');
const riskEngine = require('./runtimeRiskAssessment');
const planner = require('./adaptiveProtectionPlanner');
const safety = require('./runtimeSafetyValidator');
const approval = require('./runtimeApprovalCoordinator');
const { createRuntimeProtectionDashboardDto, freezeDto } = require('../dto/runtimeProtectionDto');

function getIncidents(context) {
  const open = context?.sec02?.open || [];
  const closed = context?.sec02?.closed || [];
  return [...open, ...closed];
}

function resolveProtectionStatus(recommendedProfile, risk) {
  if (recommendedProfile === 'LOCKDOWN_READY') return 'LOCKDOWN_READY_PLANNED';
  if (recommendedProfile === 'HARDENED') return 'HARDENED_PLANNED';
  if (recommendedProfile === 'PROTECTED') return 'PROTECTED_PLANNED';
  if (recommendedProfile === 'ELEVATED') return 'ELEVATED';
  if (recommendedProfile === 'OBSERVE') return 'OBSERVING';
  return 'NORMAL';
}

function evaluateRuntimeProtection(opts = {}) {
  const start = Date.now();
  const enabled = flags.isSecurityRuntimeProtectionEnabled();
  const context = collector.collectRuntimeProtectionContext();
  const incidents = getIncidents(context);
  const currentProfile = store.getCurrentProfile();

  const riskAssessment = riskEngine.assessRuntimeRisk(context, incidents);
  const recommendedProfile = profiles.resolveRecommendedProfile(
    riskAssessment,
    flags.requireApproval()
  );
  profiles.recordProfileDecision(currentProfile, recommendedProfile);

  const protectionPlans = planner.generateProtectionPlans(recommendedProfile, riskAssessment);
  const safetyCheck = safety.validateSafety(recommendedProfile, riskAssessment, protectionPlans);

  const approvalRequest = recommendedProfile !== 'NORMAL' && flags.requireApproval()
    ? approval.createApprovalRequest(recommendedProfile, riskAssessment, protectionPlans)
    : null;
  const approvalStatus = approval.resolveApprovalStatus(approvalRequest);

  const protectionStatus = resolveProtectionStatus(recommendedProfile, riskAssessment);

  const dashboard = freezeDto(createRuntimeProtectionDashboardDto({
    enabled,
    mode: flags.runtimeProtectionMode(),
    protectionStatus,
    currentProfile,
    recommendedProfile,
    runtimeRiskScore: riskAssessment.runtimeRiskScore,
    protectionUrgency: riskAssessment.protectionUrgency,
    approvalStatus,
    rollbackAvailable: safetyCheck.rollbackPossible,
    executionEligible: false,
    recommendedActions: protectionPlans.map((p) => ({
      action: p.action,
      reason: p.planReason,
      priority: p.priority,
      auto_execute: false
    })),
    riskAssessment,
    safetyCheck,
    protectionPlans: protectionPlans.slice(0, 20),
    profiles: profiles.getAllProfiles(),
    modules_snapshot: {
      sec02: { enabled: context.sec02?.enabled, incidents: incidents.length },
      sec04: { enabled: context.sec04?.enabled },
      sec10: { enabled: context.sec10?.enabled },
      sec11: { enabled: context.sec11?.enabled },
      sec12: { enabled: context.sec12?.enabled },
      sec13: { enabled: context.sec13?.enabled },
      sec14: { enabled: context.sec14?.enabled },
      sec15: { enabled: context.sec15?.enabled },
      sec16: { enabled: context.sec16?.enabled },
      sec17: { enabled: context.sec17?.enabled }
    },
    metrics: metrics.getSnapshot()
  }));

  store.setLastDashboard(dashboard);
  metrics.increment('evaluations');
  metrics.recordEvaluationTime(Date.now() - start);

  return dashboard;
}

module.exports = { evaluateRuntimeProtection, getIncidents, resolveProtectionStatus };
