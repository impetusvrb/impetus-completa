'use strict';

const { logPhaseM } = require('./phaseMLogger');
const { compareTruthStates } = require('./runtimeTruthComparator');

function detectTruthDeviation(expected, actual) {
  const cmp = compareTruthStates(expected, actual);
  if (cmp.divergence) {
    logPhaseM('SEMANTIC_TRUTH_DEVIATION', { confidence_delta: cmp.confidence_delta, axis_match: cmp.axis_match });
  }
  return { ...cmp, deviation_detected: cmp.divergence };
}

function detectFragmentation(graphReport = {}) {
  const rate = graphReport.redundant_builders?.length
    ? graphReport.redundant_builders.length / 10
    : 0;
  if (rate > 0.2) {
    logPhaseM('COGNITIVE_FRAGMENTATION_DETECTED', { rate });
  }
  return { fragmentation_detected: rate > 0.2, cognitive_fragmentation_rate: Number(rate.toFixed(4)) };
}

module.exports = { detectTruthDeviation, detectFragmentation };
