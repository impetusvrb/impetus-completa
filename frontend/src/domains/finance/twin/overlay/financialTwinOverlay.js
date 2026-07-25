/**
 * FIN-EVOLVE-2.2 — Financial overlay composition (ONE TWIN · MULTIPLE PERSPECTIVES).
 * Projects economic attrs onto industrial twin entities — NO parallel twin, NO new engine.
 */
import {
  listAssetCostLinks,
  ASSET_COST_MAP_CONTRACT
} from '../../../../platform/readiness/finance/index.js';
import { FIN_EVOLVE_21_PHASE } from '../../contracts/economicEngineContracts.js';

export const FIN_EVOLVE_22_PHASE = 'FIN-EVOLVE-2.2';
export const FIN_EVOLVE_22_PRINCIPLE = 'ONE TWIN · MULTIPLE PERSPECTIVES';

/**
 * Build financial overlay for one asset-cost link using Economic Intelligence snapshot.
 */
export function composeNodeFinancialOverlay(link, economicSnapshot = {}, extras = {}) {
  const smart = economicSnapshot.smartCosting || {};
  const perf = economicSnapshot.performance?.indicators || {};
  const byAsset = (smart.byAsset?.items || []).find((i) => i.asset_id === link.asset_id);
  const byLine = (smart.byLine?.items || []).find(
    (i) => i.line_id === link.line_id || i.id === link.line_id
  );
  const byCc = (smart.byCostCenter?.items || []).find(
    (i) => i.cost_center_id === link.cost_center_id || i.id === link.cost_center_id
  );

  const current_cost = byAsset?.amount ?? byLine?.amount ?? byCc?.amount ?? null;
  const losses = perf.economicLosses?.value ?? null;
  const efficiency = perf.economicEfficiency?.value ?? null;
  const impact = extras.financial_impact ?? economicSnapshot.hubKpis?.find((k) => k.id === 'event_impact_24h')?.numericValue ?? null;
  const valuation = extras.valuation ?? smart.lotCosts?.lots?.[0]?.economic_value ?? null;
  const accumulated = perf.consolidatedOperationalCost?.value ?? null;

  /** GAP-TWIN-004 — risk composed from alerts, not a new engine */
  const alerts = extras.leakageAlerts || [];
  const highAlerts = alerts.filter((a) =>
    ['high', 'critical', 'alta'].includes(String(a.severity || a.level || '').toLowerCase())
  );
  const operational_risk = Object.freeze({
    level: highAlerts.length >= 2 ? 'high' : highAlerts.length === 1 ? 'medium' : losses != null && losses > 0 ? 'elevated' : 'low',
    alertCount: alerts.length,
    highAlertCount: highAlerts.length,
    evidence: 'compose leakage alerts + economic_losses (no risk engine)'
  });

  return Object.freeze({
    asset_id: link.asset_id,
    asset_type: link.asset_type,
    asset_label: link.asset_label,
    twin_node_ref: link.twin_node_ref || extras.twin_node_ref || null,
    cost_center_id: link.cost_center_id,
    line_id: link.line_id,
    equipment_id: link.equipment_id,
    financial: Object.freeze({
      current_cost,
      accumulated_cost: accumulated,
      valuation,
      losses,
      efficiency,
      financial_impact: impact,
      cost_by_asset: byAsset?.amount ?? null,
      cost_by_line: byLine?.amount ?? null,
      cost_by_cost_center: byCc?.amount ?? null,
      operational_risk,
      unit_cost: smart.unitCost?.value ?? null
    }),
    evidence: Object.freeze({
      contracts: Object.freeze([
        ASSET_COST_MAP_CONTRACT.id,
        'finance.driver_rate.v1',
        'finance.wms_valuation.v1',
        'FIN-EVOLVE-2.1 EconomicIntelligenceEngine'
      ]),
      phase: FIN_EVOLVE_22_PHASE,
      composedFrom: Object.freeze([FIN_EVOLVE_21_PHASE, 'FIN-READY-001', 'FIN-TWIN-READY-001']),
      parallelTwin: false
    })
  });
}

/**
 * Overlay for all registered asset-cost links.
 */
export function composeFinancialTwinOverlay(economicSnapshot = {}, options = {}) {
  const links = listAssetCostLinks();
  const nodes = links.map((link) =>
    composeNodeFinancialOverlay(link, economicSnapshot, {
      leakageAlerts: options.leakageAlerts || [],
      valuation: options.valuation,
      financial_impact: options.financial_impact
    })
  );

  return Object.freeze({
    phase: FIN_EVOLVE_22_PHASE,
    principle: FIN_EVOLVE_22_PRINCIPLE,
    kind: 'financial_overlay',
    parallelTwin: false,
    industrialTwinOwner: 'digital_twin',
    nodes: Object.freeze(nodes),
    summary: Object.freeze({
      nodeCount: nodes.length,
      withCurrentCost: nodes.filter((n) => n.financial.current_cost != null).length,
      withSpatialRef: nodes.filter((n) => n.twin_node_ref).length,
      efficiency: economicSnapshot.performance?.indicators?.economicEfficiency?.value ?? null,
      losses: economicSnapshot.performance?.indicators?.economicLosses?.value ?? null,
      unitCost: economicSnapshot.smartCosting?.unitCost?.value ?? null
    }),
    contractsUsed: Object.freeze([
      ASSET_COST_MAP_CONTRACT.id,
      'finance.driver_rate.v1',
      'finance.wms_valuation.v1',
      'dashboard.costs',
      'dashboard.financialLeakage'
    ])
  });
}

export function validateFinancialTwinOverlay(overlay) {
  const issues = [];
  if (!overlay || overlay.kind !== 'financial_overlay') issues.push('missing overlay');
  if (overlay?.parallelTwin) issues.push('parallel twin forbidden');
  if (!overlay?.nodes?.length) issues.push('no overlay nodes');
  if (!overlay?.contractsUsed?.includes(ASSET_COST_MAP_CONTRACT.id)) {
    issues.push('must consume asset_cost_map');
  }
  return { valid: issues.length === 0, issues };
}
