'use strict';

const phaseX = require('./config/phaseXFeatureFlags');
const { logPhaseX } = require('./phaseXLogger');
const { extractInsights } = require('./runtimePayloadUtils');

function validateInsightGenerationIntegrity(payload, ctx = {}) {
  const insights = extractInsights(payload);
  const issues = [];

  for (const ins of insights) {
    const text = String(ins.text || ins.summary || ins.title || '');
    if (!text || text.length < 30) issues.push({ type: 'empty_insight', id: ins.id, severity: 'high' });
    if (!ins.actionable && !/\b(recomend|prioriz|verificar|ação)\b/i.test(text)) {
      issues.push({ type: 'low_actionable_intelligence', id: ins.id, severity: 'medium' });
    }
    if (/em geral|sem grandes alterações/i.test(text)) {
      issues.push({ type: 'generic_insight', id: ins.id, severity: 'low' });
    }
  }

  if (insights.length === 0 && ctx.expect_insights) {
    issues.push({ type: 'insight_gap', severity: 'medium' });
  }

  if (issues.some((i) => i.type === 'empty_insight' || i.type === 'low_actionable_intelligence')) {
    logPhaseX('LOW_INSIGHT_UTILITY_DETECTED', { count: issues.length, shadow_only: true });
  }

  const utility = insights.length
    ? 1 - issues.filter((i) => i.severity === 'high').length / insights.length
    : 0.5;

  return {
    insight_utility_score: Number(Math.max(0.35, utility).toFixed(4)),
    insight_count: insights.length,
    issues,
    invented_insights: false,
    auto_generate: false
  };
}

module.exports = { validateInsightGenerationIntegrity };
