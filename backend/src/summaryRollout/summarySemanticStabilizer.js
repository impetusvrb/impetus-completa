'use strict';

const phaseV = require('./config/phaseVFeatureFlags');
const { alignNarrative } = require('./narrativeAlignmentEngine');
const { validateOperationalSummary } = require('./operationalSummaryValidator');

function stabilizeSummarySemantics(user, summaryPayload, ctx = {}) {
  const operational = validateOperationalSummary(user, summaryPayload, ctx);
  const narrative = alignNarrative(user, summaryPayload, ctx);

  const stable = operational.valid && narrative.narrative_integrity >= 0.7;

  return {
    stable,
    summary_semantic_alignment: narrative.narrative_alignment_score,
    operational,
    narrative,
    enforcement_active: phaseV.isSummarySemanticStabilizationEnabled(),
    shadow_only: !phaseV.isSummarySemanticStabilizationEnabled(),
    auto_correct: false
  };
}

module.exports = { stabilizeSummarySemantics };
