'use strict';

const { buildTargetingContext } = require('./runtimeModuleTargeting');
const { computeContextualPrecision } = require('./contextualPrecisionEngine');

function buildRuntimeContextualTarget(user, ctx = {}) {
  const targeting = buildTargetingContext(user, ctx);
  const precision = computeContextualPrecision(user, { ...ctx, functional_axis: targeting.functional_axis });
  return {
    targeting,
    ...precision,
    runtime_contextual_integrity: precision.sufficient ? 'ok' : 'insufficient_context'
  };
}

module.exports = { buildRuntimeContextualTarget };
