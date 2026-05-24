'use strict';

const { compareReasoning } = require('./zReasoningComparisonRuntime');
const { shadowContextAccuracy } = require('./zContextAccuracyShadowRuntime');
const sampler = require('../config/sz2ShadowSampling');

function runShadowDiff({ tenantId, message = '', continuity = {}, context = {}, reasoning = {}, legacyHints = {} } = {}) {
  if (!sampler.shadowEnabled()) return { skipped: true, reason: 'shadow_disabled' };
  if (!sampler.shouldSampleShadow(tenantId)) return { skipped: true, reason: 'not_sampled' };

  const ctxAcc = shadowContextAccuracy(message, continuity, context);
  const reasoningCmp = compareReasoning(legacyHints, reasoning);

  return {
    context_accuracy: ctxAcc,
    reasoning_comparison: reasoningCmp,
    compatibility_score: Number(
      ((ctxAcc.accuracy_score * 0.6) + (reasoningCmp.aligned ? 0.4 : 0.1)).toFixed(3)
    ),
    promote_safe: ctxAcc.accuracy_score >= 0.7 && reasoningCmp.aligned
  };
}

module.exports = { runShadowDiff };
