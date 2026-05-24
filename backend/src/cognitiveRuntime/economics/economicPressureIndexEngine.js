'use strict';

function computeEconomicPressureIndex(payload = {}, graph = {}, economic = {}) {
  const nodes = graph.nodes || [];
  const pressureNodes = ['queue', 'delay', 'waste', 'nc', 'rework', 'downtime'];
  const weights = pressureNodes.map((t) => nodes.find((n) => n.node_type === t)?.operational_weight ?? 0);
  const avgPressure = weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;

  const economic_pressure_index = Number(
    Math.min(1, avgPressure * 0.5 + (economic.operational_cost_pressure ?? 0) * 0.5).toFixed(3)
  );

  const economic_stability = Number((1 - economic_pressure_index).toFixed(3));
  const projected_operational_cost = Number(
    ((economic.estimated_loss ?? 0) * (1 + economic_pressure_index * 0.15)).toFixed(2)
  );

  let escalation_probability = 0.2;
  if (economic_pressure_index > 0.6) escalation_probability = 0.75;
  else if (economic_pressure_index > 0.4) escalation_probability = 0.45;

  return {
    economic_pressure_index,
    economic_stability,
    projected_operational_cost,
    escalation_probability: Number(escalation_probability.toFixed(3)),
    auto_decisions: false
  };
}

module.exports = { computeEconomicPressureIndex };
