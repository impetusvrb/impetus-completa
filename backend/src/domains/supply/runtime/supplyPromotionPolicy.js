'use strict';

/**
 * GF-025 — Promotion Policy (Read-Only · semantic blocks only).
 */

const { logSupplyPromotionEvent } = require('./supplyPromotionLogger');

const REJECTION_REASONS = Object.freeze({
  NOT_COGNITIVE_BLOCK: 'NOT_COGNITIVE_BLOCK',
  BINDING_FAILED: 'BINDING_FAILED',
  ZERO_SIGNAL: 'ZERO_SIGNAL',
  DUPLICATE_BLOCK: 'DUPLICATE_BLOCK',
  PROMOTION_DISABLED: 'PROMOTION_DISABLED',
  INVALID_BLOCK_INTEGRITY: 'INVALID_BLOCK_INTEGRITY'
});

function evaluatePromotionPolicy(cognitiveBlock = {}, ctx = {}) {
  const t0 = Date.now();
  const blockId = cognitiveBlock.block_id;

  if (!blockId || typeof blockId !== 'string') {
    const decision = Object.freeze({
      allowed: false,
      reason: REJECTION_REASONS.NOT_COGNITIVE_BLOCK,
      explain: 'block_id ausente — não é bloco cognitivo',
      block_id: null
    });
    logSupplyPromotionEvent('policy', 'REJECT', { block_id: null, decision: decision.reason, duration_ms: Date.now() - t0 });
    return decision;
  }

  if (ctx.promotion_enabled === false) {
    const decision = Object.freeze({
      allowed: false,
      reason: REJECTION_REASONS.PROMOTION_DISABLED,
      explain: 'promotion gate desligado',
      block_id: blockId
    });
    logSupplyPromotionEvent('policy', 'REJECT', { block_id: blockId, decision: decision.reason, duration_ms: Date.now() - t0 });
    return decision;
  }

  if (cognitiveBlock.integrity_ok !== true) {
    const decision = Object.freeze({
      allowed: false,
      reason: REJECTION_REASONS.INVALID_BLOCK_INTEGRITY,
      explain: 'integridade do bloco não validada pelo resolver',
      block_id: blockId
    });
    logSupplyPromotionEvent('policy', 'REJECT', { block_id: blockId, decision: decision.reason, duration_ms: Date.now() - t0 });
    return decision;
  }

  if (cognitiveBlock.binding_ok !== true) {
    const decision = Object.freeze({
      allowed: false,
      reason: REJECTION_REASONS.BINDING_FAILED,
      explain: cognitiveBlock.binding_reason || 'semântica não ligada',
      block_id: blockId
    });
    logSupplyPromotionEvent('policy', 'REJECT', { block_id: blockId, decision: decision.reason, duration_ms: Date.now() - t0 });
    return decision;
  }

  if ((cognitiveBlock.signal_count || 0) <= 0) {
    const decision = Object.freeze({
      allowed: false,
      reason: REJECTION_REASONS.ZERO_SIGNAL,
      explain: 'contagem semântica zero',
      block_id: blockId
    });
    logSupplyPromotionEvent('policy', 'REJECT', { block_id: blockId, decision: decision.reason, duration_ms: Date.now() - t0 });
    return decision;
  }

  const decision = Object.freeze({
    allowed: true,
    reason: 'PROMOTION_ELIGIBLE',
    explain: 'bloco cognitivo elegível via semântica SSOT',
    block_id: blockId,
    signal_count: cognitiveBlock.signal_count,
    entity: cognitiveBlock.entity
  });
  logSupplyPromotionEvent('policy', 'ALLOW', { block_id: blockId, decision: decision.reason, duration_ms: Date.now() - t0 });
  return decision;
}

module.exports = {
  REJECTION_REASONS,
  evaluatePromotionPolicy
};
