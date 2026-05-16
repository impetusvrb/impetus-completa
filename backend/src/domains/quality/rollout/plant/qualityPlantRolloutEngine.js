'use strict';

const { buildRolloutExplainability } = require('../explainability/qualityRolloutExplainability');

function normalizePlantStage(s) {
  const x = String(s || 'off').toLowerCase();
  if (['off', 'operational_only', 'telemetry', 'governance', 'cognitive'].includes(x)) return x;
  return 'off';
}

function evaluatePlantRollout(plants = {}, ctx = {}) {
  const out = {};
  const blockers = Array.isArray(ctx.blockers) ? ctx.blockers : [];
  const entries = plants && typeof plants === 'object' && !Array.isArray(plants) ? plants : {};

  for (const [plantId, spec] of Object.entries(entries)) {
    const cur = normalizePlantStage(spec?.current);
    const tgt = normalizePlantStage(spec?.target);
    let allowed = blockers.length === 0 || tgt === 'off' || tgt === cur;
    if (['cognitive', 'governance'].includes(tgt) && blockers.includes('readiness_failed')) {
      allowed = false;
    }
    const emit = allowed && tgt !== cur;
    out[String(plantId).slice(0, 64)] = {
      current_stage: cur,
      target_stage: tgt,
      transition_allowed: allowed,
      emit_event: emit,
      explainability: buildRolloutExplainability({
        rationale: allowed ? `Planta ${plantId}: transição ${cur}→${tgt} assistida.` : `Planta ${plantId}: bloqueada.`,
        blockers: allowed ? [] : blockers,
        operational_confidence: allowed ? 0.7 : 0.4
      })
    };
  }

  return { ok: true, plants: out, explainability: buildRolloutExplainability({ rationale: 'Mapa por planta avaliado em lote.' }) };
}

module.exports = { evaluatePlantRollout, normalizePlantStage };
