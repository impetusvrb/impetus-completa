'use strict';

/**
 * SEC-06 — Assist executor (acções reversíveis apenas).
 */

const path = require('path');
const fs = require('fs');
const metrics = require('../metrics/responseMetrics');

/** Estado reversível em memória */
const assistState = {
  elevatedLog: false,
  previousLogLevel: null,
  snapshots: new Map(),
  internalIncidents: []
};

function getEvidenceDir() {
  const dir = path.resolve(__dirname, '../../../docs/evidence/sec-06-snapshots');
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (_e) {}
  return dir;
}

async function executeAssistAction(actionId, context) {
  const started = Date.now();
  metrics.increment('assist_actions');

  switch (actionId) {
    case 'EVIDENCE_SNAPSHOT':
      return snapshotEvidence(context);
    case 'ELEVATE_LOG_LEVEL':
      return elevateLogLevel();
    case 'PRESERVE_EVIDENCE':
      return preserveEvidence(context);
    case 'FORCE_METRICS_COLLECT':
      return forceMetricsCollect();
    case 'RUN_INTEGRITY_CHECK':
      return runIntegrityCheck();
    case 'RUN_CORRELATION':
      return runCorrelation();
    case 'RUN_THREAT_INTEL':
      return runThreatIntel();
    case 'CONSOLIDATED_REPORT':
      return buildConsolidatedReport(context);
    case 'OPEN_INTERNAL_INCIDENT':
      return openInternalIncident(context);
    default:
      return { actionId, status: 'blocked', reason: 'unknown_action' };
  }
}

function snapshotEvidence(context) {
  const id = `snap-${Date.now()}`;
  const payload = {
    id,
    at: new Date().toISOString(),
    incident: context.incident || null,
    threatProfile: context.threatProfile || null,
    integrityReport: context.integrityReport || null,
    notification: context.notification
      ? { notificationId: context.notification.notificationId, severity: context.notification.severity }
      : null
  };
  assistState.snapshots.set(id, payload);

  try {
    const file = path.join(getEvidenceDir(), `${id}.json`);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  } catch (_e) {}

  return { actionId: 'EVIDENCE_SNAPSHOT', status: 'completed', snapshotId: id, reversible: true };
}

function elevateLogLevel() {
  assistState.previousLogLevel = process.env.LOG_LEVEL || 'info';
  assistState.elevatedLog = true;
  process.env.SEC06_ELEVATED_LOG = 'true';
  return {
    actionId: 'ELEVATE_LOG_LEVEL',
    status: 'completed',
    from: assistState.previousLogLevel,
    to: 'debug',
    reversible: true
  };
}

function preserveEvidence(context) {
  const refs = (context.incident?.evidence || []).map((e) => ({ ...e }));
  return {
    actionId: 'PRESERVE_EVIDENCE',
    status: 'completed',
    preservedCount: refs.length,
    refs,
    reversible: true
  };
}

function forceMetricsCollect() {
  const collected = {};
  try {
    collected.sec01 = require('../../securityObservatory/metrics/securityMetricsStore').getSnapshot?.() || {};
  } catch (_e) {}
  try {
    collected.sec02 = require('../../securityCorrelation/metrics/correlationMetrics').getSnapshot();
  } catch (_e) {}
  try {
    collected.sec03 = require('../../securityThreatIntelligence/metrics/threatIntelligenceMetrics').getSnapshot();
  } catch (_e) {}
  try {
    collected.sec04 = require('../../securityRuntimeIntegrity/metrics/integrityMetrics').getSnapshot();
  } catch (_e) {}
  try {
    collected.sec05 = require('../../securityNotification/metrics/notificationMetrics').getSnapshot();
  } catch (_e) {}
  return { actionId: 'FORCE_METRICS_COLLECT', status: 'completed', metrics: collected, reversible: true };
}

function runIntegrityCheck() {
  try {
    const sec04 = require('../../securityRuntimeIntegrity');
    const report = sec04.runIntegrityCheck({ force: true });
    return { actionId: 'RUN_INTEGRITY_CHECK', status: 'completed', integrityStatus: report?.integrityStatus, reversible: true };
  } catch (e) {
    return { actionId: 'RUN_INTEGRITY_CHECK', status: 'failed', error: e?.message, reversible: true };
  }
}

function runCorrelation() {
  try {
    const sec02 = require('../../securityCorrelation');
    const incidents = sec02.store.getAllIncidents();
    return { actionId: 'RUN_CORRELATION', status: 'completed', incidentCount: incidents.length, reversible: true };
  } catch (e) {
    return { actionId: 'RUN_CORRELATION', status: 'failed', error: e?.message, reversible: true };
  }
}

function runThreatIntel() {
  try {
    const sec03 = require('../../securityThreatIntelligence');
    const profiles = sec03.analyzeAllIncidents();
    return { actionId: 'RUN_THREAT_INTEL', status: 'completed', profileCount: profiles.length, reversible: true };
  } catch (e) {
    return { actionId: 'RUN_THREAT_INTEL', status: 'failed', error: e?.message, reversible: true };
  }
}

function buildConsolidatedReport(context) {
  const report = {
    generated_at: new Date().toISOString(),
    incident: context.incident
      ? { id: context.incident.incidentId, severity: context.incident.severity, classification: context.incident.classification }
      : null,
    threat: context.threatProfile ? { assessment: context.threatProfile.primaryAssessment, confidence: context.threatProfile.confidence } : null,
    integrity: context.integrityReport
      ? { status: context.integrityReport.integrityStatus, score: context.integrityReport.integrityScore }
      : null,
    notification: context.notification ? { id: context.notification.notificationId, severity: context.notification.severity } : null
  };
  return { actionId: 'CONSOLIDATED_REPORT', status: 'completed', report, reversible: true };
}

function openInternalIncident(context) {
  const inc = {
    internalId: `int-${Date.now()}`,
    openedAt: new Date().toISOString(),
    sourceIncidentId: context.incident?.incidentId || null,
    status: 'open',
    owner: 'security'
  };
  assistState.internalIncidents.push(inc);
  return { actionId: 'OPEN_INTERNAL_INCIDENT', status: 'completed', internalIncident: inc, reversible: true };
}

function rollbackAssistActions(executedActions) {
  const steps = [];
  for (const action of executedActions || []) {
    if (action.actionId === 'ELEVATE_LOG_LEVEL' && assistState.elevatedLog) {
      delete process.env.SEC06_ELEVATED_LOG;
      assistState.elevatedLog = false;
      steps.push({ action: 'ELEVATE_LOG_LEVEL', rolled_back: true });
    }
    if (action.actionId === 'EVIDENCE_SNAPSHOT' && action.snapshotId) {
      assistState.snapshots.delete(action.snapshotId);
      steps.push({ action: 'EVIDENCE_SNAPSHOT', rolled_back: true, snapshotId: action.snapshotId });
    }
  }
  if (assistState.internalIncidents.length > 0) {
    assistState.internalIncidents.length = 0;
    steps.push({ action: 'OPEN_INTERNAL_INCIDENT', rolled_back: true });
  }
  metrics.increment('responses_cancelled');
  return steps;
}

function resetAssistStateForTests() {
  assistState.elevatedLog = false;
  assistState.previousLogLevel = null;
  assistState.snapshots.clear();
  assistState.internalIncidents.length = 0;
  delete process.env.SEC06_ELEVATED_LOG;
}

module.exports = {
  executeAssistAction,
  rollbackAssistActions,
  resetAssistStateForTests,
  assistState
};
