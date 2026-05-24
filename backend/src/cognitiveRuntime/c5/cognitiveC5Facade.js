'use strict';

const c5 = require('../config/phaseC5FeatureFlags');
const { evaluateRuntimeIntegrity } = require('../integrity/runtimeIntegrityEngine');
const { measureCognitivePressure } = require('../pressure/cognitivePressureEngine');
const { analyzeInferentialFatigue } = require('../pressure/inferentialFatigueAnalyzer');
const { protectExecutiveAttention } = require('../pressure/executiveAttentionProtectionRuntime');
const { certifyRuntimeStability } = require('../stability/runtimeStabilityCertificationEngine');
const { detectRuntimeRegression } = require('../stability/runtimeRegressionDetector');
const { evaluateTenantCognitiveIsolation } = require('../isolation/tenantCognitiveIsolationRuntime');
const { validateTenantContextBoundary } = require('../isolation/tenantContextBoundaryValidator');
const { detectRuntimeDrift } = require('../drift/runtimeDriftDetectionEngine');
const { adviseDriftRollback } = require('../drift/driftRollbackAdvisor');
const { emitC5 } = require('./observability/cognitiveC5Observability');

function applyCognitiveC5Stability(user = {}, payload = {}, ctx = {}) {
  const anyEnabled =
    c5.isRuntimeIntegrityEnabled() ||
    c5.isPressureManagementEnabled() ||
    c5.isRuntimeStabilityEnabled() ||
    c5.isMultiTenantIsolationEnabled() ||
    c5.isDriftDetectionEnabled();

  if (!anyEnabled && !ctx.force_cognitive_c5) {
    return { payload, skipped: true, reason: 'cognitive_c5_off' };
  }

  const integrity = c5.isRuntimeIntegrityEnabled() ? evaluateRuntimeIntegrity(payload) : { integrity_safe: true, runtime_integrity_score: 0.7 };
  const pressure = c5.isPressureManagementEnabled() ? measureCognitivePressure(payload) : { pressure_safe: true };
  const fatigue = c5.isPressureManagementEnabled() ? analyzeInferentialFatigue(payload) : { fatigue_safe: true };
  const executiveProtection = c5.isPressureManagementEnabled() ? protectExecutiveAttention(payload, pressure, fatigue) : {};

  if (!pressure.pressure_safe) emitC5('COGNITIVE_PRESSURE_DETECTED', { tenant_id: user?.company_id, index: pressure.cognitive_pressure_index });
  if (executiveProtection.suppressed_low_value_insights?.length) {
    emitC5('EXECUTIVE_OVERLOAD_PROTECTED', { tenant_id: user?.company_id });
  }

  emitC5('RUNTIME_INTEGRITY_UPDATED', { tenant_id: user?.company_id, score: integrity.runtime_integrity_score });

  const stability = c5.isRuntimeStabilityEnabled()
    ? certifyRuntimeStability(payload, integrity, pressure)
    : { stability_certified: false };
  const regression = c5.isRuntimeStabilityEnabled()
    ? detectRuntimeRegression(user, payload, integrity)
    : { regression_detected: false, runtime_safe: true };

  if (stability.stability_certified) emitC5('STABILITY_CERTIFIED', { tenant_id: user?.company_id });
  if (regression.regression_detected) emitC5('RUNTIME_REGRESSION_DETECTED', { tenant_id: user?.company_id, severity: regression.regression_severity });

  const isolation = c5.isMultiTenantIsolationEnabled()
    ? evaluateTenantCognitiveIsolation(user, payload, ctx)
    : { isolation_safe: true };
  const boundary = c5.isMultiTenantIsolationEnabled()
    ? validateTenantContextBoundary(user, payload)
    : { tenant_context_safe: true };

  if (isolation.isolation_safe && boundary.tenant_context_safe) {
    emitC5('TENANT_ISOLATION_VALIDATED', { tenant_id: user?.company_id });
  }

  const drift = c5.isDriftDetectionEnabled() ? detectRuntimeDrift(user, payload) : { drift_detected: false };
  const rollbackAdvice = c5.isDriftDetectionEnabled() ? adviseDriftRollback(drift, regression, integrity) : { rollback_recommended: false };

  if (drift.drift_detected) emitC5('RUNTIME_DRIFT_DETECTED', { tenant_id: user?.company_id, severity: drift.drift_severity });
  if (rollbackAdvice.rollback_recommended) emitC5('DRIFT_ROLLBACK_RECOMMENDED', { tenant_id: user?.company_id });

  const runtime_integrity_runtime = { ...integrity, phase: 'C5' };
  const cognitive_pressure_runtime = { ...pressure, fatigue, executive_protection: executiveProtection };
  const runtime_stability_runtime = { ...stability, regression };
  const tenant_isolation_runtime = { ...isolation, boundary };
  const runtime_drift_runtime = { ...drift, rollback: rollbackAdvice };

  const cognitive_c5_summary = {
    phase: 'C5',
    runtime_integrity_score: integrity.runtime_integrity_score,
    integrity_safe: integrity.integrity_safe,
    cognitive_pressure_index: pressure.cognitive_pressure_index,
    pressure_safe: pressure.pressure_safe,
    stability_certified: stability.stability_certified,
    isolation_safe: isolation.isolation_safe && boundary.tenant_context_safe,
    drift_detected: drift.drift_detected,
    rollback_recommended: rollbackAdvice.rollback_recommended,
    enterprise_brain_reliable: integrity.integrity_safe && stability.stability_certified && isolation.isolation_safe,
    auto_remediation: false,
    auto_decisions: false,
    authoritative_global: false
  };

  const enriched = {
    ...payload,
    runtime_integrity_runtime,
    cognitive_pressure_runtime,
    runtime_stability_runtime,
    tenant_isolation_runtime,
    runtime_drift_runtime,
    cognitive_c5_summary
  };

  return {
    payload: enriched,
    runtime_integrity_runtime,
    cognitive_pressure_runtime,
    runtime_stability_runtime,
    tenant_isolation_runtime,
    runtime_drift_runtime,
    cognitive_c5_summary,
    report: { integrity, pressure, fatigue, executiveProtection, stability, regression, isolation, boundary, drift, rollbackAdvice }
  };
}

module.exports = { applyCognitiveC5Stability };
