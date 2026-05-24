'use strict';

function validateOperationalTruth(payload = {}, graph = {}, bottleneck = {}, causal = {}) {
  const validated = [];
  const rejected = [];
  const false_correlations = [];

  const loss = payload.operational_economic_runtime?.estimated_loss ?? 0;
  const bn = bottleneck.primary_bottleneck;
  if (bn && loss > 0) {
    validated.push({
      id: 'bottleneck_loss',
      claim: 'gargalo correlacionado com perda operacional',
      confidence: bottleneck.confidence_level ?? 0.5
    });
  } else if (bn && loss === 0) {
    rejected.push({ id: 'bottleneck_no_loss', reason: 'gargalo sem perda observada' });
  }

  const maint = payload.maintenance_cognitive_runtime?.reliability;
  if (maint?.downtime_minutes > 0 && bn?.node_type === 'downtime') {
    validated.push({ id: 'maint_downtime', claim: 'manutenção associada a downtime', confidence: 0.75 });
  }

  const chain = causal?.strongest_chain || graph?.causal?.strongest_chain;
  if (chain?.chain_id === 'setup_queue_throughput' && (payload.production_operational_graph_runtime?.graph?.nodes?.find((n) => n.node_type === 'throughput')?.operational_weight ?? 1) < 0.6) {
    validated.push({ id: 'setup_throughput', claim: 'setup reduziu throughput', confidence: chain.causal_strength ?? 0.6 });
  }

  if (payload.quality_operational_metrics?.open_nc > 0) {
    const waste = payload.production_operational_graph_runtime?.graph?.nodes?.find((n) => n.node_type === 'waste');
    if (waste && waste.operational_weight > 0.3) {
      validated.push({ id: 'nc_waste', claim: 'NC associada a desperdício', confidence: 0.7 });
    } else {
      false_correlations.push({ id: 'nc_waste_weak', reason: 'NC sem peso desperdício no grafo' });
    }
  }

  const preventive = payload.operational_economic_runtime?.preventive;
  if (preventive?.avoided_loss_estimate > 0) {
    validated.push({
      id: 'preventive_impact',
      claim: 'recomendação preventiva com impacto evitado estimado',
      confidence: 0.55
    });
  }

  const operational_truth_score = Number(
    (validated.length / Math.max(validated.length + rejected.length + false_correlations.length, 1)).toFixed(3)
  );

  const verified_operational_impact = validated.length > 0 && loss > 0;

  return {
    operational_truth_score,
    validated_causalities: validated,
    rejected_causalities: rejected,
    false_operational_correlations: false_correlations,
    verified_operational_impact,
    truth_validation_confidence: Number(
      ((validated.reduce((s, v) => s + (v.confidence || 0), 0) / Math.max(validated.length, 1)) || 0.5).toFixed(3)
    ),
    auto_decisions: false
  };
}

module.exports = { validateOperationalTruth };
