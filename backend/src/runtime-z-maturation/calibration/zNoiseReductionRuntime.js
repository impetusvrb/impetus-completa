'use strict';

const flags = require('../config/sz3FeatureFlags');

/**
 * Filtra inferências abaixo do limiar de confiança configurado.
 * "Ruído" = sinais fracos que não justificam enriquecimento da resposta.
 */
function filterNoise(inferences = [], threshold = null) {
  const t = threshold != null ? threshold : flags.noiseThreshold();
  return inferences.filter((inf) => {
    const score = inf?.score ?? inf?.confidence ?? inf?.reasoning_quality ?? 1;
    return Number(score) >= t;
  });
}

function isNoisy(score, threshold = null) {
  const t = threshold != null ? threshold : flags.noiseThreshold();
  return Number(score || 0) < t;
}

function noiseLevel(score) {
  const n = Number(score || 0);
  if (n >= 0.7) return 'clear';
  if (n >= 0.5) return 'acceptable';
  if (n >= 0.35) return 'marginal';
  return 'noisy';
}

module.exports = { filterNoise, isNoisy, noiseLevel };
