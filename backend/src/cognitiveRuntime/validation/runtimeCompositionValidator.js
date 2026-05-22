'use strict';

const { validateCompositionPlan } = require('../composition/runtimeCompositionContracts');
const { validateRegistryIntegrity } = require('./cognitiveBlockValidator');
const { validateSemanticIsolation } = require('./semanticIsolationValidator');

function validateRuntimeComposition(shadowPlan = {}, ctx = {}) {
  const registryCheck = validateRegistryIntegrity();
  const planCheck = validateCompositionPlan(shadowPlan);
  const isolationCheck = validateSemanticIsolation(shadowPlan, ctx);

  const valid =
    registryCheck.valid && planCheck.valid && isolationCheck.semantic_isolation_valid;

  return {
    valid,
    registry: registryCheck,
    plan: planCheck,
    isolation: isolationCheck,
    phase: 'Z.18',
    rollback_safe: true,
    delivery_mutation: false
  };
}

module.exports = {
  validateRuntimeComposition
};
