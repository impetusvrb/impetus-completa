'use strict';

const { inferCriticality } = require('./zCriticalityInferenceRuntime');
const { inferPriority } = require('./zPriorityReasoningRuntime');
const { inferImpact } = require('./zImpactInferenceRuntime');
const { inferEscalation } = require('./zEscalationReasoningRuntime');
const stateful = require('./zStatefulReasoningRuntime');

function reasonOperational(tenantId, text = '', ctx = {}) {
  const criticality = inferCriticality(text, ctx);
  const priority = inferPriority(text, { ...ctx, criticality });
  const impact = inferImpact(text, ctx);
  const escalation = inferEscalation(priority, impact, criticality);

  stateful.recordStep(tenantId, {
    type: 'operational_reasoning',
    inputs_excerpt: String(text || '').slice(0, 140),
    criticality_level: criticality.level,
    priority_tier: priority.tier,
    impact_breadth: impact.breadth
  });

  const reasoning_quality = Number(
    Math.min(
      1,
      criticality.score * 0.3 + priority.score * 0.3 + impact.impact_score * 0.3 + 0.1
    ).toFixed(3)
  );

  return {
    criticality,
    priority,
    impact,
    escalation,
    reasoning_quality,
    assistive_only: true,
    auto_execution: false
  };
}

module.exports = { reasonOperational };
