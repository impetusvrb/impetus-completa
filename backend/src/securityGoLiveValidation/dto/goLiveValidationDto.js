'use strict';

const DECISIONS = Object.freeze({
  APPROVED: 'GO_LIVE_APPROVED',
  APPROVED_REMARKS: 'GO_LIVE_APPROVED_WITH_REMARKS',
  DENIED: 'GO_LIVE_DENIED'
});

const GUARD_STATUS = Object.freeze({
  NOT_RUN: 'NOT_RUN',
  SUCCESS: 'GO_LIVE_GUARD_SUCCESS',
  FAILED: 'GO_LIVE_GUARD_FAILED',
  IN_PROGRESS: 'GO_LIVE_GUARD_IN_PROGRESS'
});

function createGoLiveValidationDto(input = {}) {
  return Object.freeze({
    reportVersion: 'go_live_validation_v1',
    goLiveDecision: input.goLiveDecision || DECISIONS.DENIED,
    productionReadinessScore: Math.min(1, Math.max(0, Number(input.productionReadinessScore) || 0)),
    integrityScore: Number(input.integrityScore) || 0,
    runtimeHealth: input.runtimeHealth || 'UNKNOWN',
    endpointHealth: input.endpointHealth || 'UNKNOWN',
    rollbackReady: input.rollbackReady === true,
    infrastructureReady: input.infrastructureReady === true,
    securityReady: input.securityReady === true,
    goLiveGuardStatus: input.goLiveGuardStatus || GUARD_STATUS.NOT_RUN,
    recommendedNextAction: input.recommendedNextAction || '',
    activationPlan: input.activationPlan || null,
    blockingFindings: Array.isArray(input.blockingFindings) ? input.blockingFindings.slice() : [],
    warnings: Array.isArray(input.warnings) ? input.warnings.slice() : [],
    criteria: input.criteria || {},
    validators: input.validators || {},
    goLiveGuard: input.goLiveGuard || null,
    approvalTimestamp:
      input.goLiveDecision === DECISIONS.APPROVED || input.goLiveDecision === DECISIONS.APPROVED_REMARKS
        ? new Date().toISOString()
        : null,
    evaluatedAt: input.evaluatedAt || new Date().toISOString(),
    readOnly: true,
    noRuntimeChanges: true
  });
}

module.exports = {
  DECISIONS,
  GUARD_STATUS,
  createGoLiveValidationDto
};
