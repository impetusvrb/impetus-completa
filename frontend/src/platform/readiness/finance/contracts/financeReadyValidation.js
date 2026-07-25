/**
 * FIN-READY-001 — Readiness validation: close FIN-DATA-001 blockers.
 * Does NOT open product capabilities (Smart Costing / Twin remain gated).
 */
import { validateDriverModel, FIN_READY_001_PHASE, FIN_READY_001_PRINCIPLE } from '../driver-model/driverRateModel.js';
import { validateAssetCostMap } from '../asset-cost-map/assetCostMap.js';
import { validateWmsValuation } from '../valuation/wmsValuationReadiness.js';
import { validateFinanceReadyContracts } from './financeReadyContracts.js';
import { FINANCE_READY_OWNERSHIP, validateFinanceReadyOwnership } from './financeReadyOwnership.js';

export const BLOCKER_GAPS_CLOSED_BY_READY = Object.freeze([
  Object.freeze({
    id: 'GAP-FD-011',
    title: 'Driver → Rate model',
    closedBy: FIN_READY_001_PHASE,
    evidence: 'finance.driver_rate.v1 + DRIVER_RATE_REGISTRY'
  }),
  Object.freeze({
    id: 'GAP-FD-004',
    title: 'Cost ↔ Asset mapping',
    closedBy: FIN_READY_001_PHASE,
    evidence: 'finance.asset_cost_map.v1 + ASSET_COST_REGISTRY'
  }),
  Object.freeze({
    id: 'GAP-FD-003',
    title: 'WMS financial valuation',
    closedBy: FIN_READY_001_PHASE,
    evidence: 'finance.wms_valuation.v1 + WMS_VALUATION_CAPABILITY'
  })
]);

export function validateBlockerClosure() {
  const driver = validateDriverModel();
  const asset = validateAssetCostMap();
  const valuation = validateWmsValuation();
  const issues = [];
  if (!driver.gapClosed) issues.push(...driver.issues.map((i) => `GAP-FD-011: ${i}`));
  if (!asset.gapClosed) issues.push(...asset.issues.map((i) => `GAP-FD-004: ${i}`));
  if (!valuation.gapClosed) issues.push(...valuation.issues.map((i) => `GAP-FD-003: ${i}`));

  return {
    valid: issues.length === 0,
    issues,
    closed: BLOCKER_GAPS_CLOSED_BY_READY.map((g) => g.id),
    remainingProductGates: Object.freeze({
      openSmartCosting: false,
      openFinancialTwin: false,
      openPredictive: false,
      reason:
        'Blockers closed — infrastructure ready. Product capabilities still belong to FIN-EVOLVE-2.1 / 2.2 (REMOVE BLOCKERS BEFORE CAPABILITIES).'
    }),
    reevaluationEligible: Object.freeze({
      'FIN-EVOLVE-2.1': true,
      'FIN-EVOLVE-2.2': true,
      note: 'Gates may be re-evaluated; remaining HIGH gaps (impact API, energy standard, KPI aliases) still apply'
    })
  };
}

export function getFinanceReadyAudit() {
  const blockers = validateBlockerClosure();
  const contracts = validateFinanceReadyContracts();
  const ownership = validateFinanceReadyOwnership();
  return Object.freeze({
    phase: FIN_READY_001_PHASE,
    principle: FIN_READY_001_PRINCIPLE,
    scope: Object.freeze({
      implementsProductFeatures: false,
      createsDashboards: false,
      createsSmartCosting: false,
      createsFinancialTwin: false,
      createsWhatIf: false,
      infrastructureOnly: true
    }),
    blockersClosed: blockers.closed,
    blockerValidation: blockers,
    contracts,
    ownership: FINANCE_READY_OWNERSHIP,
    ownershipValidation: ownership,
    productGatesStillClosed: blockers.remainingProductGates,
    reevaluationEligible: blockers.reevaluationEligible
  });
}

export function validateFinanceReady001() {
  const blockers = validateBlockerClosure();
  const contracts = validateFinanceReadyContracts();
  const ownership = validateFinanceReadyOwnership();
  const issues = [
    ...(blockers.issues || []),
    ...(contracts.issues || []),
    ...(ownership.issues || [])
  ];
  if (blockers.remainingProductGates.openSmartCosting) {
    issues.push('must not open Smart Costing product gate in READY-001');
  }
  if (blockers.closed.length !== 3) issues.push('expected 3 blockers closed');
  return {
    valid: issues.length === 0 && blockers.valid && contracts.valid && ownership.valid,
    issues,
    audit: getFinanceReadyAudit()
  };
}
