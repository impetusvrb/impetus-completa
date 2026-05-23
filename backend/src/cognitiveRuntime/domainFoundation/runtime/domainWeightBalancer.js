'use strict';

const { PERSONA_WEIGHTING_MATRIX, resolvePersonaTier, getPersonaWeights } = require('../registry/cockpitCompositionRegistry');
const { getDomainWeighting } = require('../registry/cognitiveDomainRegistry');

function balanceWeightsForProfile(domain, profileCode) {
  const domainW = getDomainWeighting(domain);
  const personaW = getPersonaWeights(profileCode);

  return {
    domain,
    profile_code: profileCode,
    persona_tier: resolvePersonaTier(profileCode),
    domain_weights: domainW,
    persona_weights: personaW,
    blended: {
      operational: _blend(domainW.operational, personaW.operational),
      governance: _blend(domainW.governance, personaW.governance),
      strategic: _blend(domainW.strategic, personaW.strategic)
    }
  };
}

function _blend(a, b) {
  return Math.round(((a + b) / 2) * 100) / 100;
}

function rankBlocksByWeight(blocks = [], blendedWeights = {}) {
  const layerMap = {
    operational: blendedWeights.operational ?? 0.5,
    management: blendedWeights.governance ?? 0.3,
    governance: blendedWeights.governance ?? 0.3,
    strategic: blendedWeights.strategic ?? 0.2,
    cognitive: blendedWeights.operational ?? 0.5
  };

  return [...blocks]
    .map((b) => ({
      ...b,
      balanced_score: (b.effective_score || b.domain_weight || 0.5) * (layerMap[b.semantic_layer] ?? 0.5)
    }))
    .sort((a, b) => b.balanced_score - a.balanced_score);
}

module.exports = { balanceWeightsForProfile, rankBlocksByWeight, PERSONA_WEIGHTING_MATRIX };
