'use strict';

const flags = require('../config/sz3FeatureFlags');
const obs = require('../patterns/zPatternObservationRuntime');
const { isNoisy, noiseLevel } = require('./zNoiseReductionRuntime');

/**
 * Calibra scores de inferência do SZ2 com base em:
 *  1. Frequência de padrões observados pelo tenant
 *  2. Confirmação por matches da biblioteca de padrões
 *  3. Recência: padrões recentes têm peso maior
 *
 * Resultado: scores ajustados, mais confiáveis, menos ruidosos.
 */
function calibrateScores(tenantId, sz2Output = {}, patternMatch = {}) {
  if (!flags.isCalibrationEnabled()) return { calibrated: false, output: sz2Output };

  const topPattern = patternMatch?.top;
  const learnedFrequency = patternMatch?.learned_pattern_count || 0;
  const hasLibraryConfirmation = !!topPattern;

  const base_reasoning = sz2Output?.reasoning?.reasoning_quality || 0;
  const base_continuity = sz2Output?.continuity?.continuation_score || 0;
  const base_awareness = sz2Output?.context?.awareness_score || 0;
  const base_industrial = sz2Output?.reasoning?.industrial_intelligence_score || 0;

  // boost por confirmação de padrão estático (+15%) e por frequência aprendida
  const pattern_boost = hasLibraryConfirmation ? 0.15 : 0;
  const learned_boost = Math.min(0.1, learnedFrequency * 0.005);

  const calibrated_reasoning = Number(Math.min(1, base_reasoning + pattern_boost + learned_boost).toFixed(3));
  const calibrated_continuity = Number(Math.min(1, base_continuity + (hasLibraryConfirmation ? 0.1 : 0)).toFixed(3));
  const calibrated_industrial = Number(Math.min(1, base_industrial + pattern_boost).toFixed(3));

  const overall_quality = Number(
    (calibrated_reasoning * 0.35 + calibrated_continuity * 0.25 + calibrated_industrial * 0.25 + base_awareness * 0.15).toFixed(3)
  );

  // ruído
  const noise = noiseLevel(overall_quality);
  const suppress = isNoisy(overall_quality);

  return {
    calibrated: true,
    calibrated_reasoning,
    calibrated_continuity,
    calibrated_industrial,
    overall_quality,
    noise_level: noise,
    suppress_enrichment: suppress,
    boosts_applied: { pattern_boost, learned_boost },
    has_library_confirmation: hasLibraryConfirmation,
    pattern_id: topPattern?.id || null
  };
}

module.exports = { calibrateScores };
