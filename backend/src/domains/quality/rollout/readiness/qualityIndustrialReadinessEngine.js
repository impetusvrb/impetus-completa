'use strict';

const { buildRolloutExplainability } = require('../explainability/qualityRolloutExplainability');
const storageFlags = require('../../../../storage/storageFlags');

function envOn(name) {
  return String(process.env[name] || '').toLowerCase() === 'true';
}

function assessIndustrialReadiness(inputs = {}) {
  const checks = {
    telemetry_ready: storageFlags.isTelemetryIsolatedIngestEnabled(),
    governance_ready: envOn('IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED'),
    workflow_ready: inputs.workflow_completion_rate == null || Number(inputs.workflow_completion_rate) >= 0.35,
    user_ready: (Number(inputs.trained_operators_ratio) || 0) >= 0.4,
    infra_ready: envOn('IMPETUS_STORAGE_V3_ENABLED'),
    cognitive_ready_signal: (Number(inputs.maturity_score) || 0) >= 0.55,
    observability_ok: true,
    event_health: envOn('IMPETUS_INDUSTRIAL_EVENTS_ENABLED')
  };

  const vals = Object.values(checks).map((v) => (v ? 1 : 0));
  const readiness_score = vals.reduce((a, b) => a + b, 0) / vals.length;

  const blockers = [];
  if (!checks.telemetry_ready && inputs.require_telemetry) blockers.push('telemetry_not_ready');
  if (!checks.governance_ready && inputs.require_governance) blockers.push('governance_not_ready');
  if (!checks.infra_ready) blockers.push('storage_v3_expected');
  if (!checks.user_ready) blockers.push('user_training_low');

  const recommendation =
    readiness_score >= 0.75
      ? 'prosseguir_staged_rollout'
      : readiness_score >= 0.5
        ? 'expandir_shadow_ou_canary_limitado'
        : 'pausar_exposicao_cognitiva_reforcar_basico';

  return {
    ok: true,
    readiness_score,
    checks,
    readiness_blockers: blockers,
    rollout_recommendation: recommendation,
    safe_activation_hints: blockers.length
      ? ['Resolver blockers antes de activar workflows avançados', 'Manter digest operacional']
      : ['Incrementar percentagem canary por planta', 'Monitorizar saturation_protect'],
    emit_event: blockers.length > 0,
    blocked_kind: blockers.length ? 'readiness' : null,
    explainability: buildRolloutExplainability({
      rationale: 'Média booleana de health checks mais inputs declarativos.',
      readiness_evidence: Object.entries(checks).map(([k, v]) => `${k}=${v}`)
    })
  };
}

module.exports = { assessIndustrialReadiness };
