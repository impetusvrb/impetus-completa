'use strict';

const DECISIONS = Object.freeze({
  APPROVED: 'BASELINE_SYNCHRONIZATION_APPROVED',
  DENIED: 'BASELINE_SYNCHRONIZATION_DENIED'
});

const CLASSIFICATIONS = Object.freeze([
  'CERTIFIED_EVOLUTION',
  'EXPECTED_OPERATIONAL_CHANGE',
  'EXPECTED_SECURITY_CHANGE',
  'UNEXPECTED_MODIFICATION',
  'UNKNOWN_CHANGE',
  'CRITICAL_INVESTIGATION_REQUIRED'
]);

function createBaselineSynchronizationDto(input = {}) {
  return Object.freeze({
    reportVersion: 'baseline_synchronization_v1',
    synchronizationStatus: input.synchronizationStatus || 'PENDING',
    reconciliationDecision: input.reconciliationDecision || DECISIONS.DENIED,
    integrityBefore: Number(input.integrityBefore) || 0,
    integrityProjected: Number(input.integrityProjected) || 0,
    certifiedChanges: Array.isArray(input.certifiedChanges) ? input.certifiedChanges.slice() : [],
    rejectedChanges: Array.isArray(input.rejectedChanges) ? input.rejectedChanges.slice() : [],
    pendingChanges: Array.isArray(input.pendingChanges) ? input.pendingChanges.slice() : [],
    filesEligibleForBaseline: Array.isArray(input.filesEligibleForBaseline)
      ? input.filesEligibleForBaseline.slice()
      : [],
    filesRejected: Array.isArray(input.filesRejected) ? input.filesRejected.slice() : [],
    nextAction: input.nextAction || '',
    criteria: input.criteria || {},
    divergences: Array.isArray(input.divergences) ? input.divergences.slice() : [],
    baselineUpdateCommand: input.baselineUpdateCommand || null,
    evaluatedAt: input.evaluatedAt || new Date().toISOString(),
    readOnly: true,
    noRuntimeChanges: true
  });
}

module.exports = {
  DECISIONS,
  CLASSIFICATIONS,
  createBaselineSynchronizationDto
};
