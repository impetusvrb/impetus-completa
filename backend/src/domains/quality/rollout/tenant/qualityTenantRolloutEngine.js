'use strict';

const { buildRolloutExplainability } = require('../explainability/qualityRolloutExplainability');

const STAGES = ['off', 'shadow', 'staged', 'canary', 'full', 'frozen', 'paused'];
const STAGE_ORDER = { off: 0, shadow: 1, staged: 2, canary: 3, full: 4, frozen: 0, paused: 0 };

function normalizeStage(s) {
  const x = String(s || 'off').toLowerCase();
  return STAGES.includes(x) ? x : 'off';
}

function evaluateTenantRollout(ctx = {}) {
  const current = normalizeStage(ctx.current_stage);
  const target = normalizeStage(ctx.target_stage);
  const mode = String(ctx.mode || 'staged').toLowerCase();
  const blockers = Array.isArray(ctx.blockers) ? ctx.blockers : [];

  const frozenOrPaused = current === 'frozen' || current === 'paused';
  let allowed = !frozenOrPaused || target === 'off' || target === 'shadow';

  if (blockers.length && target !== current && ['canary', 'full', 'staged'].includes(target)) {
    allowed = false;
  }

  const currOrd = STAGE_ORDER[current] ?? 0;
  const tgtOrd = STAGE_ORDER[target] ?? 0;
  const progressive = tgtOrd >= currOrd || target === 'off' || mode === 'rollback';

  if (!progressive && mode !== 'rollback' && mode !== 'force_assist_review') {
    allowed = false;
  }

  const explainability = buildRolloutExplainability({
    rationale: allowed
      ? `Transição de rollout tenant ${current} → ${target} compatível com matriz assistiva (${mode}).`
      : `Transição bloqueada: ${frozenOrPaused ? 'estado congelado/pausado' : blockers.length ? 'blockers activos' : 'progressão inválida'}.`,
    readiness_evidence: [`current=${current}`, `target=${target}`, `mode=${mode}`],
    adoption_evidence: ctx.adoption_hints || [],
    blockers,
    governance_status: { progressive_ok: progressive },
    operational_confidence: allowed ? 0.75 : 0.35
  });

  return {
    ok: true,
    current_stage: current,
    target_stage: target,
    mode,
    transition_allowed: allowed,
    emit_event: allowed && target !== current,
    explainability
  };
}

module.exports = { evaluateTenantRollout, normalizeStage, STAGES };
