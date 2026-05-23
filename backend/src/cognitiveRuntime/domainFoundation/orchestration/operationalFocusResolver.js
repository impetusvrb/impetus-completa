'use strict';

function resolveOperationalFocus(blocks = [], blendedWeights = {}) {
  const layers = { operational: 0, governance: 0, strategic: 0 };
  for (const b of blocks) {
    const l = b.semantic_layer || 'operational';
    if (l === 'management' || l === 'governance') layers.governance++;
    else if (l === 'strategic') layers.strategic++;
    else layers.operational++;
  }

  const total = Math.max(blocks.length, 1);
  return {
    operational_ratio: Math.round((layers.operational / total) * 1000) / 1000,
    governance_ratio: Math.round((layers.governance / total) * 1000) / 1000,
    strategic_ratio: Math.round((layers.strategic / total) * 1000) / 1000,
    target_operational: blendedWeights.operational ?? 0.7,
    target_governance: blendedWeights.governance ?? 0.2,
    target_strategic: blendedWeights.strategic ?? 0.1,
    balanced: Math.abs((layers.operational / total) - (blendedWeights.operational ?? 0.7)) < 0.25
  };
}

module.exports = { resolveOperationalFocus };
