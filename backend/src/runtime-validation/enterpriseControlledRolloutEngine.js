'use strict';

const STAGES = Object.freeze(['SHADOW', 'PILOT', 'CONTROLLED', 'STAGED', 'FULL']);

function normalizeStage(raw) {
  const s = String(raw || 'shadow').toLowerCase();
  if (s === 'pilot' || s === 'canary') return 'PILOT';
  if (s === 'controlled' || s === 'partial') return 'CONTROLLED';
  if (s === 'staged') return 'STAGED';
  if (s === 'full') return 'FULL';
  return 'SHADOW';
}

/**
 * Avalia expansão — nunca promove automaticamente.
 * @param {object} ctx
 */
function evaluateControlledRollout(ctx = {}) {
  const current = normalizeStage(ctx.current_stage || ctx.activation_stage || 'shadow');
  const runtime = ctx.runtime_validation || {};
  const ux = ctx.ux_validation || {};
  const audience = ctx.audience_validation || {};
  const cognitive = ctx.cognitive_maturity || {};
  const behavior = ctx.behavior_summary || {};

  const blockers = [];
  if (!runtime.stable) blockers.push('runtime_unstable');
  if (ux.worst_pressure_class === 'CRITICAL' || ux.results?.some((r) => r.ux_pressure_class === 'CRITICAL')) {
    blockers.push('ux_critical');
  }
  if (audience.failure_rate > 0.2) blockers.push('audience_failures');
  if (cognitive.cognitive_overload) blockers.push('cognitive_overload');
  if (behavior.aggregates?.denied_route_rate > 0.2) blockers.push('denied_routes_high');

  const readyScore = cognitive.rollout_readiness_score ?? 0;
  let recommended = current;
  let allowedExpansion = false;

  if (blockers.length === 0 && readyScore >= 45 && current === 'SHADOW') {
    recommended = 'PILOT';
    allowedExpansion = false;
  } else if (blockers.length === 0 && readyScore >= 62 && current === 'PILOT') {
    recommended = 'CONTROLLED';
    allowedExpansion = false;
  } else if (blockers.length === 0 && readyScore >= 78 && ['CONTROLLED', 'STAGED'].includes(current)) {
    recommended = current === 'CONTROLLED' ? 'STAGED' : 'FULL';
    allowedExpansion = false;
  }

  return {
    ok: true,
    stages: STAGES,
    current_stage: current,
    recommended_stage: recommended,
    allowed_expansion: allowedExpansion,
    auto_promotion: false,
    governance_escalation: false,
    authority_escalation: false,
    blockers,
    readiness_score: readyScore,
    rollback_safe: true
  };
}

module.exports = {
  STAGES,
  evaluateControlledRollout,
  normalizeStage
};
