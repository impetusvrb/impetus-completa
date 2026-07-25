'use strict';

const DECISIONS = Object.freeze({
  APPROVED: 'GO_LIVE_APPROVED',
  APPROVED_REMARKS: 'GO_LIVE_APPROVED_WITH_REMARKS',
  BLOCKED: 'GO_LIVE_BLOCKED',
  DENIED: 'GO_LIVE_DENIED'
});

const DRIFT_CLASSES = Object.freeze([
  'Expected Drift',
  'Configuration Drift',
  'Critical Drift',
  'Unknown Drift'
]);

function createGoLiveGateDto(input = {}) {
  return Object.freeze({
    reportVersion: 'go_live_gate_v1',
    overallStatus: input.overallStatus || 'PENDING',
    goLiveDecision: input.goLiveDecision || DECISIONS.BLOCKED,
    overallScore: Math.min(1, Math.max(0, Number(input.overallScore) || 0)),
    integrityScore: Number(input.integrityScore) || 0,
    baselineStatus: input.baselineStatus || 'UNKNOWN',
    runtimeStatus: input.runtimeStatus || 'UNKNOWN',
    securityStatus: input.securityStatus || 'UNKNOWN',
    operationalStatus: input.operationalStatus || 'UNKNOWN',
    warnings: Array.isArray(input.warnings) ? input.warnings.slice() : [],
    blockingIssues: Array.isArray(input.blockingIssues) ? input.blockingIssues.slice() : [],
    approvedModules: Array.isArray(input.approvedModules) ? input.approvedModules.slice() : [],
    failedModules: Array.isArray(input.failedModules) ? input.failedModules.slice() : [],
    nextRecommendedAction: input.nextRecommendedAction || '',
    approvalTimestamp: input.approvalTimestamp || null,
    observation: input.observation || null,
    criteria: input.criteria || {},
    validators: input.validators || {}
  });
}

module.exports = {
  DECISIONS,
  DRIFT_CLASSES,
  createGoLiveGateDto
};
