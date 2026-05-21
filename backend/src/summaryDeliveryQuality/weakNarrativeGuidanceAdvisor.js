'use strict';

function adviseWeakNarrativeGuidance(qualityPack = {}, ctx = {}) {
  const weak = qualityPack.usefulness?.vague || qualityPack.signal?.signal_strength < 0.35;
  return {
    weak_guidance: weak,
    recommendations: weak
      ? [{ action: 'increase_operational_specificity', fabricated: false }]
      : [{ action: 'maintain', fabricated: false }],
    auto_rewrite: false
  };
}

module.exports = { adviseWeakNarrativeGuidance };
