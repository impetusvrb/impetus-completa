'use strict';

const flags = require('../config/sz3FeatureFlags');

/**
 * Amadurece a priorização do SZ2 com:
 *  1. Recency bias — padrões recentes têm maior peso
 *  2. Domain correlation — múltiplos domínios elevam prioridade
 *  3. Pattern frequency — padrão frequente = estimativa mais confiável
 *  4. Executive attention — se perfil executivo, filtrar apenas P1-P2
 */
function maturePriority({
  sz2Reasoning = {},
  patternMatch = {},
  calibration = {},
  profileCode = 'default',
  operational = {}
} = {}) {
  if (!flags.isPrioritizationEnabled()) {
    return { mature: false, tier: sz2Reasoning?.priority?.tier || 'P4' };
  }

  const baseTier = sz2Reasoning?.priority?.tier || 'P4';
  const baseScore = sz2Reasoning?.priority?.score || 0;
  const calibratedQuality = calibration?.overall_quality || 0;
  const patternFrequency = patternMatch?.top
    ? (patternMatch.learned_pattern_count || 0) / 100
    : 0;

  // boost por multi-domain
  const domainCount = sz2Reasoning?.impact?.breadth || 0;
  const domainBoost = domainCount >= 3 ? 0.15 : domainCount === 2 ? 0.08 : 0;

  // recency bias: incidentes abertos = boost
  const incidentBoost = (operational?.critical_incidents || 0) > 0 ? 0.12 : 0;

  // frequência aprendida = boost de confiança (não de urgência)
  const frequencyBoost = Math.min(0.05, patternFrequency);

  const matureScore = Number(
    Math.min(1, baseScore + domainBoost + incidentBoost + frequencyBoost)
      .toFixed(3)
  );

  // recalcular tier
  let matureTier = matureScore >= 0.8 ? 'P1' : matureScore >= 0.6 ? 'P2' : matureScore >= 0.4 ? 'P3' : 'P4';

  // executivo: só mostra P1-P2 como relevantes (filtra ruído P3-P4)
  const isExecutive = ['director', 'executive', 'plant_manager'].includes(
    String(profileCode || '').toLowerCase()
  );
  const executive_relevant = isExecutive ? ['P1', 'P2'].includes(matureTier) : true;

  const tier_changed = matureTier !== baseTier;

  return {
    mature: true,
    tier: matureTier,
    score: matureScore,
    base_tier: baseTier,
    tier_changed,
    domain_boost: domainBoost,
    incident_boost: incidentBoost,
    frequency_boost: frequencyBoost,
    executive_relevant,
    is_executive_profile: isExecutive
  };
}

module.exports = { maturePriority };
