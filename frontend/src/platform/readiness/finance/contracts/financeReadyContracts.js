/**
 * FIN-READY-001 — Canonical contract catalog (read-only aggregation).
 */
import {
  DRIVER_RATE_CONTRACT,
  DRIVER_RATE_REGISTRY,
  validateDriverModel,
  FIN_READY_001_PHASE,
  FIN_READY_001_PRINCIPLE
} from '../driver-model/driverRateModel.js';
import {
  ASSET_COST_MAP_CONTRACT,
  ASSET_COST_REGISTRY,
  validateAssetCostMap
} from '../asset-cost-map/assetCostMap.js';
import {
  WMS_VALUATION_CONTRACT,
  WMS_VALUATION_CAPABILITY,
  validateWmsValuation
} from '../valuation/wmsValuationReadiness.js';

export const FINANCE_READY_CONTRACTS = Object.freeze([
  DRIVER_RATE_CONTRACT,
  ASSET_COST_MAP_CONTRACT,
  WMS_VALUATION_CONTRACT
]);

export function listFinanceReadyContracts() {
  return FINANCE_READY_CONTRACTS;
}

export function getContractById(id) {
  return FINANCE_READY_CONTRACTS.find((c) => c.id === id) ?? null;
}

export function validateFinanceReadyContracts() {
  const parts = [validateDriverModel(), validateAssetCostMap(), validateWmsValuation()];
  const issues = [];
  for (const c of FINANCE_READY_CONTRACTS) {
    if (!c.id || !c.version || !c.closesGap) issues.push(`incomplete contract ${c.id || '?'}`);
    if (!c.forbidden?.length) issues.push(`${c.id}: missing forbidden list`);
  }
  const ids = new Set();
  for (const c of FINANCE_READY_CONTRACTS) {
    if (ids.has(c.id)) issues.push(`duplicate contract ${c.id}`);
    ids.add(c.id);
  }
  for (const p of parts) {
    if (!p.valid) issues.push(...p.issues);
  }
  return {
    valid: issues.length === 0,
    issues,
    contracts: FINANCE_READY_CONTRACTS.length,
    registries: {
      driverMappings: DRIVER_RATE_REGISTRY.length,
      assetCostLinks: ASSET_COST_REGISTRY.length,
      valuationAvailable: WMS_VALUATION_CAPABILITY.available
    }
  };
}

export { FIN_READY_001_PHASE, FIN_READY_001_PRINCIPLE };
