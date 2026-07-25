'use strict';

const { PPAP_BLOCK_ALIASES } = require('../../registry/ppapCognitiveBlockPack');

function _blockToWidget(blockId = '') {
  const canonical = PPAP_BLOCK_ALIASES[blockId] || blockId;
  if (canonical.includes('narrative') || canonical.includes('contextual')) {
    return { id: 'assistente_ia', render_promoted: true, domain: 'ppap_native' };
  }
  return { id: 'qualidade', render_promoted: true, domain: 'ppap_native' };
}

function resolvePromotedPpapWidgetsFromShadow(shadow = {}, opts = {}) {
  const max = opts.max_widgets || 8;
  const blocks = (shadow.blocks || []).filter((b) => b.eligible || b.shadow_signals?.binding_ok);
  const fromBlocks = blocks.map((b) => _blockToWidget(b.block_id || b.id));
  const merged = fromBlocks.length ? fromBlocks : [{ id: 'qualidade', render_promoted: true, domain: 'ppap_native' }];
  const seen = new Set();
  return merged
    .filter((w) => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    })
    .slice(0, max);
}

module.exports = { resolvePromotedPpapWidgetsFromShadow };
