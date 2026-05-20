'use strict';

/**
 * Matriz de cobertura de governança — canais E→J.
 */

const CHANNELS = [
  { id: 'dashboard', phase: 'E', flag: 'IMPETUS_COGNITIVE_POLICY_ENGINE', module: 'policyEngine/unifiedExposureResolver' },
  { id: 'kpi', phase: 'F', flag: 'IMPETUS_KPI_GOVERNANCE', module: 'policyEngine/channels/secureKpiExposureResolver' },
  { id: 'summary', phase: 'F', flag: 'IMPETUS_SUMMARY_GOVERNANCE', module: 'policyEngine/channels/summaryExposureSanitizer' },
  { id: 'chat', phase: 'F', flag: 'IMPETUS_CHAT_GOVERNANCE', module: 'policyEngine/channels/secureChatContextBuilder' },
  { id: 'boundary', phase: 'F', flag: 'IMPETUS_COGNITIVE_BOUNDARY_GUARD', module: 'policyEngine/cognitiveBoundaryGuard' },
  { id: 'contextual_modules', phase: 'E', flag: 'IMPETUS_CONTEXT_SANITIZER', module: 'security/contextExposureSanitizer' },
  { id: 'explainability', phase: 'G', flag: 'IMPETUS_GOVERNANCE_EXPLAINABILITY', module: 'explainability/governanceExplainabilityEngine' },
  { id: 'oversight', phase: 'G', flag: 'IMPETUS_GOVERNANCE_OVERSIGHT', module: 'oversight/governanceOversightService' },
  { id: 'drift', phase: 'G', flag: 'IMPETUS_GOVERNANCE_DRIFT_DETECTION', module: 'oversight/governanceDriftDetector' },
  { id: 'audit_feed', phase: 'G', flag: 'IMPETUS_GOVERNANCE_AUDIT_FEED', module: 'audit/cognitiveGovernanceAuditFeed' },
  { id: 'readiness', phase: 'H', flag: 'IMPETUS_GOVERNANCE_READINESS', module: 'governanceReadiness/governanceReadinessEngine' },
  { id: 'quality_gates', phase: 'H', flag: 'IMPETUS_GOVERNANCE_QUALITY_GATES', module: 'governanceQuality/governanceQualityGate' },
  { id: 'controlled_activation', phase: 'I', flag: 'IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION', module: 'governanceActivation/governanceActivationRuntime' },
  { id: 'operations', phase: 'J', flag: 'IMPETUS_GOVERNANCE_OPERATIONS', module: 'governanceOperations/governanceOperationsService' },
  { id: 'incident_engine', phase: 'J', flag: 'IMPETUS_GOVERNANCE_INCIDENT_ENGINE', module: 'governanceOperations/governanceIncidentEngine' },
  { id: 'rollout_orchestration', phase: 'J', flag: 'IMPETUS_GOVERNANCE_OPERATIONS', module: 'governanceOperations/governanceActivationOrchestrator' },
  { id: 'telemetry', phase: 'F', flag: 'IMPETUS_GOVERNANCE_SHADOW_MODE', module: 'policyEngine/shadow/governanceShadowComparator', default_on: true }
];

function _envOn(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || v === '1';
}

function _moduleExists(relPath) {
  try {
    require.resolve(`../${relPath}`);
    return true;
  } catch {
    return false;
  }
}

function auditCoverage(ctx = {}) {
  const matrix = CHANNELS.map((ch) => {
    const flag_on = _envOn(ch.flag, ch.default_on === true);
    const exists = _moduleExists(ch.module);
    let status = 'integrated';
    if (!exists) status = 'module_missing';
    else if (!flag_on && ch.id !== 'telemetry') status = 'shadow_only';
    else if (flag_on) status = 'governance_active_env';

    return { ...ch, flag_on, module_exists: exists, status };
  });

  const gaps = matrix.filter((m) => m.status === 'module_missing');
  const shadow_only = matrix.filter((m) => m.status === 'shadow_only');
  const bypass_risk = matrix.filter(
    (m) => m.module_exists && !m.flag_on && !['telemetry', 'readiness', 'quality_gates', 'operations'].includes(m.id)
  );

  return {
    channels: matrix,
    coverage_score: Number(((matrix.length - gaps.length) / matrix.length).toFixed(4)),
    gaps,
    shadow_only_paths: shadow_only,
    potential_bypasses: bypass_risk,
    inconsistencies: gaps.length > 0 ? ['missing_modules'] : [],
    auto_activation: false
  };
}

module.exports = { CHANNELS, auditCoverage };
