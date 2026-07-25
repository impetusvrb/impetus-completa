'use strict';

/**
 * GF-025 — Resolve blocos cognitivos promovíveis a partir do binding Z.20.
 * Proibido: entidades de domínio, serviços, BD.
 */

const { SUPPLY_SEMANTIC_BLOCK_IDS } = require('../registry/supplySemanticBlockRegistry');
const { logSupplyPromotionEvent } = require('./supplyPromotionLogger');

function _toCognitiveBlock(enrichedEntry = {}) {
  const shadow = enrichedEntry.shadow_signals || {};
  return Object.freeze({
    block_id: enrichedEntry.block_id,
    binding_ok: shadow.binding_ok === true,
    binding_reason: shadow.reason || null,
    entity: shadow.entity || null,
    signal_count: shadow.signal_count ?? 0,
    bridge_status: shadow.bridge_status || null,
    phase: shadow.phase || 'Z.20',
    mode: shadow.mode || 'semantic_read_only',
    metrics: shadow.metrics || {},
    source: 'semantic_block_bridge',
    integrity_ok: SUPPLY_SEMANTIC_BLOCK_IDS.includes(enrichedEntry.block_id)
  });
}

function resolvePromotableBlocks(bindingResult = {}) {
  const t0 = Date.now();
  const enriched = bindingResult.enriched_blocks || [];
  const seen = new Set();
  const resolved = [];
  const duplicates = [];

  for (const entry of enriched) {
    const blockId = entry.block_id;
    if (seen.has(blockId)) {
      duplicates.push(blockId);
      logSupplyPromotionEvent('resolver', 'DUPLICATE_SKIP', { block_id: blockId });
      continue;
    }
    seen.add(blockId);
    const cognitive = _toCognitiveBlock(entry);
    if (!cognitive.integrity_ok) {
      logSupplyPromotionEvent('resolver', 'INTEGRITY_FAIL', { block_id: blockId });
    }
    resolved.push(cognitive);
  }

  logSupplyPromotionEvent('resolver', 'RESOLVE_COMPLETE', {
    binding: resolved.length,
    duration_ms: Date.now() - t0
  });

  return Object.freeze({
    cognitive_blocks: Object.freeze(resolved),
    duplicates_skipped: Object.freeze(duplicates),
    total: resolved.length
  });
}

module.exports = {
  resolvePromotableBlocks,
  _toCognitiveBlock
};
