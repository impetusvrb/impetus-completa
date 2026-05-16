'use strict';

const { buildXbarEvaluation } = require('../spc/qualityControlChartEngine');
const { capabilityIndices } = require('../spc/qualityProcessCapabilityEngine');
const { iqrOutliers } = require('../spc/qualityStatisticalAnomalyEngine');
const { buildContextualStory } = require('../executive/qualityContextualStorytelling');

function runGovernanceAnalyticsPack(input = {}) {
  const out = { spc: null, capability: null, anomalies: null, narrative: null };
  if (input.subgroups?.length) out.spc = buildXbarEvaluation(input.subgroups);
  if (Array.isArray(input.samples) && input.usl != null && input.lsl != null) {
    out.capability = capabilityIndices(input.samples, input.usl, input.lsl);
  }
  if (Array.isArray(input.raw_series)) out.anomalies = iqrOutliers(input.raw_series);
  if (input.signals) out.narrative = buildContextualStory(input.signals);
  return out;
}

module.exports = {
  runGovernanceAnalyticsPack
};
