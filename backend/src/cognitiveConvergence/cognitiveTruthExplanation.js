'use strict';

function explainTruthDelivery(artifact, truthState, meta = {}) {
  const axis = truthState?.authority?.contextual_truth?.functional_axis || truthState?.contextual_truth?.functional_axis;
  const authority = meta.authority_layer || 'contextual_truth_authority';
  return {
    artifact,
    explanation: `Entrega de "${artifact}" originada no eixo "${axis}" via ${authority}.`,
    context_origin: axis,
    authority_layer: authority,
    semantic_state: truthState?.semantic_state || meta.semantic_state,
    runtime_truth_confidence: truthState?.runtime_truth_confidence ?? meta.confidence,
    winning_layer: meta.winning_layer || 'convergence_shadow'
  };
}

module.exports = { explainTruthDelivery };
