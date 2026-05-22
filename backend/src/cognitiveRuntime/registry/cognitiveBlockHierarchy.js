'use strict';

const { resolveHierarchyTier } = require('./cognitiveBlockAuthority');

/**
 * Operational weighting por persona — ETAPA 6 da auditoria cognitiva.
 * Pesos estáticos configuráveis; runtime adaptive reservado para fase futura.
 */
const PERSONA_WEIGHTING = Object.freeze({
  executive: { operational: 0.05, management: 0.15, strategic: 0.8 },
  direction: { operational: 0.1, management: 0.3, strategic: 0.6 },
  management: { operational: 0.4, management: 0.4, strategic: 0.2 },
  coordination: { operational: 0.7, management: 0.2, strategic: 0.1 },
  supervision: { operational: 0.85, management: 0.1, strategic: 0.05 },
  operational: { operational: 0.95, management: 0.05, strategic: 0 }
});

function getPersonaWeighting(ctx = {}) {
  const tier = resolveHierarchyTier(ctx);
  return PERSONA_WEIGHTING[tier] || PERSONA_WEIGHTING.coordination;
}

/**
 * Score de relevância do bloco para a persona (0–1).
 */
function scoreBlockRelevanceForPersona(block, ctx = {}) {
  const persona = getPersonaWeighting(ctx);
  const h = block.hierarchy || {};
  const raw =
    (h.operational_weight || 0) * persona.operational +
    (h.management_weight || 0) * persona.management +
    (h.strategic_weight || 0) * persona.strategic;
  return Math.min(1, Math.max(0, raw));
}

function rankBlocksForPersona(blocks, ctx = {}) {
  return [...blocks]
    .map((b) => ({
      block_id: b.id,
      relevance_score: scoreBlockRelevanceForPersona(b, ctx),
      persona_weighting: getPersonaWeighting(ctx)
    }))
    .sort((a, b) => b.relevance_score - a.relevance_score);
}

module.exports = {
  PERSONA_WEIGHTING,
  getPersonaWeighting,
  scoreBlockRelevanceForPersona,
  rankBlocksForPersona
};
