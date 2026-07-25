'use strict';

const flags = require('../shared/supplyFeatureFlags');
const { runSupplyPromotion } = require('../runtime/supplyPromotionRuntime');
const { runSupplyPilotIntegration } = require('./supplyPilotIntegrationLayer');
const { consolidateSupplyPilotCockpit } = require('./supplyPilotCockpitConsolidation');
const { isSupplyPilotProfile, evaluatePilotPolicy } = require('./supplyPilotPolicy');
const { getSupplyPilotRegistry } = require('./supplyPilotRegistry');
const { SUPPLY_SEMANTIC_BLOCK_IDS } = require('../registry/supplySemanticBlockRegistry');

/**
 * GF-026 — Facade attachment (Pilot + CC consolidation).
 * Consumo Logística exclusivamente via Pilot Integration Layer.
 */
async function attachSupplyPilotRuntime(user = {}, payload = {}, report = {}, ctx = {}) {
  const profileOk = isSupplyPilotProfile(payload, ctx);
  const policy = evaluatePilotPolicy(user, ctx);

  if (!profileOk && !ctx.force_supply_pilot) {
    return { payload, report };
  }
  if (!policy.allowed && !ctx.force_supply_pilot) {
    return { payload, report };
  }

  const enriched = { ...payload };
  const semanticCtx = {
    ...ctx,
    tenant_id: user?.company_id,
    semantic_signals: ctx.semantic_signals || payload._supply_semantic_signals,
    profile_code: payload.profile_code
  };

  let promotionResult = enriched._supply_promotion_cache;
  if (!promotionResult) {
    promotionResult = await runSupplyPromotion(user, semanticCtx);
  }

  const integrationResult = await runSupplyPilotIntegration(user, semanticCtx, promotionResult);
  const consolidated = consolidateSupplyPilotCockpit(promotionResult, integrationResult);

  enriched.supply_signal_loader = Object.freeze({
    ok: promotionResult.ok,
    inactive: false,
    binding_ratio: promotionResult.binding_ratio,
    promotion_ratio: promotionResult.promotion_ratio,
    pilot_blocks: SUPPLY_SEMANTIC_BLOCK_IDS.slice(),
    bound_blocks: promotionResult.promoted_blocks.map((b) => b.block_id),
    signal_readiness: promotionResult.signal_bundle?.signal_readiness || 'NO_DATASET',
    phase: 'GF-026'
  });

  enriched.supply_cognitive_runtime = consolidated;
  enriched.supply_cognitive_centers = consolidated.supply_cognitive_centers;
  enriched.supply_pilot_integration = integrationResult;
  enriched.supply_pilot_registry = getSupplyPilotRegistry();

  const nextReport = {
    ...report,
    supply_pilot: {
      attached: true,
      runtime_id: 'supply_native',
      pilot_enabled: flags.isSupplyPilotEnabled(),
      cc_inbound: flags.isSupplyCcInboundEnabled(),
      logistics_bridge: flags.isSupplyLogisticsBridgeEnabled(),
      consolidation_applied: consolidated.consolidation_applied,
      promotion_applied: consolidated.promotion_applied,
      gf: 'GF-026'
    },
    supply_signal_loader: enriched.supply_signal_loader,
    supply_cognitive_runtime: consolidated
  };

  return { payload: enriched, report: nextReport };
}

module.exports = { attachSupplyPilotRuntime };
