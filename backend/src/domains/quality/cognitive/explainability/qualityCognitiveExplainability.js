'use strict';

/**
 * Envelope canónico de explicabilidade — nada de caixa-preta; decisões não automáticas.
 */

function buildCognitiveExplainability(partial = {}) {
  const p = partial && typeof partial === 'object' ? partial : {};
  return {
    version: 1,
    rationale: p.rationale != null ? String(p.rationale) : '',
    evidence: Array.isArray(p.evidence) ? p.evidence.slice(0, 64) : [],
    score: p.score != null && Number.isFinite(Number(p.score)) ? Number(p.score) : null,
    confidence: p.confidence != null && Number.isFinite(Number(p.confidence)) ? Math.max(0, Math.min(1, Number(p.confidence))) : null,
    limits: p.limits && typeof p.limits === 'object' ? p.limits : {},
    origin: p.origin != null ? String(p.origin) : 'quality_cognitive_runtime',
    calculation: p.calculation != null ? String(p.calculation) : '',
    contributing_factors: Array.isArray(p.contributing_factors) ? p.contributing_factors.slice(0, 32) : [],
    related_event_hints: Array.isArray(p.related_event_hints) ? p.related_event_hints.slice(0, 24) : [],
    context: p.context && typeof p.context === 'object' ? p.context : {},
    human_review_required: true,
    assistive_only: true,
    no_authority_promotion: true
  };
}

function mergeExplainability(base, patch = {}) {
  const b = buildCognitiveExplainability(base);
  const x = buildCognitiveExplainability(patch);
  return {
    ...b,
    ...x,
    evidence: [...b.evidence, ...x.evidence].slice(0, 64),
    contributing_factors: [...b.contributing_factors, ...x.contributing_factors].slice(0, 32),
    related_event_hints: [...b.related_event_hints, ...x.related_event_hints].slice(0, 24),
    context: { ...b.context, ...x.context }
  };
}

module.exports = { buildCognitiveExplainability, mergeExplainability };
