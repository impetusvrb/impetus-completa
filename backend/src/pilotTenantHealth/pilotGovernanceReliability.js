'use strict';

function assessPilotGovernanceReliability(pack = {}) {
  const maturity = pack.maturity?.maturity_score ?? 0.5;
  const sustainable = pack.sustainability?.sustainability_score ?? 0.5;
  return { reliability_score: (maturity + sustainable) / 2, governance_reliable: maturity >= 0.55 && sustainable >= 0.5 };
}

module.exports = { assessPilotGovernanceReliability };
