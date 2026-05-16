'use strict';

const { buildPropagationGraph } = require('../capa/qualityRiskPropagation');

function qualityRiskPropagationGraph(edges) {
  return buildPropagationGraph(edges);
}

module.exports = {
  qualityRiskPropagationGraph
};
