'use strict';

function computeOperationalRenderWeight(shadowCockpit = {}, qualityPilot = {}) {
  const blocks = shadowCockpit.blocks || [];
  const bound = blocks.filter(
    (b) => b.shadow_signals?.bridge_status === 'bound_z20' || b.enriched === true
  ).length;
  const total = Math.max(blocks.length, 1);
  const bindingRatio = qualityPilot?.engine_bridge?.binding_ratio ?? bound / total;

  const operationalBlocks = blocks.filter(
    (b) =>
      b.semantic_layer === 'operational' &&
      (b.enriched || b.shadow_signals?.bridge_status === 'bound_z20')
  ).length;

  return {
    binding_ratio: Math.round(bindingRatio * 1000) / 1000,
    blocks_bound: bound,
    blocks_total: total,
    operational_weight: Math.min(1, operationalBlocks / Math.max(total * 0.5, 1)),
    render_confidence: bindingRatio >= 0.75 ? 'high' : bindingRatio >= 0.5 ? 'medium' : 'low'
  };
}

module.exports = { computeOperationalRenderWeight };
