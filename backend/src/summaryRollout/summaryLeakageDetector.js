'use strict';

const phaseV = require('./config/phaseVFeatureFlags');
const { logPhaseV } = require('./phaseVLogger');
const { validateContextualSummary } = require('./contextualSummaryValidator');
const { validateHierarchySummary } = require('./hierarchySummaryValidator');
const { normalizeAxis } = require('../kpiRollout/kpiDomainRegistry');

const CROSS_DOMAIN_PATTERNS = {
  financial: /\b(margem|receita|ebitda|lucro)\b/i,
  hr: /\b(turnover|headcount|clima organizacional)\b/i,
  safety: /\b(lti|trir|acidente|SST)\b/i,
  environmental: /\b(emissão|ESG|resíduo)\b/i,
  quality: /\b(NC|não conformidade|defeito)\b/i
};

function detectSummaryLeakage(user, summaryPayload, ctx = {}) {
  const contextual = validateContextualSummary(user, summaryPayload, ctx);
  const hierarchy = validateHierarchySummary(user, summaryPayload, ctx);
  const userAxis = normalizeAxis(ctx.functional_axis || user?.functional_axis);
  const text = require('./summaryPayloadUtils').extractSummaryText(summaryPayload);
  const leaks = [...contextual.issues, ...hierarchy.issues];

  for (const [domain, pattern] of Object.entries(CROSS_DOMAIN_PATTERNS)) {
    if (domain !== userAxis && pattern.test(text)) {
      leaks.push({ type: 'cross_domain_summary_exposure', domain, severity: 'high' });
    }
  }

  if (leaks.length && phaseV.isSummaryGovernanceObservabilityEnabled()) {
    logPhaseV('SUMMARY_LEAKAGE_DETECTED', { count: leaks.length, tenant_id: ctx.tenant_id, shadow_only: true });
  }

  return {
    leakage_detected: leaks.length > 0,
    leakage_count: leaks.length,
    leaks,
    auto_correct: false
  };
}

module.exports = { detectSummaryLeakage };
