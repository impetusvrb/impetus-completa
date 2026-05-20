'use strict';

const { buildCompositionGraph } = require('./contextCompositionGraph');

function buildSemanticGraph(ctx = {}) {
  const comp = buildCompositionGraph(ctx);
  return {
    ...comp,
    semantic_layers: ['publication', 'alignment', 'precision', 'convergence'],
    convergence_target: 'runtime_truth_state'
  };
}

module.exports = { buildSemanticGraph };
