'use strict';

/**
 * GF-025 — Promotion Runtime (REV-001 conformant).
 * Fluxo: Signal Binding → Resolver → Policy → Promoted Blocks → CC Foundation.
 */

const foundationConfig = require('../config/supplyFoundationConfig');
const { runSupplySignalBinding } = require('./supplySignalBindingRuntime');
const { resolvePromotableBlocks } = require('./supplyCognitiveBlockResolver');
const { evaluatePromotionPolicy, REJECTION_REASONS } = require('./supplyPromotionPolicy');
const { buildSupplyCommandCenterFoundation } = require('../cognitive/supplyCommandCenterRuntime');
const { recordPromotionRun, getPromotionMetricsSnapshot } = require('./supplyPromotionMetrics');
const { logSupplyPromotionEvent } = require('./supplyPromotionLogger');
const { SUPPLY_SEMANTIC_BLOCK_IDS } = require('../registry/supplySemanticBlockRegistry');

function _promotedBlock(cognitiveBlock, decision) {
  return Object.freeze({
    block_id: cognitiveBlock.block_id,
    entity: cognitiveBlock.entity,
    signal_count: cognitiveBlock.signal_count,
    promotion_status: 'PROMOTED',
    promotion_reason: decision.reason,
    explain: decision.explain,
    phase: 'Z.22',
    mode: 'semantic_promotion',
    read_only: true,
    render_active: false,
    metrics: Object.freeze({ ...cognitiveBlock.metrics })
  });
}

function _rejectedBlock(cognitiveBlock, decision) {
  return Object.freeze({
    block_id: cognitiveBlock.block_id,
    entity: cognitiveBlock.entity,
    promotion_status: 'REJECTED',
    rejection_reason: decision.reason,
    explain: decision.explain
  });
}

async function runSupplyPromotion(user = {}, ctx = {}) {
  const t0 = Date.now();
  const promotionEnabled = ctx.force_promotion === true || foundationConfig.allow_promotion === true;

  logSupplyPromotionEvent('runtime', 'PROMOTION_START', { runtime: 'supply_native' });

  const binding = await runSupplySignalBinding(user, ctx);
  const resolved = resolvePromotableBlocks(binding);
  const cognitiveBlocks = resolved.cognitive_blocks;

  const promoted_blocks = [];
  const rejected_blocks = [];

  for (const cognitiveBlock of cognitiveBlocks) {
    const decision = evaluatePromotionPolicy(cognitiveBlock, { promotion_enabled: promotionEnabled });
    if (decision.allowed) {
      promoted_blocks.push(_promotedBlock(cognitiveBlock, decision));
      logSupplyPromotionEvent('runtime', 'BLOCK_PROMOTED', { block_id: cognitiveBlock.block_id });
    } else {
      rejected_blocks.push(_rejectedBlock(cognitiveBlock, decision));
      logSupplyPromotionEvent('runtime', 'BLOCK_REJECTED', {
        block_id: cognitiveBlock.block_id,
        decision: decision.reason
      });
    }
  }

  const promotion_ratio =
    SUPPLY_SEMANTIC_BLOCK_IDS.length === 0
      ? 0
      : Math.round((promoted_blocks.length / SUPPLY_SEMANTIC_BLOCK_IDS.length) * 1000) / 1000;

  const duration_ms = Date.now() - t0;
  recordPromotionRun({
    blocks_received: cognitiveBlocks.length,
    blocks_promoted: promoted_blocks.length,
    blocks_rejected: rejected_blocks.length,
    duration_ms
  });

  const promotionPayload = Object.freeze({
    ok: binding.ok === true,
    inactive: true,
    read_only: true,
    phase: 'Z.22',
    gf: 'GF-025',
    rev_conformant: true,
    promotion_applied: promoted_blocks.length > 0,
    promotion_enabled: promotionEnabled,
    binding_ratio: binding.binding_ratio,
    promotion_ratio,
    promoted_blocks: Object.freeze(promoted_blocks),
    rejected_blocks: Object.freeze(rejected_blocks),
    duplicates_skipped: resolved.duplicates_skipped,
    signal_bundle: binding.signal_bundle,
    binding_validation: binding.binding_validation,
    metrics: getPromotionMetricsSnapshot(),
    event_publication: false,
    database_mutations: false,
    http_requests: false
  });

  const command_center_foundation = buildSupplyCommandCenterFoundation(promotionPayload);

  logSupplyPromotionEvent('runtime', 'PROMOTION_COMPLETE', {
    binding: promotion_ratio,
    duration_ms
  });

  return Object.freeze({
    ...promotionPayload,
    supply_command_center_foundation: command_center_foundation,
    supply_cognitive_centers: command_center_foundation.supply_cognitive_centers,
    centers_count: command_center_foundation.centers_count
  });
}

module.exports = {
  runSupplyPromotion,
  REJECTION_REASONS
};
