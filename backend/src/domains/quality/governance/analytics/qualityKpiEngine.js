'use strict';

const { fpy, rty, copqEstimate } = require('./qualityIndustrialMetrics');

function computeKpiBundle({ passed, total, yields, scrap_cost, rework_cost }) {
  return {
    fpy_pct: fpy(passed, total),
    rty_pct: rty(yields),
    copq: copqEstimate(scrap_cost, rework_cost),
    advisory_only: true
  };
}

module.exports = {
  computeKpiBundle
};
