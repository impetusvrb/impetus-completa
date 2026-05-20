'use strict';

const { assessGovernanceComplexity } = require('./governanceComplexityReducer');

function coordinateSimplification(ctx = {}) {
  const layers = {
    policy: Boolean(ctx.governance_meta || ctx.policy_active),
    semantic: Boolean(ctx.semantic_alignment),
    precision: Boolean(ctx.precision_delivery),
    convergence: Boolean(ctx.cognitive_convergence),
    operations: Boolean(ctx.enterprise_cognitive_operations)
  };
  const complexity = assessGovernanceComplexity(layers);
  return {
    layers,
    complexity,
    simplify_recommended: complexity.layer_count >= 5,
    auto_simplify: false
  };
}

module.exports = { coordinateSimplification };
