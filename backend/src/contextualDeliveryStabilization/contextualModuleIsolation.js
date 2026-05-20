'use strict';

const { isolateFunctionalModule } = require('./contextualFunctionalIsolation');
const { isolateByHierarchy } = require('./hierarchyIsolationResolver');

function isolateModule(moduleId, user, ctx = {}) {
  const hierarchyBand = ctx.hierarchy_band || 'operator';
  const func = isolateFunctionalModule(moduleId, ctx);
  const hier = isolateByHierarchy(moduleId, hierarchyBand);
  const allowed = func.allowed && hier.allowed;
  return {
    module_id: moduleId,
    allowed,
    delivery_authority: allowed ? 'governed_targeting' : 'denied',
    hierarchy_compatibility: hier.allowed,
    operational_compatibility: func.allowed,
    contextual_confidence: allowed ? 0.9 : 0.2,
    runtime_truth_compatible: ctx.runtime_truth_axis ? func.domain === ctx.runtime_truth_axis || func.reason === 'cross_domain_safe' : true,
    reasons: [func.reason, hier.reason].filter(Boolean)
  };
}

module.exports = { isolateModule };
