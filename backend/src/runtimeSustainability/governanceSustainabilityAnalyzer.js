'use strict';

function analyzeGovernanceSustainability(maturityPack = {}, stabilityPack = {}) {
  const maturity = maturityPack.maturity_score ?? 0.5;
  const stability = stabilityPack.stability_score ?? 0.5;
  const sustainable = maturity >= 0.5 && stability >= 0.5 && stabilityPack.unstable !== true;

  return {
    governance_sustainable: sustainable,
    sustainability_score: (maturity + stability) / 2,
    pressure_sustainable: stabilityPack.pressure?.overload !== true
  };
}

module.exports = { analyzeGovernanceSustainability };
