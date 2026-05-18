'use strict';

function buildExecutiveExplainability(partial = {}) {
  const p = partial && typeof partial === 'object' ? partial : {};
  return {
    version: 1,
    rationale: p.rationale != null ? String(p.rationale) : '',
    evidence: Array.isArray(p.evidence) ? p.evidence.slice(0, 48) : [],
    confidence:
      p.confidence != null && Number.isFinite(Number(p.confidence))
        ? Math.max(0, Math.min(1, Number(p.confidence)))
        : null,
    trend: p.trend != null ? String(p.trend) : null,
    maturity: p.maturity != null ? String(p.maturity) : null,
    risk: p.risk != null ? String(p.risk) : null,
    causal_chain: Array.isArray(p.causal_chain) ? p.causal_chain.slice(0, 16) : [],
    impact: p.impact != null ? String(p.impact) : null,
    origin: p.origin || 'environment_executive_runtime',
    assistive_only: true,
    no_authority_promotion: true,
    no_enforcement: true,
    human_review_required: true
  };
}

module.exports = { buildExecutiveExplainability };
