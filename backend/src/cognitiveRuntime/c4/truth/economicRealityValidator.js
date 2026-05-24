'use strict';

function validateEconomicReality(payload = {}, truth = {}, bottleneck = {}) {
  const heuristic = payload.operational_economic_runtime || {};
  const estimated = heuristic.estimated_loss ?? 0;
  const pressure = payload.economic_pressure_runtime?.economic_pressure_index ?? 0;

  const bnWeight = bottleneck.primary_bottleneck?.weight ?? 0;
  const observed_proxy = bnWeight * 800 + (truth.verified_operational_impact ? 200 : 0);
  const ratio = estimated > 0 ? observed_proxy / estimated : 1;

  let heuristic_drift = 'stable';
  if (ratio < 0.4 || ratio > 2.5) heuristic_drift = 'elevated';
  else if (ratio < 0.65 || ratio > 1.6) heuristic_drift = 'moderate';

  const exaggerated_impacts = estimated > observed_proxy * 2.5;
  const economic_accuracy_score = Number(
    Math.max(0, Math.min(1, 1 - Math.abs(1 - ratio) * 0.5 - (exaggerated_impacts ? 0.2 : 0))).toFixed(3)
  );

  return {
    economic_accuracy_score,
    heuristic_drift,
    validated_losses: truth.verified_operational_impact ? [{ estimated, observed_proxy: Number(observed_proxy.toFixed(2)) }] : [],
    exaggerated_impacts,
    operational_economic_truth: economic_accuracy_score >= 0.5 && !exaggerated_impacts,
    pressure_consistency: pressure < 0.8 || estimated > 0,
    erp_validated: false,
    auto_decisions: false
  };
}

module.exports = { validateEconomicReality };
