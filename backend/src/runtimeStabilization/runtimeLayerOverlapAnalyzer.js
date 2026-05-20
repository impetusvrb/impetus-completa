'use strict';

const { analyzePipelineRedundancy } = require('./pipelineRedundancyAnalyzer');

function analyzeLayerOverlap(activeBlocks = {}) {
  const redundancy = analyzePipelineRedundancy(activeBlocks);
  return {
    ...redundancy,
    layer_count: redundancy.active_pipelines.length,
    overlap_score: Number(Math.min(1, redundancy.redundancy_count * 0.25).toFixed(4))
  };
}

module.exports = { analyzeLayerOverlap };
