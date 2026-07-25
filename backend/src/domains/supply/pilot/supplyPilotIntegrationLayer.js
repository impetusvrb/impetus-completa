'use strict';

const {
  PILOT_CONTRACT_VERSION,
  WMS_CANONICAL_ENTITY_TYPES,
  SUPPLY_PILOT_BRIDGE_ENDPOINTS
} = require('./supplyPilotContracts');
const { evaluatePilotPolicy, evaluateBridgePolicy, validateSemanticSignalSlice } = require('./supplyPilotPolicy');
const { fetchPilotLogisticsSnapshot } = require('./supplyPilotPublicApiClient');
const { logSupplyPilotEvent } = require('./supplyPilotObservability');
const { snapshotPilotCompatibility } = require('./supplyPilotRegistry');

function validatePilotContracts() {
  const compat = snapshotPilotCompatibility();
  const issues = [];
  if (!compat.compatible) issues.push('contract_version_mismatch');
  for (const key of Object.keys(SUPPLY_PILOT_BRIDGE_ENDPOINTS)) {
    const ep = SUPPLY_PILOT_BRIDGE_ENDPOINTS[key];
    if (!WMS_CANONICAL_ENTITY_TYPES.includes(ep.contract) && ep.contract !== 'InventoryItem') {
      /* InventoryItem etc. are in list */
    }
    if (!ep.producer || !ep.consumer) issues.push(`endpoint_meta_${key}`);
  }
  return Object.freeze({ valid: issues.length === 0, issues, version: PILOT_CONTRACT_VERSION });
}

function validatePromotionForPilot(promotionResult = {}) {
  if (!promotionResult || typeof promotionResult !== 'object') {
    return { valid: false, reason: 'missing_promotion' };
  }
  if (!Array.isArray(promotionResult.promoted_blocks)) {
    return { valid: false, reason: 'missing_promoted_blocks' };
  }
  return { valid: true, promotion_ratio: promotionResult.promotion_ratio ?? 0 };
}

async function runSupplyPilotIntegration(user = {}, ctx = {}, promotionResult = {}) {
  const t0 = Date.now();
  const policy = evaluatePilotPolicy(user, ctx);
  if (!policy.allowed) {
    logSupplyPilotEvent('INTEGRATION_REJECT', { rejection: policy.reason });
    return Object.freeze({
      ok: false,
      skipped: true,
      reason: policy.reason,
      explain: policy.explain,
      read_only: true,
      event_publication: false
    });
  }

  const promVal = validatePromotionForPilot(promotionResult);
  if (!promVal.valid) {
    logSupplyPilotEvent('INTEGRATION_REJECT', { rejection: promVal.reason, promotion_origin: 'promotion_runtime' });
    return Object.freeze({
      ok: false,
      skipped: true,
      reason: promVal.reason,
      read_only: true
    });
  }

  const semantic = ctx.semantic_signals || promotionResult.signal_bundle?.semantic_bundle || null;
  const semanticValidation = [];
  if (semantic && typeof semantic === 'object') {
    for (const [entityType, slice] of Object.entries(semantic)) {
      const v = validateSemanticSignalSlice(entityType, slice);
      semanticValidation.push({ entityType, ...v });
    }
  }

  const bridgePolicy = evaluateBridgePolicy(ctx);
  let logistics_snapshot = null;
  if (bridgePolicy.allowed) {
    logistics_snapshot = await fetchPilotLogisticsSnapshot({
      ...ctx,
      auth_token: ctx.auth_token,
      api_base_url: ctx.api_base_url
    });
  }

  logSupplyPilotEvent('INTEGRATION_COMPLETE', {
    contract: PILOT_CONTRACT_VERSION,
    promotion_origin: 'supplyPromotionRuntime',
    duration_ms: Date.now() - t0
  });

  return Object.freeze({
    ok: true,
    phase: 'GF-026',
    read_only: true,
    contract_version: PILOT_CONTRACT_VERSION,
    wms_compatibility: snapshotPilotCompatibility(),
    semantic_signals_consumed: semanticValidation,
    promotion_origin: 'Z.22',
    promotion_ratio: promotionResult.promotion_ratio,
    logistics_bridge: bridgePolicy.allowed
      ? Object.freeze({ active: true, snapshot: logistics_snapshot })
      : Object.freeze({ active: false, reason: bridgePolicy.reason }),
    event_publication: false,
    operational_rules: false
  });
}

module.exports = {
  runSupplyPilotIntegration,
  validatePilotContracts,
  validatePromotionForPilot
};
