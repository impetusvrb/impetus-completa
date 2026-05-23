'use strict';

const { getDomainDensityLimits } = require('../registry/cognitiveDomainRegistry');

function balanceRuntimeDensity(domain, blocks = [], opts = {}) {
  const limits = getDomainDensityLimits(domain);
  const maxBlocks = opts.max_blocks ?? limits.max_centers ?? 6;
  const maxMetrics = opts.max_metrics ?? limits.max_metrics_per_center ?? 8;

  const capped = blocks.slice(0, maxBlocks);
  const overload = blocks.length > maxBlocks;

  return {
    blocks: capped,
    density: {
      block_count: capped.length,
      source_count: blocks.length,
      capped: overload,
      max_blocks: maxBlocks,
      max_metrics: maxMetrics
    }
  };
}

module.exports = { balanceRuntimeDensity };
