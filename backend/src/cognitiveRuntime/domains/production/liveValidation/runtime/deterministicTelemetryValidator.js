'use strict';

const { stableHash } = require('./productionRuntimeStabilityValidator');

function validateDeterministicTelemetry(compositionIds = [], compositionIdsB = []) {
  const h1 = stableHash(compositionIds);
  const h2 = stableHash(compositionIdsB);
  return {
    deterministic: h1 === h2,
    unstable_composition: h1 !== h2,
    reinjection_risk: false
  };
}

module.exports = { validateDeterministicTelemetry };
