'use strict';

/**
 * SEC-21B — Relatório de reconciliação (read-only).
 */

function buildReconciliationLists(analyzed) {
  const approvable = analyzed.filter((a) => a.eligibleForBaseline);
  const rejected = analyzed.filter((a) => a.shouldRevert);
  const pending = analyzed.filter((a) => !a.eligibleForBaseline && !a.shouldRevert);

  return {
    approvableChanges: approvable.map((a) => ({
      path: a.path,
      classification: a.classification,
      causingSec: a.causingSec,
      rationale: a.rationale
    })),
    rejectedChanges: rejected.map((a) => ({
      path: a.path,
      classification: a.classification,
      reason: a.rationale || a.pendingReason
    })),
    pendingChanges: pending.map((a) => ({
      path: a.path,
      classification: a.classification,
      pendingReason: a.pendingReason || 'Revisão manual necessária'
    }))
  };
}

function buildSynchronizationReport(analysis, decision) {
  const lists = buildReconciliationLists(analysis.analyzed);

  return {
    reportVersion: 'baseline_synchronization_report_v1',
    generatedAt: new Date().toISOString(),
    readOnly: true,
    integrityBefore: analysis.integrityBefore,
    integrityStatusBefore: analysis.integrityStatusBefore,
    integrityProjected: decision.integrityProjected,
    reconciliationDecision: decision.reconciliationDecision,
    manifest: {
      path: analysis.manifestComparison.manifestPath,
      entries: analysis.manifestComparison.manifestEntries,
      divergences: analysis.manifestComparison.divergenceCount,
      synchronized: analysis.manifestComparison.synchronizedCount
    },
    lists,
    divergences: analysis.analyzed,
    baselineUpdateCommand: decision.baselineUpdateCommand,
    disclaimer:
      'SEC-21B não actualiza manifest nem executa integrity-check — apenas documenta e decide reconciliação'
  };
}

module.exports = {
  buildReconciliationLists,
  buildSynchronizationReport
};
