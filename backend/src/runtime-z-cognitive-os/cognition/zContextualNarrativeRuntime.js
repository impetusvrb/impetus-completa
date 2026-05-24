'use strict';

/**
 * Gera uma narrativa curta, neutra e operacional do que o Runtime Z
 * "entende" do estado actual. Frase única, sem ornamentos.
 */
function buildContextualNarrative({ awareness = {}, continuity = {}, reasoning = {}, actions = {}, fusion = {} } = {}) {
  const parts = [];

  if (continuity?.inherited_context) {
    parts.push(
      `Contexto herdado: "${(continuity.inherited_context.summary || '').slice(0, 90)}"`
    );
  }

  if (awareness?.operational_state && awareness.operational_state !== 'idle') {
    parts.push(`Estado operacional ${awareness.operational_state}`);
  }

  if (awareness?.shift) {
    parts.push(`turno ${awareness.shift.replace('turno_', '')}`);
  }

  if (reasoning?.priority?.tier && reasoning.priority.tier !== 'P4') {
    parts.push(`prioridade ${reasoning.priority.tier} sugerida`);
  }

  if (reasoning?.detected_risks?.length) {
    parts.push(`riscos: ${reasoning.detected_risks.join(', ')}`);
  }

  if (actions?.count) {
    parts.push(`${actions.count} acção(ões) preparada(s) para revisão humana`);
  }

  const narrative = parts.length
    ? parts.join(' · ')
    : 'Estado operacional estável, sem inferências críticas.';

  return {
    narrative,
    sentences: parts,
    cognitive_density: fusion?.cognitive_density || 0,
    natural: true
  };
}

module.exports = { buildContextualNarrative };
