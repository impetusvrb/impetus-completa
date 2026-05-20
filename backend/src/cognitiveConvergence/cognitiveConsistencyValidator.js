'use strict';

const { compareChannelTruths } = require('./runtimeTruthComparator');

function validateCognitiveConsistency(ctx = {}) {
  const issues = [];
  const kpi = ctx.kpi_truth;
  const summary = ctx.summary_truth;
  const channelCmp = compareChannelTruths(kpi, summary);
  if (channelCmp.mismatch) {
    issues.push({ severity: 'high', type: 'kpi_summary_axis_mismatch', ...channelCmp });
  }
  if (ctx.ai_response_axis && ctx.runtime_axis && ctx.ai_response_axis !== ctx.runtime_axis) {
    issues.push({ severity: 'critical', type: 'ai_vs_runtime_truth' });
  }
  if (ctx.widget_domain && ctx.runtime_axis && ctx.widget_domain !== ctx.runtime_axis && ctx.widget_domain !== 'shared') {
    issues.push({ severity: 'medium', type: 'widget_vs_context_authority' });
  }

  const cognitive_consistency_score = issues.length === 0 ? 0.95 : Math.max(0.35, 0.95 - issues.length * 0.12);

  return {
    valid: !issues.some((i) => i.severity === 'critical'),
    issues,
    cognitive_consistency_score: Number(cognitive_consistency_score.toFixed(4)),
    channel_comparison: channelCmp
  };
}

module.exports = { validateCognitiveConsistency };
