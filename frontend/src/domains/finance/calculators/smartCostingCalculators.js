/**
 * FIN-EVOLVE-2.1 — Unit / lot / asset / line / cost-center calculators.
 */
import {
  listAssetCostLinks,
  ASSET_COST_MAP_CONTRACT,
  WMS_VALUATION_CONTRACT,
  projectWmsValuation,
  extractValuationFromWmsRow
} from '../../../platform/readiness/finance/index.js';
import { roundMoney, num, traceStep } from './economicCalcUtils.js';

/**
 * Dynamic unit cost = operational_day / units_produced (or driver volume).
 * Falls back to average of resolved driver contributions / volume.
 */
export function calculateDynamicUnitCost(context = {}, driverResult = {}) {
  const trace = [
    traceStep('unit_cost_start', { contracts: ['dashboard.costs', 'finance.driver_rate.v1'] })
  ];
  const units = num(context.drivers?.units_produced, 0);
  const perDay = context.normalized?.perDay;
  let unitCost = null;
  let method = null;

  if (perDay != null && units > 0) {
    unitCost = roundMoney(perDay / units);
    method = 'operational_per_day / units_produced';
    trace.push(traceStep('unit_from_ops', { perDay, units, unitCost }));
  } else if (driverResult.total != null && units > 0) {
    unitCost = roundMoney(driverResult.total / units);
    method = 'driver_contributions_total / units_produced';
    trace.push(traceStep('unit_from_drivers', { total: driverResult.total, units, unitCost }));
  } else if (perDay != null) {
    unitCost = roundMoney(perDay);
    method = 'operational_per_day (volume absent — unit≈day cost)';
    trace.push(traceStep('unit_fallback_day', { unitCost }));
  }

  return Object.freeze({
    id: 'dynamic_unit_cost',
    label: 'Custo unitário dinâmico',
    value: unitCost,
    currency: 'BRL',
    method,
    explainable: true,
    evidence: Object.freeze({ formula: method, trace: Object.freeze(trace) })
  });
}

/**
 * Lot cost from WMS valuation adapter when lot metadata exists.
 */
export function calculateLotCosts(context = {}) {
  const rows = Array.isArray(context.wmsRows) ? context.wmsRows : [];
  const projected = rows.length
    ? projectWmsValuation(rows)
    : context.valuationSeed
      ? [extractValuationFromWmsRow(context.valuationSeed)]
      : [];

  const withLot = projected.filter((v) => v.lot_cost != null || (v.lot_number && v.economic_value != null));

  return Object.freeze({
    contract: WMS_VALUATION_CONTRACT.id,
    lots: Object.freeze(
      withLot.map((v) =>
        Object.freeze({
          item_id: v.item_id,
          item_code: v.item_code,
          lot_number: v.lot_number,
          lot_cost: v.lot_cost,
          average_cost: v.average_cost,
          economic_value: v.economic_value,
          quantity_ref: v.quantity_ref,
          method: v.method,
          explainable: true,
          evidence: Object.freeze({
            contract: WMS_VALUATION_CONTRACT.id,
            owner: v.owner,
            quantityOwner: 'wms_inventory'
          })
        })
      )
    ),
    supported: withLot.length > 0,
    trace: Object.freeze([
      traceStep('consume_contract', { contract: WMS_VALUATION_CONTRACT.id }),
      traceStep('lot_projection', { count: withLot.length })
    ])
  });
}

function rollupByDimension(dimensionKey, driverResult = {}) {
  const links = listAssetCostLinks();
  const contribByMapping = new Map(
    (driverResult.contributions || []).map((c) => [c.mapping_id, c])
  );
  const groups = new Map();

  for (const link of links) {
    const key = link[dimensionKey] || link.asset_id;
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        asset_id: link.asset_id,
        asset_type: link.asset_type,
        asset_label: link.asset_label,
        cost_center_id: link.cost_center_id,
        cost_origin_ref: link.cost_origin_ref,
        line_id: link.line_id,
        amount: 0,
        mappings: [],
        resolved: false
      });
    }
    const g = groups.get(key);
    for (const mid of link.driver_mapping_ids || []) {
      const c = contribByMapping.get(mid);
      if (c?.amount != null) {
        g.amount = roundMoney(g.amount + c.amount);
        g.mappings.push(mid);
        g.resolved = true;
      }
    }
  }

  return Object.freeze(
    [...groups.values()].map((g) =>
      Object.freeze({
        ...g,
        amount: g.resolved ? roundMoney(g.amount) : null,
        explainable: true,
        evidence: Object.freeze({
          contract: ASSET_COST_MAP_CONTRACT.id,
          dimension: dimensionKey,
          formula: 'sum(driver contributions linked via asset_cost_map)',
          mappings: Object.freeze(g.mappings)
        })
      })
    )
  );
}

export function calculateCostByAsset(driverResult) {
  return Object.freeze({
    contract: ASSET_COST_MAP_CONTRACT.id,
    dimension: 'asset',
    items: rollupByDimension('asset_id', driverResult)
  });
}

export function calculateCostByLine(driverResult) {
  const items = rollupByDimension('line_id', driverResult).filter((i) => i.line_id || i.id);
  return Object.freeze({
    contract: ASSET_COST_MAP_CONTRACT.id,
    dimension: 'line',
    items
  });
}

export function calculateCostByCostCenter(driverResult) {
  return Object.freeze({
    contract: ASSET_COST_MAP_CONTRACT.id,
    dimension: 'cost_center',
    items: rollupByDimension('cost_center_id', driverResult)
  });
}
