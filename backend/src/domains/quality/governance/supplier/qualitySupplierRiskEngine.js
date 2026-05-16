'use strict';

const { supplierTrendDelta } = require('./qualitySupplierAnalytics');

function supplierRiskHeat(score0_100, driftDelta) {
  const s = score0_100 == null ? 50 : Number(score0_100);
  let risk = 'medium';
  if (s < 40 || (driftDelta != null && driftDelta > 5)) risk = 'high';
  if (s > 75 && (driftDelta == null || driftDelta < 2)) risk = 'low';
  return { band: risk, inputs: { score: s, drift: driftDelta } };
}

function supplierDriftAnalysis(ppmSeries) {
  return supplierTrendDelta(ppmSeries);
}

module.exports = {
  supplierRiskHeat,
  supplierDriftAnalysis
};
