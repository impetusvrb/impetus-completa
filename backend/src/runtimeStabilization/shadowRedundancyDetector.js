'use strict';

function detectShadowRedundancy(blocks = {}) {
  const shadowBlocks = Object.entries(blocks).filter(([, v]) => v?.shadow_only === true);
  return {
    shadow_block_count: shadowBlocks.length,
    redundant_shadow: shadowBlocks.length > 3,
    blocks: shadowBlocks.map(([k]) => k)
  };
}

module.exports = { detectShadowRedundancy };
