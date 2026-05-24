'use strict';

function evaluatePreventiveActionEconomics(economic = {}, bottleneck = {}, causal = {}) {
  const baseLoss = economic.estimated_loss ?? 0;
  const actions = [];

  if (bottleneck.primary_bottleneck?.node_type === 'downtime' || bottleneck.primary_bottleneck?.node_type === 'maintenance') {
    actions.push({
      preventive_action: 'manutenção preventiva supervisionada — redução paragem',
      avoided_loss_estimate: Number((baseLoss * 0.35).toFixed(2)),
      operational_preservation_score: 0.72,
      intervention_efficiency: 0.68
    });
  }

  if (bottleneck.primary_bottleneck?.node_type === 'nc' || bottleneck.primary_bottleneck?.node_type === 'quality') {
    actions.push({
      preventive_action: 'inspeção reforçada — NC evitada',
      avoided_loss_estimate: Number((baseLoss * 0.28).toFixed(2)),
      operational_preservation_score: 0.7,
      intervention_efficiency: 0.65
    });
  }

  if (causal.strongest_chain?.chain_id === 'setup_queue_throughput') {
    actions.push({
      preventive_action: 'redução setup — throughput preservado',
      avoided_loss_estimate: Number((baseLoss * 0.2).toFixed(2)),
      operational_preservation_score: 0.66,
      intervention_efficiency: 0.62
    });
  }

  if (!actions.length) {
    actions.push({
      preventive_action: 'monitorização operacional — sem acção automática',
      avoided_loss_estimate: Number((baseLoss * 0.1).toFixed(2)),
      operational_preservation_score: 0.5,
      intervention_efficiency: 0.45
    });
  }

  const best = actions.sort((a, b) => b.avoided_loss_estimate - a.avoided_loss_estimate)[0];

  return {
    recommendations: actions,
    top_preventive: best,
    auto_execution_blocked: true,
    auto_decisions: false
  };
}

module.exports = { evaluatePreventiveActionEconomics };
