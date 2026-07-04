'use strict';

/**
 * SEC-07 — Overall Security Score (determinístico 0.0→1.0).
 */

function computeOverallSecurityScore(data) {
  const weights = {
    integrity: 0.3,
    threat: 0.25,
    incidents: 0.2,
    baseline: 0.15,
    response: 0.1
  };

  const integrityScore = data.sec04?.lastReport?.integrityScore ?? 1;
  const threatScore = computeThreatScore(data);
  const incidentScore = computeIncidentScore(data);
  const baselineScore = computeBaselineScore(data);
  const responseScore = computeResponseScore(data);

  const total =
    integrityScore * weights.integrity +
    threatScore * weights.threat +
    incidentScore * weights.incidents +
    baselineScore * weights.baseline +
    responseScore * weights.response;

  return Math.round(total * 1000) / 1000;
}

function computeThreatScore(data) {
  const profiles = data.sec03?.profiles || [];
  if (profiles.length === 0) return 1;

  const critical = profiles.filter((p) => p.riskLevel === 'Critical' || p.primaryAssessment?.includes('SCANNER')).length;
  const high = profiles.filter((p) => p.riskLevel === 'High').length;

  if (critical > 0) return Math.max(0, 0.4 - critical * 0.1);
  if (high > 0) return Math.max(0.5, 0.7 - high * 0.05);
  return 0.85;
}

function computeIncidentScore(data) {
  const open = data.sec02?.open || [];
  if (open.length === 0) return 1;

  const critical = open.filter((i) => i.severity === 'CRITICAL').length;
  const high = open.filter((i) => i.severity === 'HIGH').length;

  if (critical > 0) return Math.max(0.2, 0.5 - critical * 0.15);
  if (high > 0) return Math.max(0.5, 0.75 - high * 0.1);
  return Math.max(0.6, 1 - open.length * 0.05);
}

function computeBaselineScore(data) {
  const compliance = data.sec04?.lastReport?.hashValidation;
  if (!compliance) return 0.8;
  if (compliance.passed) return 1;
  const total = compliance.total || 1;
  const matched = compliance.matched || 0;
  return Math.round((matched / total) * 1000) / 1000;
}

function computeResponseScore(data) {
  const pending = data.sec05?.pending?.length || 0;
  const criticalPending = (data.sec05?.pending || []).filter((n) => n.severity === 'CRITICAL').length;
  if (criticalPending > 0) return 0.5;
  if (pending > 0) return 0.75;
  return 1;
}

function resolveThreatLevel(data) {
  const open = data.sec02?.open || [];
  const integrity = data.sec04?.lastReport?.integrityStatus;
  const profiles = data.sec03?.profiles || [];

  if (integrity === 'COMPROMISED') return 'CRITICAL';
  if (open.some((i) => i.severity === 'CRITICAL')) return 'CRITICAL';
  if (profiles.some((p) => p.riskLevel === 'Critical')) return 'CRITICAL';
  if (open.some((i) => i.severity === 'HIGH') || integrity === 'DEGRADED') return 'HIGH';
  if (open.length > 0) return 'MODERATE';
  if (profiles.length > 0) return 'LOW';
  return 'NONE';
}

function resolveSocStatus(score, threatLevel, integrityStatus) {
  if (integrityStatus === 'COMPROMISED' || threatLevel === 'CRITICAL') return 'CRITICAL';
  if (integrityStatus === 'DEGRADED' || threatLevel === 'HIGH' || score < 0.6) return 'DEGRADED';
  if (threatLevel === 'MODERATE' || score < 0.85) return 'ELEVATED';
  if (score >= 0.9 && threatLevel === 'NONE') return 'SECURE';
  return 'UNKNOWN';
}

function buildGlobalIndicators(data, overallScore, threatLevel) {
  const open = data.sec02?.open || [];
  const pending = data.sec05?.pending || [];
  const integrity = data.sec04?.lastReport;

  return {
    overall_security_score: overallScore,
    threat_level: threatLevel,
    integrity_score: integrity?.integrityScore ?? null,
    incident_load: open.length,
    notification_load: pending.length,
    response_readiness: data.sec06?.enabled ? 'ready' : 'observe_only',
    baseline_compliance: integrity?.hashValidation?.passed ?? null,
    runtime_health: integrity?.runtimeValidation?.passed ?? null
  };
}

module.exports = {
  computeOverallSecurityScore,
  resolveThreatLevel,
  resolveSocStatus,
  buildGlobalIndicators
};
