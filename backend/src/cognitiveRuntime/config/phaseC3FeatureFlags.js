'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

module.exports = {
  isProductionGraphEnabled: () => _flag('IMPETUS_C3_PRODUCTION_GRAPH', true),
  isEconomicIntelligenceEnabled: () => _flag('IMPETUS_C3_ECONOMIC_INTELLIGENCE', true),
  isRealConfidenceEnabled: () => _flag('IMPETUS_C3_REAL_CONFIDENCE', true),
  isCognitiveUtilityEnabled: () => _flag('IMPETUS_C3_COGNITIVE_UTILITY', true),
  isC3ObservabilityEnabled: () => _flag('IMPETUS_C3_OBSERVABILITY', true),
  autoRemediation: false,
  autoDecisions: false,
  authoritativeGlobal: false,
  hourlyCostProxy: () => {
    const v = Number(process.env.IMPETUS_C3_HOURLY_COST_PROXY);
    return Number.isFinite(v) && v > 0 ? v : 450;
  }
};
