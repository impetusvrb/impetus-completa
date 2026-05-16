'use strict';

const { buildRolloutExplainability } = require('../explainability/qualityRolloutExplainability');

const WORKFLOW_KEYS = ['ncr', 'capa', 'spc', 'telemetry', 'cognitive', 'supplier', 'audit', 'recommendations'];

function evaluateWorkflowRollout(workflows = {}, ctx = {}) {
  const maturity = ctx.maturity_level || 'INITIAL';
  const cognitiveReady = ['CONTROLLED', 'OPTIMIZED', 'COGNITIVE_READY'].includes(maturity);
  const blockers = Array.isArray(ctx.blockers) ? ctx.blockers : [];
  const wf = workflows && typeof workflows === 'object' && !Array.isArray(workflows) ? workflows : {};
  const res = {};

  for (const key of WORKFLOW_KEYS) {
    const spec = wf[key] || {};
    const want = !!spec.enabled;
    let allowed = true;
    if (key === 'telemetry' && want && blockers.includes('telemetry_w3_off')) allowed = false;
    if (['cognitive', 'recommendations'].includes(key) && want && (!cognitiveReady || blockers.includes('cognitive_requires_governance_runtime'))) {
      allowed = false;
    }
    if (key === 'cognitive' && want && !cognitiveReady) allowed = false;

    res[key] = {
      enabled_requested: want,
      enabled_allowed: want && allowed,
      workflow_maturity_hint: want ? (allowed ? 0.72 : 0.35) : null,
      adoption_confidence: spec.adoption_confidence != null ? Number(spec.adoption_confidence) : null,
      emit_event: want && allowed && spec.previous_enabled !== want,
      explainability: buildRolloutExplainability({
        rationale: allowed ? `Workflow ${key} pode ser exposto progressivemente.` : `Workflow ${key} bloqueado por maturidade ou readiness.`,
        blockers: allowed ? [] : blockers
      })
    };
  }

  return {
    ok: true,
    workflows: res,
    explainability: buildRolloutExplainability({ rationale: 'Gating de workflows derivado de maturidade operacional e blockers.' })
  };
}

module.exports = { evaluateWorkflowRollout, WORKFLOW_KEYS };
