'use strict';

const { kpiKey } = require('../kpiRuntimeEnforcement/domainKpiIsolation');

function analyzeKpiTargetingStability(kpisBefore = [], kpisAfter = [], ctx = {}) {
  const bKeys = new Set(kpisBefore.map(kpiKey));
  const aKeys = new Set(kpisAfter.map(kpiKey));
  let oscillation = 0;
  for (const k of bKeys) if (!aKeys.has(k)) oscillation++;
  for (const k of aKeys) if (!bKeys.has(k)) oscillation++;
  const stable = oscillation <= Math.max(2, Math.floor(kpisBefore.length * 0.5));

  return {
    stable,
    oscillation_delta: oscillation,
    before_count: kpisBefore.length,
    after_count: kpisAfter.length
  };
}

module.exports = { analyzeKpiTargetingStability };
