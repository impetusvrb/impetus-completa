'use strict';

const { analyzeOperationalKpiQuality } = require('../kpiOperationalQuality/operationalKpiQualityFacade');

function assessContextualDashboardConsistency(kpis = [], ctx = {}) {
  const quality = analyzeOperationalKpiQuality(kpis, ctx);
  return {
    consistent: quality.usefulness.operationally_useful && !quality.noise.noise_detected,
    quality
  };
}

module.exports = { assessContextualDashboardConsistency };
