'use strict';

const { preserveExecutiveStrategicKpis } = require('../kpiGracefulPreservation/executiveStrategicKpiPreservation');

function ensureExecutiveKpiMinimums(kpis = [], original = [], ctx = {}) {
  return { ...preserveExecutiveStrategicKpis(kpis, original, ctx), fabricated: false };
}

module.exports = { ensureExecutiveKpiMinimums };
