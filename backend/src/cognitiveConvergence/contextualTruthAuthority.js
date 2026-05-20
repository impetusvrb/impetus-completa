'use strict';

const phaseM = require('./config/phaseMFeatureFlags');
const { setRuntimeTruthState, getRuntimeTruthState } = require('./runtimeTruthState');
const { resolveAuthorityForChannel } = require('./governedTruthRegistry');

function establishContextualAuthority(user, ctx = {}) {
  const axis = ctx.functional_axis || user?.functional_axis || user?.functional_area || 'general';
  const authority = {
    tenant_id: user?.company_id,
    user_id: user?.id,
    functional_axis: axis,
    hierarchy_level: user?.hierarchy_level ?? 5,
    authority_layer: resolveAuthorityForChannel(ctx.channel || 'contextual'),
    governance_envelope: ctx.cognitive_envelope || ctx.content_exposure || null,
    established_at: new Date().toISOString()
  };

  const truth = {
    contextual_truth: authority,
    operational_scope: axis,
    semantic_state: { axis, version: 1 },
    runtime_truth_confidence: computeAuthorityConfidence(authority)
  };

  if (phaseM.isRuntimeTruthAuthorityEnabled() || phaseM.isCognitiveConvergenceObservabilityEnabled()) {
    setRuntimeTruthState(user, truth, ctx);
  }

  return truth;
}

function computeAuthorityConfidence(authority) {
  let score = 0.55;
  if (authority.tenant_id) score += 0.15;
  if (authority.functional_axis && authority.functional_axis !== 'general') score += 0.2;
  if (authority.governance_envelope) score += 0.1;
  return Number(Math.min(1, score).toFixed(4));
}

function getAuthoritativeTruth(user, ctx = {}) {
  const cached = getRuntimeTruthState(user, ctx);
  if (cached) return cached;
  return establishContextualAuthority(user, ctx);
}

module.exports = { establishContextualAuthority, getAuthoritativeTruth, computeAuthorityConfidence };
