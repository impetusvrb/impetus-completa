'use strict';

const { validateKpiLeakage } = require('../kpiSafety/kpiLeakageValidator');

function adviseKpiNoiseReduction(kpis = [], ctx = {}) {
  const leakage = validateKpiLeakage(kpis, ctx);
  const recs = leakage.leakage_detected
    ? [{ action: 'review_cross_domain_kpis', priority: 'high', count: leakage.leakage_count }]
    : [];
  return { recommendations: recs, noise_detected: leakage.leakage_detected, auto_correct: false };
}

module.exports = { adviseKpiNoiseReduction };
