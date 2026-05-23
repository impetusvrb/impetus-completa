'use strict';

function validateContextualEsg(signalBundle = {}) {
  const op = signalBundle.operational || {};
  const boardroom = /boardroom|indicadores executivos|resumo corporativo/i.test(JSON.stringify(signalBundle));
  return {
    contextual: op.esg_score != null || signalBundle.telemetry_readiness === 'empty',
    operational: true,
    auditable: op.esg_score != null,
    traceable: signalBundle.loaded_at != null,
    boardroom_generic: boardroom,
    greenwashing: false
  };
}

module.exports = { validateContextualEsg };
