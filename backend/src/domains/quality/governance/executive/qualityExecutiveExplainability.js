'use strict';

const { buildGovernanceNarrativeFrame } = require('../qualityExplainabilityLayer');

function executiveExplainabilityFrame(ctx = {}) {
  return buildGovernanceNarrativeFrame({
    ...ctx,
    origin_layer: 'governance',
    context: ctx.context,
    origin: ctx.origin || 'quality_governance_runtime',
    rationale: ctx.rationale || 'assistive_governance_frame',
    evidence_refs: ctx.evidence_refs || [],
    risk: ctx.risk,
    operational_impact: ctx.operational_impact
  });
}

module.exports = {
  executiveExplainabilityFrame
};
