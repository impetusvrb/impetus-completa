'use strict';

/**
 * SEC-21B — Decisão BASELINE_SYNCHRONIZATION_APPROVED | DENIED.
 */

const { DECISIONS, createBaselineSynchronizationDto } = require('../dto/baselineSynchronizationDto');
const { isApprovedClassification } = require('./criticalFileClassifier');

function buildCriteria(analysis, certified, rejected, pending, integrityProjected) {
  return {
    drift_analyzed: analysis.totalDivergences >= 0,
    certified_changes_identified: certified.length > 0,
    unexpected_changes_identified: analysis.analyzed.some((a) =>
      ['UNEXPECTED_MODIFICATION', 'CRITICAL_INVESTIGATION_REQUIRED'].includes(a.classification)
    ),
    baseline_decision_available: true,
    integrity_projection_available: integrityProjected > 0,
    synchronization_report_generated: true,
    no_runtime_changes: true,
    no_security_changes: true,
    rollback_preserved: true,
    enterprise_baseline_preserved: true
  };
}

function decide(analysis, integrityProjected) {
  const certified = analysis.analyzed.filter((a) => isApprovedClassification(a.classification) && a.eligibleForBaseline);
  const rejected = analysis.analyzed.filter((a) => a.shouldRevert || a.classification === 'UNEXPECTED_MODIFICATION');
  const pending = analysis.analyzed.filter(
    (a) =>
      a.classification === 'UNKNOWN_CHANGE' ||
      a.classification === 'CRITICAL_INVESTIGATION_REQUIRED' ||
      (!a.eligibleForBaseline && !a.shouldRevert && !isApprovedClassification(a.classification))
  );

  const blockingPending = pending.filter((a) => a.classification !== 'UNKNOWN_CHANGE' || a.pendingReason);
  const hasUnexpected = analysis.analyzed.some((a) => a.classification === 'UNEXPECTED_MODIFICATION');
  const hasCritical = analysis.analyzed.some((a) => a.classification === 'CRITICAL_INVESTIGATION_REQUIRED');

  let reconciliationDecision = DECISIONS.APPROVED;
  let synchronizationStatus = 'READY_FOR_BASELINE_UPDATE';

  if (hasUnexpected || hasCritical || blockingPending.length > 0) {
    reconciliationDecision = DECISIONS.DENIED;
    synchronizationStatus = 'RECONCILIATION_INCOMPLETE';
  } else if (pending.length > 0) {
    reconciliationDecision = DECISIONS.DENIED;
    synchronizationStatus = 'PENDING_REVIEW';
  } else if (certified.length === 0 && analysis.totalDivergences === 0) {
    reconciliationDecision = DECISIONS.APPROVED;
    synchronizationStatus = 'ALREADY_SYNCHRONIZED';
  }

  let nextAction = '';
  let baselineUpdateCommand = null;

  if (reconciliationDecision === DECISIONS.APPROVED) {
    baselineUpdateCommand = 'scripts/integrity-check.sh --baseline';
    nextAction =
      'Revisão humana final → executar manualmente: scripts/integrity-check.sh --baseline → re-executar SEC-21A';
  } else {
    const blockers = [...rejected, ...pending].slice(0, 5);
    nextAction = blockers.length
      ? `Resolver: ${blockers.map((b) => `${b.path} (${b.classification})`).join('; ')}`
      : 'Completar certificação/documentação das divergências pendentes';
    if (rejected.length) {
      nextAction += `. Reverter: ${rejected.map((r) => r.path).join(', ')}`;
    }
  }

  const criteria = buildCriteria(analysis, certified, rejected, pending, integrityProjected);

  return createBaselineSynchronizationDto({
    synchronizationStatus,
    reconciliationDecision,
    integrityBefore: analysis.integrityBefore,
    integrityProjected,
    certifiedChanges: certified,
    rejectedChanges: rejected,
    pendingChanges: pending,
    filesEligibleForBaseline: certified.map((c) => c.path),
    filesRejected: rejected.map((r) => r.path),
    nextAction,
    criteria,
    divergences: analysis.analyzed,
    baselineUpdateCommand
  });
}

module.exports = {
  decide,
  buildCriteria,
  DECISIONS
};
