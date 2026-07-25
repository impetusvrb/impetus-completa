'use strict';

/**
 * SEC-21B — Orquestrador principal (100% consultivo).
 */

const flags = require('../config/securityBaselineSynchronizationFlags');
const driftAnalyzer = require('./driftAnalyzer');
const decisionEngine = require('./baselineDecisionEngine');
const reportBuilder = require('./baselineSynchronizationReport');
const store = require('../store/baselineSynchronizationStore');
const metrics = require('../metrics/baselineSynchronizationMetrics');

function runBaselineSynchronization() {
  const analysis = driftAnalyzer.analyzeDrifts();
  const integrityProjected = driftAnalyzer.projectIntegrityAfterSync(
    analysis.integrityBefore,
    analysis.analyzed,
    analysis.manifestComparison
  );
  const decision = decisionEngine.decide(analysis, integrityProjected);
  const report = reportBuilder.buildSynchronizationReport(analysis, decision);

  store.setLastEvaluation({ decision, analysis, report });
  metrics.recordEvaluation(decision.reconciliationDecision);

  return {
    ok: decision.reconciliationDecision === decisionEngine.DECISIONS.APPROVED,
    decision,
    analysis,
    report,
    evaluatedAt: new Date().toISOString(),
    readOnly: true,
    noRuntimeChanges: true,
    noManifestUpdate: true
  };
}

function getAuditPayload() {
  const last = store.getLastEvaluation();
  const payload = last || runBaselineSynchronization();

  return {
    ok: true,
    phase: 'SEC-21B',
    read_only: true,
    consultive_only: true,
    enabled: flags.isSecurityBaselineSynchronizationEnabled(),
    mode: 'BASELINE_SYNCHRONIZATION',
    no_runtime_changes: true,
    no_manifest_update: true,
    no_baseline_auto_apply: true,
    dashboard: payload.decision,
    report: payload.report,
    analysis: {
      integrityBefore: payload.analysis.integrityBefore,
      totalDivergences: payload.analysis.totalDivergences,
      hashDriftCount: payload.analysis.hashDriftCount
    },
    metrics: metrics.getSnapshot(),
    disclaimer:
      'SEC-21B — reconciliação baseline; não promove produção; não actualiza manifest automaticamente'
  };
}

module.exports = {
  runBaselineSynchronization,
  getAuditPayload
};
