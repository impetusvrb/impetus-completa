'use strict';

const { explainTruthDelivery } = require('./cognitiveTruthExplanation');
const { traceDecision } = require('./runtimeDecisionTrace');

function resolveUnifiedExplainability(report = {}) {
  const explanations = [];
  if (report.runtime_truth_state) {
    explanations.push(explainTruthDelivery('runtime', report.runtime_truth_state, { winning_layer: 'unified_context' }));
  }
  if (report.kpi_truth) {
    explanations.push(explainTruthDelivery('kpi', report.runtime_truth_state, { authority_layer: 'unified_kpi_truth_resolver' }));
  }
  if (report.summary_truth) {
    explanations.push(explainTruthDelivery('summary', report.runtime_truth_state, { authority_layer: 'unified_summary_truth_resolver' }));
  }
  for (const e of explanations) {
    traceDecision({ type: 'explainability', ...e });
  }
  return { explanations, generated_at: new Date().toISOString() };
}

module.exports = { resolveUnifiedExplainability };
