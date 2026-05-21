'use strict';

function measureRuntimeOperationalUsefulness(pack = {}) {
  const maturity = pack.maturity?.maturity_score ?? 0.5;
  const sustainability = pack.sustainability?.sustainability_score ?? 0.5;
  const stability = pack.stability?.stability_score ?? 0.5;
  const score = (maturity + sustainability + stability) / 3;

  return {
    usefulness_score: score,
    operationally_useful: score >= 0.5,
    recommendation_only: true
  };
}

module.exports = { measureRuntimeOperationalUsefulness };
