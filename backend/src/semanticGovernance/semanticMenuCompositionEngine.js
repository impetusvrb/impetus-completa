'use strict';

const { applySemanticInheritance } = require('./semanticModuleInheritanceGuard');
const { isolatePublication } = require('./semanticPublicationIsolation');

function composeMenu(modules, ctx = {}) {
  const afterInheritance = applySemanticInheritance(modules, ctx);
  const afterIsolation = isolatePublication(afterInheritance.modules, ctx);
  return {
    visible_modules: afterIsolation.modules,
    blocked: [...afterInheritance.blocked, ...afterIsolation.blocked],
    leakage: afterIsolation.leakage_risk,
    composition_steps: ['semantic_inheritance', 'publication_isolation']
  };
}

module.exports = { composeMenu };
