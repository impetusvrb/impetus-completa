'use strict';

const phaseV = require('./config/phaseVFeatureFlags');
const { logPhaseV } = require('./phaseVLogger');
const { extractSummaryText } = require('./summaryPayloadUtils');
const { analyzeSummaryUsefulness } = require('./summaryUsefulnessAnalyzer');

function detectSummaryUnderdelivery(user, summaryPayload, ctx = {}) {
  const text = extractSummaryText(summaryPayload);
  const minLen = ctx.min_summary_length ?? 80;
  const usefulness = analyzeSummaryUsefulness(summaryPayload, ctx);
  const underdelivery = !text || text.length < minLen || usefulness.low_usefulness;

  if (underdelivery && phaseV.isSummaryGovernanceObservabilityEnabled()) {
    logPhaseV('SUMMARY_UNDERDELIVERY_DETECTED', {
      length: text.length,
      tenant_id: ctx.tenant_id,
      shadow_only: true
    });
  }

  return {
    underdelivery,
    length: text.length,
    min_expected: minLen,
    usefulness,
    auto_correct: false
  };
}

module.exports = { detectSummaryUnderdelivery };
