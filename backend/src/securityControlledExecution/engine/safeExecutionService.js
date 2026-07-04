'use strict';

/**
 * SEC-13 — Safe Execution Service.
 * Executa apenas acções AUTO_EXECUTABLE de baixo risco.
 */

const journal = require('./executionJournalService');
const metrics = require('../metrics/controlledExecutionMetrics');

function safeRequire(getter) {
  try {
    return getter();
  } catch (_e) {
    return null;
  }
}

function executeIncreaseLogLevel() {
  const previous = journal.getSecurityLogLevel();
  journal.setSecurityLogLevel('debug');
  return {
    ok: true,
    result: { previous, current: 'debug', scope: 'security_modules_only' },
    rollback: { action: 'restore_log_level', previous }
  };
}

function executeGenerateSnapshot() {
  const snapshot = {
    sec01: safeRequire(() => require('../../securityObservatory').getAuditPayload?.()),
    sec02: safeRequire(() => require('../../securityCorrelation').getAuditPayload?.()),
    sec04: safeRequire(() => require('../../securityRuntimeIntegrity').getAuditPayload?.()),
    sec10: safeRequire(() => require('../../securityActiveDefense').getAuditPayload?.()),
    sec11: safeRequire(() => require('../../securityAdaptiveProtection').getAuditPayload?.()),
    sec12: safeRequire(() => require('../../securityExecutionValidation').getAuditPayload?.()),
    capturedAt: new Date().toISOString()
  };
  return {
    ok: true,
    result: { snapshotId: `snap-${Date.now()}`, modules: Object.keys(snapshot).filter((k) => k.startsWith('sec')) },
    rollback: { action: 'discard_snapshot', snapshotId: `snap-${Date.now()}` },
    evidence: snapshot
  };
}

function executeAmplifiedEvidence() {
  const evidence = {
    sec01: safeRequire(() => require('../../securityObservatory').buildDashboard?.()),
    sec02: safeRequire(() => require('../../securityCorrelation').buildDashboard?.()),
    sec05: safeRequire(() => require('../../securityNotification').getAuditPayload?.())
  };
  return {
    ok: true,
    result: { collected: Object.keys(evidence).length },
    rollback: { action: 'none_required' },
    evidence
  };
}

function executeTriggerCorrelation() {
  const sec02 = safeRequire(() => require('../../securityCorrelation'));
  if (!sec02?.isEnabled?.()) {
    return { ok: true, skipped: true, reason: 'SEC-02 disabled', rollback: { action: 'none' } };
  }
  const audit = sec02.getAuditPayload?.();
  const dashboard = sec02.buildDashboard?.();
  return {
    ok: true,
    result: { refreshed: true, openIncidents: audit?.openIncidents ?? dashboard?.openIncidents ?? 0 },
    rollback: { action: 'none_required' }
  };
}

function executeTriggerIntegrity() {
  const sec04 = safeRequire(() => require('../../securityRuntimeIntegrity'));
  if (!sec04?.isEnabled?.()) {
    return { ok: true, skipped: true, reason: 'SEC-04 disabled', rollback: { action: 'none' } };
  }
  let report = null;
  try {
    report = sec04.runIntegrityCheck?.({ force: true });
  } catch (_e) {
    report = sec04.getAuditPayload?.();
  }
  return {
    ok: true,
    result: {
      status: report?.integrityStatus || report?.lastReport?.integrityStatus || 'CHECKED'
    },
    rollback: { action: 'none_required' }
  };
}

function executeConsolidatedReport(context) {
  const report = {
    generatedAt: new Date().toISOString(),
    sec11_profile: context.sec11?.dashboard?.recommendedProfile,
    sec12_readiness: context.sec12?.dashboard?.execution_readiness_score,
    threatScore: context.sec11?.dashboard?.threatScore,
    internalIncidents: journal.getInternalIncidents().length
  };
  return {
    ok: true,
    result: report,
    rollback: { action: 'discard_report' }
  };
}

function executeOpenInternalIncident(context) {
  const sec11 = context.sec11?.dashboard;
  const inc = journal.addInternalIncident({
    title: `SEC-13 internal — ${sec11?.recommendedProfile || 'MONITORING'}`,
    severity: sec11?.protectionPlan?.incidentId ? 'HIGH' : 'MEDIUM',
    linkedIncidentId: sec11?.protectionPlan?.incidentId || null,
    status: 'OPEN'
  });
  return {
    ok: true,
    result: { internalIncidentId: inc.internalIncidentId },
    rollback: { action: 'close_internal_incident', internalIncidentId: inc.internalIncidentId }
  };
}

const HANDLERS = {
  increase_log_level: executeIncreaseLogLevel,
  generate_snapshot: executeGenerateSnapshot,
  amplified_evidence_collection: executeAmplifiedEvidence,
  trigger_correlation_sec02: executeTriggerCorrelation,
  trigger_integrity_sec04: executeTriggerIntegrity,
  consolidated_report: executeConsolidatedReport,
  open_internal_incident: executeOpenInternalIncident
};

function executeAction(actionId, context = {}) {
  const start = Date.now();
  const handler = HANDLERS[actionId];
  if (!handler) {
    metrics.increment('execution_failures');
    return {
      ok: false,
      actionId,
      error: 'unknown_auto_action',
      durationMs: Date.now() - start
    };
  }

  try {
    const outcome = handler(context);
    const durationMs = Date.now() - start;
    metrics.increment('automatic_actions');
    metrics.recordDuration(durationMs);
    return {
      executionId: `exec-${Date.now()}`,
      actionId,
      operator: 'system',
      timestamp: new Date().toISOString(),
      durationMs,
      ...outcome
    };
  } catch (e) {
    metrics.increment('execution_failures');
    return {
      ok: false,
      actionId,
      error: e?.message || 'execution_failed',
      durationMs: Date.now() - start
    };
  }
}

module.exports = { executeAction, HANDLERS };
