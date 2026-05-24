'use strict';

function detectOperationalBottleneck(graph = {}, causal = {}) {
  const nodes = [...(graph.nodes || [])].sort((a, b) => b.operational_weight - a.operational_weight);
  const primary = nodes[0];
  const chain = causal.strongest_chain;

  const affected_domains = [];
  if (primary?.node_type === 'downtime' || primary?.node_type === 'maintenance') affected_domains.push('production', 'maintenance');
  if (primary?.node_type === 'queue' || primary?.node_type === 'delay') affected_domains.push('production', 'quality');
  if (primary?.node_type === 'nc' || primary?.node_type === 'quality') affected_domains.push('quality', 'production');

  const propagation_risk =
    (primary?.operational_weight ?? 0) > 0.65 && (chain?.recurrence_factor ?? 0) > 0.3 ? 'high' : (primary?.operational_weight ?? 0) > 0.45 ? 'medium' : 'low';

  const estimated_operational_loss = Number(
    ((primary?.operational_weight ?? 0) * (chain?.operational_impact ?? 0.5) * 1000).toFixed(2)
  );

  return {
    primary_bottleneck: primary
      ? {
          node_id: primary.node_id,
          node_type: primary.node_type,
          weight: primary.operational_weight,
          origin_causal: chain?.hypothesis || 'graph_weight_dominance'
        }
      : null,
    propagation_risk,
    affected_domains: [...new Set(affected_domains)],
    estimated_operational_loss,
    confidence_level: Number(((primary?.confidence_score ?? 0.5) * (chain?.causal_strength ?? 0.5)).toFixed(3)),
    auto_remediation: false
  };
}

module.exports = { detectOperationalBottleneck };
