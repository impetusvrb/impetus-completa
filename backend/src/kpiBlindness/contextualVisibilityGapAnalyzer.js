'use strict';

const { assessContextualVisibilityDeficit } = require('../kpiUnderdeliveryHardening/contextualVisibilityDeficit');

function analyzeContextualVisibilityGaps(kpis = [], ctx = {}) {
  const deficit = assessContextualVisibilityDeficit(kpis, ctx);
  return { gaps_detected: deficit.visibility_deficit, deficit_count: deficit.deficit_count, severity: deficit.severity };
}

module.exports = { analyzeContextualVisibilityGaps };
