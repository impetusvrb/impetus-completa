'use strict';

const storageFlags = require('../../../../storage/storageFlags');
const { buildRolloutExplainability } = require('../explainability/qualityRolloutExplainability');

function envOn(name) {
  return String(process.env[name] || '').toLowerCase() === 'true';
}

function evaluateGovernanceRolloutControl(ctx = {}) {
  const blockers = [];
  const hints = [];

  if (ctx.desired_cognitive && !envOn('IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED')) {
    blockers.push('cognitive_requires_governance_runtime');
    hints.push('Activar IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED antes de cognitive enterprise.');
  }
  if (ctx.desired_telemetry && !storageFlags.isTelemetryIsolatedIngestEnabled()) {
    blockers.push('telemetry_w3_off');
    hints.push('WAVE3 telemetry ingest necessário para rollout telemetry.');
  }
  if (ctx.desired_cognitive && !envOn('IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED')) {
    blockers.push('cognitive_module_off');
  }
  if (ctx.desired_governance_features && !envOn('IMPETUS_GOVERNANCE_V7_ENABLED')) {
    hints.push('GOVERNANCE_V7 recomendado para ABAC/capability matrix enterprise.');
  }
  if (envOn('IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED') && !envOn('IMPETUS_AI_CONTEXT_BUDGET_ENABLED')) {
    hints.push('WAVE4 context budget recomendado com cognitive runtime.');
  }

  const allowed = blockers.length === 0;

  return {
    ok: true,
    rollout_allowed: allowed,
    blockers,
    governance_hints: hints,
    explainability: buildRolloutExplainability({
      rationale: allowed
        ? 'Flags de plataforma alinhadas com o nível de exposição desejado.'
        : 'Rollout bloqueado até resolver dependências de governança/telemetria.',
      blockers,
      readiness_evidence: hints
    })
  };
}

module.exports = { evaluateGovernanceRolloutControl };
