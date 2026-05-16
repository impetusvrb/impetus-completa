'use strict';

const flags = require('./qualityTelemetryRuntimeFlags');

/**
 * Amostragem probabilística (sem estado; compatível multi-instância).
 * Edge pode pré-filtrar; aqui é última linha de defesa enterprise.
 */
function shouldPersistSample() {
  const ratio = flags.getQualityTelemetrySampleRatio();
  if (ratio >= 1) return true;
  if (ratio <= 0) return false;
  return Math.random() < ratio;
}

module.exports = { shouldPersistSample };
