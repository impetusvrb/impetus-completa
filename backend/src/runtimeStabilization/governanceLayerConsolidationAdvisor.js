'use strict';

function adviseLayerConsolidation(overlap = {}) {
  const recommendations = [];
  for (const pair of overlap.redundant_pairs || []) {
    recommendations.push({
      priority: 'medium',
      action: 'consolidate_metadata_blocks',
      layers: [pair.a, pair.b],
      auto_execute: false
    });
  }
  if ((overlap.layer_count || 0) > 5) {
    recommendations.push({
      priority: 'high',
      action: 'reduce_active_governance_layers',
      reason: 'Excesso de camadas activas no dashboard/me',
      auto_execute: false
    });
  }
  return { recommendations, observe_only: true };
}

module.exports = { adviseLayerConsolidation };
