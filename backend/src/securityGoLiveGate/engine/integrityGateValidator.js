'use strict';

/**
 * SEC-21A — Integrity gate (SEC-04 consumer, read-only).
 */

const flags = require('../config/securityGoLiveGateFlags');

function classifyDrift(report, dashboard) {
  const hash = report?.hashValidation || {};
  const missing = hash.missing || 0;
  const drift = hash.drift || 0;
  const fsFindings = report?.filesystemValidation?.findings || [];
  const criticalFs = fsFindings.filter((f) => f.severity === 'CRITICAL');

  if (missing > 0 && (hash.missingPaths || []).some((p) => /server\.js|ecosystem|nginx/.test(p))) {
    return { classification: 'Critical Drift', blocking: true, reason: 'Ficheiros críticos em falta' };
  }
  if (criticalFs.length > 0) {
    return { classification: 'Critical Drift', blocking: true, reason: 'Filesystem CRITICAL findings' };
  }
  if (process.env.SEC04_SKIP_GIT_CHECK === 'true' && drift > 0) {
    return {
      classification: 'Expected Drift',
      blocking: false,
      reason: 'SEC04_SKIP_GIT_CHECK activo — drift de desenvolvimento esperado'
    };
  }
  if (drift > 0 || (dashboard?.critical_files?.drift || 0) > 0) {
    return {
      classification: 'Configuration Drift',
      blocking: true,
      reason: `Hash drift (${drift}) ou config alterada vs baseline`
    };
  }
  if (report?.integrityStatus === 'COMPROMISED') {
    return { classification: 'Unknown Drift', blocking: true, reason: 'Status COMPROMISED sem causa clara' };
  }
  return { classification: 'Expected Drift', blocking: false, reason: 'Sem drift crítico detectado' };
}

function validateIntegrityGate() {
  const threshold = flags.integrityThreshold();
  let score = 0;
  let status = 'UNKNOWN';
  let report = null;
  let dashboard = null;
  let enabled = false;

  try {
    const sec04 = require('../../securityRuntimeIntegrity');
    enabled = sec04.isEnabled?.() ?? false;
    if (enabled) {
      dashboard = sec04.buildDashboard?.() || sec04.getAuditPayload?.()?.dashboard;
      report = sec04.getAuditPayload?.()?.last_report;
      score = dashboard?.integrity_score ?? report?.integrityScore ?? 0;
      status = dashboard?.integrity_status ?? report?.integrityStatus ?? 'UNKNOWN';
    } else {
      try {
        const sec04Mod = require('../../securityRuntimeIntegrity');
        const eng = sec04Mod.engine || require('../../securityRuntimeIntegrity/engine/integrityEngine');
        const freshReport = eng.runIntegrityCheck?.({ force: true });
        if (freshReport) {
          report = freshReport;
          score = freshReport.integrityScore ?? 0;
          status = freshReport.integrityStatus ?? 'UNKNOWN';
          dashboard = sec04Mod.buildDashboard?.() || null;
          if (!dashboard?.integrity_score && score) {
            dashboard = { integrity_score: score, integrity_status: status };
          }
        } else {
          const last = sec04Mod.store?.getLastReport?.();
          if (last) {
            report = last;
            score = last.integrityScore ?? 0;
            status = last.integrityStatus ?? 'UNKNOWN';
          }
        }
      } catch (_inner) {
        score = 0;
      }
    }
  } catch (e) {
    return {
      ok: false,
      integrityScore: 0,
      threshold,
      status: 'ERROR',
      error: e.message,
      blocking: true,
      drift: { classification: 'Unknown Drift', blocking: true, reason: e.message }
    };
  }

  const drift = classifyDrift(report, dashboard);
  const aboveThreshold = score >= threshold;
  const ok = aboveThreshold && !drift.blocking;

  return {
    ok,
    integrityScore: score,
    threshold,
    status,
    aboveThreshold,
    drift,
    enabled,
    blocking: !aboveThreshold || drift.blocking,
    findings: {
      missing: report?.hashValidation?.missing || 0,
      drift: report?.hashValidation?.drift || 0,
      filesystem: (report?.filesystemValidation?.findings || []).length
    }
  };
}

module.exports = { validateIntegrityGate, classifyDrift };
