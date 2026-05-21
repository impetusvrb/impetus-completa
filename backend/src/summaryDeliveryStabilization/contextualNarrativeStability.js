'use strict';

const { measureNarrativeContextualAgreement } = require('../summaryConvergence/narrativeContextualAgreement');

function assessContextualNarrativeStability(summaryPayload = {}, ctx = {}) {
  const agreement = measureNarrativeContextualAgreement(summaryPayload, ctx);
  return { stable: agreement.coherent && !agreement.vague_detected, agreement };
}

module.exports = { assessContextualNarrativeStability };
