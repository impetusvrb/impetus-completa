'use strict';

function buildEsgContextualGovernance(signalBundle = {}) {
  const op = signalBundle.operational || {};
  const boardroom = false;
  return {
    esg_score: op.esg_score,
    contextual: true,
    operational: true,
    regulatory_traceable: op.esg_score != null,
    boardroom_generic: boardroom,
    pillars: {
      environmental: op.sustainability_maturity ?? op.esg_score,
      emissions: op.emissions_tco2e,
      waste: op.waste_tonnes
    }
  };
}

module.exports = { buildEsgContextualGovernance };
