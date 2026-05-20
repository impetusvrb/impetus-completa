'use strict';

const phaseV = require('./config/phaseVFeatureFlags');
const { logPhaseV } = require('./phaseVLogger');
const { extractSummaryText } = require('./summaryPayloadUtils');

const AMBIGUOUS = /\b(talvez|possivelmente|não está claro|pode ser que)\b/i;
const GENERIC = /\b(em geral|de forma geral|situação normal|sem alterações significativas)\b/i;
const WEAK = /^.{0,60}$/s;

function validateContextualNarrative(user, summaryPayload, ctx = {}) {
  const text = extractSummaryText(summaryPayload);
  const issues = [];

  if (AMBIGUOUS.test(text)) issues.push({ type: 'contextual_ambiguity', severity: 'medium' });
  if (GENERIC.test(text)) issues.push({ type: 'generic_summary', severity: 'medium' });
  if (WEAK.test(text.trim())) issues.push({ type: 'weak_summary', severity: 'high' });
  if (summaryPayload?.narrative_conflict || summaryPayload?.conflicting_interpretation) {
    issues.push({ type: 'narrative_conflict', severity: 'high' });
  }
  if (summaryPayload?.hallucinated_operational) {
    issues.push({ type: 'hallucinated_operational_narrative', severity: 'critical' });
  }

  if (issues.some((i) => i.type === 'contextual_ambiguity') && phaseV.isSummaryGovernanceObservabilityEnabled()) {
    logPhaseV('SUMMARY_CONTEXTUAL_AMBIGUITY', { shadow_only: true });
  }
  if (summaryPayload?.narrative_drift && phaseV.isSummaryGovernanceObservabilityEnabled()) {
    logPhaseV('SUMMARY_NARRATIVE_DRIFT', { shadow_only: true });
  }

  return {
    valid: issues.filter((i) => i.severity === 'critical').length === 0,
    narrative_integrity: Number(Math.max(0.45, 1 - issues.length * 0.1).toFixed(4)),
    issues
  };
}

module.exports = { validateContextualNarrative };
