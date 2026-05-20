'use strict';

function compareTruthStates(a, b) {
  const axisA = a?.authority?.contextual_truth?.functional_axis || a?.contextual_truth?.functional_axis;
  const axisB = b?.authority?.contextual_truth?.functional_axis || b?.contextual_truth?.functional_axis;
  const confA = a?.runtime_truth_confidence ?? 0;
  const confB = b?.runtime_truth_confidence ?? 0;

  return {
    axis_match: axisA === axisB,
    confidence_delta: Number(Math.abs(confA - confB).toFixed(4)),
    divergence: axisA !== axisB || Math.abs(confA - confB) > 0.15
  };
}

function compareChannelTruths(kpiTruth, summaryTruth) {
  const kAxis = kpiTruth?.kpi_truth?.axis;
  const sAxis = summaryTruth?.summary_truth?.axis;
  return {
    consistent: kAxis === sAxis,
    kpi_axis: kAxis,
    summary_axis: sAxis,
    mismatch: kAxis && sAxis && kAxis !== sAxis
  };
}

module.exports = { compareTruthStates, compareChannelTruths };
