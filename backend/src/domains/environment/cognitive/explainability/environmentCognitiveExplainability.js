'use strict';

function buildCognitiveExplainability(partial = {}) {
  const p = partial && typeof partial === 'object' ? partial : {};
  return {
    version: 1,
    rationale: p.rationale != null ? String(p.rationale) : '',
    evidence: Array.isArray(p.evidence) ? p.evidence.slice(0, 64) : [],
    score: p.score != null && Number.isFinite(Number(p.score)) ? Number(p.score) : null,
    confidence:
      p.confidence != null && Number.isFinite(Number(p.confidence))
        ? Math.max(0, Math.min(1, Number(p.confidence)))
        : null,
    limits: p.limits && typeof p.limits === 'object' ? p.limits : {},
    origin: p.origin != null ? String(p.origin) : 'environment_cognitive_runtime',
    calculation: p.calculation != null ? String(p.calculation) : '',
    contributing_factors: Array.isArray(p.contributing_factors) ? p.contributing_factors.slice(0, 32) : [],
    related_event_hints: Array.isArray(p.related_event_hints) ? p.related_event_hints.slice(0, 24) : [],
    context: p.context && typeof p.context === 'object' ? p.context : {},
    causal_chain: Array.isArray(p.causal_chain) ? p.causal_chain.slice(0, 16) : [],
    human_review_required: true,
    assistive_only: true,
    no_authority_promotion: true,
    no_plc_write: true,
    no_operation_block: true
  };
}

module.exports = { buildCognitiveExplainability };
