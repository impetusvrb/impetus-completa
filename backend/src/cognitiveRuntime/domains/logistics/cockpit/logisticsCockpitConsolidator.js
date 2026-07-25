'use strict';

const { LOGISTICS_PILOT_BLOCK_IDS } = require('../../../registry/logisticsCognitiveBlockPack');
const { buildLogisticsCentersFromShadow } = require('./logisticsCenters');
const { resolvePromotedLogisticsWidgetsFromShadow } = require('../../../renderPromotion/logistics/logisticsWidgetPromotionResolver');
const flags = require('../../../config/phaseLogisticsNativeFeatureFlags');

/**
 * INC-041 — Consolidator Z.23 logistics_native.
 * Consome shadow Z.19 + promotion Z.22; não consulta datasets nem recalcula binding.
 */
async function consolidateLogisticsCockpit(user = {}, payload = {}, ctx = {}, logisticsPilot = {}) {
  const shadow = logisticsPilot.shadow_cognitive_cockpit || {};
  const centers = buildLogisticsCentersFromShadow(shadow, logisticsPilot);
  const widgets =
    payload.widgets_promoted?.length > 0
      ? payload.widgets_promoted
      : resolvePromotedLogisticsWidgetsFromShadow(shadow, { max_widgets: flags.maxWidgets() });

  const boundBlocks = logisticsPilot?.engine_bridge?.bound_blocks || [];
  const bindingRatio = logisticsPilot?.engine_bridge?.binding_ratio ?? 0;
  const specializedCenters = centers.filter((c) => c.blocks?.length > 0).length;

  return {
    phase: 'Z.23',
    cockpit_mode: 'logistics_native',
    consolidation_applied: true,
    foundation_only: false,
    global_replace: false,
    auto_logistics: false,
    auto_action: false,
    centers,
    widgets,
    pilot_block_ids: LOGISTICS_PILOT_BLOCK_IDS,
    logistics_cognitive_health: {
      specialized_ratio: specializedCenters / Math.max(centers.length, 1),
      signal_ready: bindingRatio >= 0.35,
      semantic_ok: true,
      binding_ratio: bindingRatio,
      bound_blocks: boundBlocks.length,
      promotion_inc: 'INC-041'
    },
    skipped_reason: null
  };
}

module.exports = { consolidateLogisticsCockpit };
