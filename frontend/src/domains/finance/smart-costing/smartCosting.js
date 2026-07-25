/**
 * FIN-EVOLVE-2.1 — Smart Costing capability (composed via Economic Intelligence Engine).
 * Explainable · traceable · contracts-only. Not named SmartCostingEngine (legacy forbid string).
 */
import { calculateDriverContributions } from '../calculators/driverCostCalculator.js';
import {
  calculateDynamicUnitCost,
  calculateLotCosts,
  calculateCostByAsset,
  calculateCostByLine,
  calculateCostByCostCenter
} from '../calculators/smartCostingCalculators.js';
import { FIN_EVOLVE_21_PHASE } from '../contracts/economicEngineContracts.js';
import { traceStep } from '../calculators/economicCalcUtils.js';

export function runSmartCosting(context = {}) {
  const driverResult = calculateDriverContributions(context);
  const unitCost = calculateDynamicUnitCost(context, driverResult);
  const lotCosts = calculateLotCosts(context);
  const byAsset = calculateCostByAsset(driverResult);
  const byLine = calculateCostByLine(driverResult);
  const byCostCenter = calculateCostByCostCenter(driverResult);

  return Object.freeze({
    phase: FIN_EVOLVE_21_PHASE,
    capability: 'smart_costing',
    explainable: true,
    unitCost,
    lotCosts,
    byAsset,
    byLine,
    byCostCenter,
    driverContributions: driverResult,
    contractsUsed: Object.freeze([
      'finance.driver_rate.v1',
      'finance.asset_cost_map.v1',
      'finance.wms_valuation.v1',
      'dashboard.costs'
    ]),
    trace: Object.freeze([
      traceStep('smart_costing_complete', {
        resolvedDrivers: driverResult.resolvedCount,
        unitCost: unitCost.value,
        assets: byAsset.items.length
      })
    ])
  });
}

export function validateSmartCosting(result) {
  const issues = [];
  if (!result || result.capability !== 'smart_costing') issues.push('missing smart_costing result');
  if (!result?.unitCost) issues.push('missing unitCost');
  if (!result?.byAsset?.items?.length) issues.push('missing byAsset');
  if (!result?.byLine) issues.push('missing byLine');
  if (!result?.byCostCenter) issues.push('missing byCostCenter');
  if (!result?.lotCosts) issues.push('missing lotCosts surface');
  for (const id of ['finance.driver_rate.v1', 'finance.asset_cost_map.v1', 'finance.wms_valuation.v1']) {
    if (!result?.contractsUsed?.includes(id)) issues.push(`missing contract ${id}`);
  }
  return { valid: issues.length === 0, issues };
}
