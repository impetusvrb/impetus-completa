'use strict';

const flags = require('../summaryRuntimeActivation/config/phaseZ9FeatureFlags');
const { measureSummaryOperationalUsefulness } = require('./summaryOperationalUsefulness');
const { measureNarrativeSignalStrength } = require('./narrativeSignalStrength');
const { measureContextualNarrativeNoise } = require('./contextualNarrativeNoise');
const { adviseWeakNarrativeGuidance } = require('./weakNarrativeGuidanceAdvisor');

function assessSummaryDeliveryQuality(summaryPayload = {}, ctx = {}) {
  const usefulness = measureSummaryOperationalUsefulness(summaryPayload, ctx);
  const signal = measureNarrativeSignalStrength(summaryPayload, ctx);
  const noise = measureContextualNarrativeNoise(summaryPayload);
  const weak = adviseWeakNarrativeGuidance({ usefulness, signal, noise }, ctx);

  return {
    phase: 'Z.9',
    enabled: flags.isSummaryDeliveryQualityEnabled(),
    usefulness,
    signal,
    noise,
    weak_guidance: weak,
    delivery_score: Math.max(0, usefulness.usefulness_score - noise.noise_score * 0.3),
    recommendation_only: !flags.isSummaryDeliveryQualityEnabled(),
    narrative_fabricated: false
  };
}

module.exports = { assessSummaryDeliveryQuality };
