'use strict';

const { LOGISTICS_BLOCK_ALIASES } = require('../../registry/logisticsCognitiveBlockPack');

function _blockToWidget(blockId = '') {
  const canonical = LOGISTICS_BLOCK_ALIASES[blockId] || blockId;
  if (canonical.includes('inventory') || canonical.includes('warehouse_capacity')) {
    return { id: 'estoque', render_promoted: true, domain: 'logistics_native' };
  }
  if (canonical.includes('shipment') || canonical.includes('picking') || canonical.includes('outbound')) {
    return { id: 'logistica', render_promoted: true, domain: 'logistics_native' };
  }
  if (canonical.includes('fleet') || canonical.includes('route') || canonical.includes('dock')) {
    return { id: 'logistica', render_promoted: true, domain: 'logistics_native' };
  }
  if (canonical.includes('receiving') || canonical.includes('supplier') || canonical.includes('traceability')) {
    return { id: 'estoque', render_promoted: true, domain: 'logistics_native' };
  }
  if (canonical.includes('narrative') || canonical.includes('contextual')) {
    return { id: 'assistente_ia', render_promoted: true, domain: 'logistics_native' };
  }
  return { id: 'logistica', render_promoted: true, domain: 'logistics_native' };
}

function resolvePromotedLogisticsWidgetsFromShadow(shadow = {}, opts = {}) {
  const max = opts.max_widgets || 8;
  const blocks = (shadow.blocks || []).filter((b) => b.eligible || b.shadow_signals?.binding_ok);
  const fromBlocks = blocks.map((b) => _blockToWidget(b.block_id || b.id));
  const defaults = ['estoque', 'logistica'].map((id) => ({ id, render_promoted: true, domain: 'logistics_native' }));
  const merged = fromBlocks.length ? fromBlocks : defaults;
  const seen = new Set();
  return merged
    .filter((w) => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    })
    .slice(0, max);
}

module.exports = { resolvePromotedLogisticsWidgetsFromShadow };
