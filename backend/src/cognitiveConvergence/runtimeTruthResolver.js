'use strict';

const { getAuthoritativeTruth } = require('./contextualTruthAuthority');
const { composeGovernedContext } = require('./governedContextComposition');
const { assembleSemanticTruth } = require('./unifiedSemanticAssembly');

function resolveRuntimeTruth(user, ctx = {}) {
  const authority = getAuthoritativeTruth(user, ctx);
  const composed = composeGovernedContext(user, {
    visible_modules: ctx.visible_modules,
    semantic: ctx.semantic_alignment,
    precision: ctx.precision_delivery,
    exposure: ctx.content_exposure
  }, ctx);
  const semantic = assembleSemanticTruth(authority, composed);

  return {
    runtime_truth_state: {
      authority,
      composition: composed.composition,
      semantic,
      contextual_unification_score: composed.contextual_unification_score,
      runtime_truth_confidence: authority.runtime_truth_confidence,
      resolved_at: new Date().toISOString()
    },
    runtime_truth_confidence: authority.runtime_truth_confidence
  };
}

module.exports = { resolveRuntimeTruth };
