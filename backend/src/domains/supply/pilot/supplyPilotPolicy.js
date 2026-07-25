'use strict';

const flags = require('../shared/supplyFeatureFlags');
const { isTenantPilotEnabled, snapshotPilotCompatibility } = require('./supplyPilotRegistry');
const { PILOT_CONTRACT_VERSION, WMS_CANONICAL_ENTITY_TYPES } = require('./supplyPilotContracts');
const { logSupplyPilotEvent } = require('./supplyPilotObservability');

const REJECTION = Object.freeze({
  PILOT_DISABLED: 'PILOT_DISABLED',
  TENANT_NOT_ENROLLED: 'TENANT_NOT_ENROLLED',
  CONTRACT_VERSION_MISMATCH: 'CONTRACT_VERSION_MISMATCH',
  INVALID_SEMANTIC_SIGNAL: 'INVALID_SEMANTIC_SIGNAL',
  BRIDGE_DISABLED: 'BRIDGE_DISABLED',
  INCOMPATIBLE_ENTITY: 'INCOMPATIBLE_ENTITY'
});

function evaluatePilotPolicy(user = {}, ctx = {}) {
  const forced = ctx.force_supply_pilot === true;
  if (!forced && !flags.isSupplyPilotEnabled()) {
    return { allowed: false, reason: REJECTION.PILOT_DISABLED, explain: 'IMPETUS_SUPPLY_PILOT_ENABLED=false' };
  }
  const companyId = user?.company_id || ctx.tenant_id;
  if (!forced && companyId && !isTenantPilotEnabled(companyId) && flags.isSupplyPilotStrictTenants() && flags.isSupplyPilotEnabled()) {
    return { allowed: false, reason: REJECTION.TENANT_NOT_ENROLLED, explain: 'tenant not in pilot registry' };
  }
  const compat = snapshotPilotCompatibility();
  if (!compat.compatible && !forced) {
    return { allowed: false, reason: REJECTION.CONTRACT_VERSION_MISMATCH, explain: 'WMS contract version drift' };
  }
  return {
    allowed: true,
    reason: 'PILOT_ELIGIBLE',
    contract_version: PILOT_CONTRACT_VERSION,
    wms_compatible: compat.wms_compatible
  };
}

function evaluateBridgePolicy(ctx = {}) {
  if (ctx.force_logistics_bridge === true) return { allowed: true, reason: 'FORCED' };
  if (!flags.isSupplyLogisticsBridgeEnabled()) {
    return { allowed: false, reason: REJECTION.BRIDGE_DISABLED };
  }
  return { allowed: true, reason: 'BRIDGE_ENABLED' };
}

function validateSemanticSignalSlice(entityType, slice = {}) {
  if (!WMS_CANONICAL_ENTITY_TYPES.includes(entityType) && !['Supplier', 'PurchaseRequest', 'PurchaseOrder', 'Quotation', 'Contract', 'Approval', 'SpendCenter'].includes(entityType)) {
    return { valid: false, reason: REJECTION.INCOMPATIBLE_ENTITY };
  }
  if (slice.counts && typeof slice.counts === 'object') return { valid: true };
  return { valid: true, optional: true };
}

function isSupplyPilotProfile(payload = {}, ctx = {}) {
  if (ctx.force_supply_pilot) return true;
  const code = String(payload.profile_code || ctx.profile_code || '');
  const area = String(payload.functional_area || ctx.functional_area || '');
  return /supply|procurement|suprimentos|compras/i.test(code) || /supply|procurement|logistics/i.test(area);
}

module.exports = {
  REJECTION,
  evaluatePilotPolicy,
  evaluateBridgePolicy,
  validateSemanticSignalSlice,
  isSupplyPilotProfile
};
