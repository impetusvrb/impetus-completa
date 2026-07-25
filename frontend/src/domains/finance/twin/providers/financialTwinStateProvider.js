/**
 * FIN-EVOLVE-2.2 — Financial Twin State Provider (composition only).
 * Twin State + Economic State → Financial Twin State
 * No storage · no persistence · no new database · no parallel twin runtime.
 */
import { runEconomicIntelligence } from '../../economic-engine/economicIntelligenceEngine.js';
import {
  composeFinancialTwinOverlay,
  validateFinancialTwinOverlay,
  FIN_EVOLVE_22_PHASE,
  FIN_EVOLVE_22_PRINCIPLE
} from '../overlay/financialTwinOverlay.js';
import { listAssetCostLinks } from '../../../../platform/readiness/finance/index.js';
import {
  trackTwinOverlayLoaded,
  trackTwinFinancialStateUpdated
} from '../../observability/financeObservability.js';

/**
 * Normalize optional industrial twin payload (integrations digital-twin/state) into light nodes.
 * Does NOT own or persist twin data — read-only projection.
 */
export function projectOperationalTwinNodes(industrialState = null) {
  if (!industrialState || typeof industrialState !== 'object') {
    return Object.freeze([]);
  }
  const lines = industrialState.linhas || industrialState.lines || [];
  const nodes = [];
  for (const line of lines) {
    const lineId = line.id || line.name || line.codigo || null;
    const machines = line.maquinas || line.machines || [];
    for (const m of machines) {
      nodes.push(
        Object.freeze({
          id: String(m.id || m.name || m.identifier || ''),
          label: m.name || m.id || 'máquina',
          line_id: lineId != null ? String(lineId) : null,
          status: m.status || m.twin_state || null,
          source: 'integrations.digital-twin.state'
        })
      );
    }
  }
  const loose = industrialState.equipamentos_soltos || industrialState.loose_equipment || [];
  for (const m of loose) {
    nodes.push(
      Object.freeze({
        id: String(m.id || m.name || ''),
        label: m.name || m.id || 'equipamento',
        line_id: null,
        status: m.status || null,
        source: 'integrations.digital-twin.state'
      })
    );
  }
  return Object.freeze(nodes.filter((n) => n.id));
}

/**
 * Join operational nodes ↔ asset_cost_map (GAP-TWIN-001/002 composition).
 */
export function joinOperationalToFinanceLinks(operationalNodes = [], financeOverlayNodes = []) {
  const links = listAssetCostLinks();
  return financeOverlayNodes.map((fn) => {
    const link = links.find((l) => l.asset_id === fn.asset_id);
    const op =
      operationalNodes.find((o) => link?.twin_node_ref && o.id === link.twin_node_ref) ||
      operationalNodes.find((o) => o.id === fn.equipment_id) ||
      operationalNodes.find(
        (o) =>
          fn.line_id &&
          o.line_id &&
          String(o.line_id).toLowerCase().includes(String(fn.line_id).replace(/^line:/, '').toLowerCase())
      ) ||
      null;

    /** GAP-TWIN-002 — order join placeholder when orders present on operational payload */
    const work_order_ref = op?.work_order_id || op?.order_id || null;

    return Object.freeze({
      ...fn,
      operational: op
        ? Object.freeze({
            twin_node_id: op.id,
            label: op.label,
            status: op.status,
            line_id: op.line_id,
            work_order_ref,
            joined: true
          })
        : Object.freeze({
            twin_node_id: fn.twin_node_ref,
            joined: false,
            note: 'Finance link without live operational match — overlay still valid'
          })
    });
  });
}

/**
 * Provide composed Financial Twin State.
 * @param {object} input — same shape as runEconomicIntelligence + optional industrialTwinState
 */
export function provideFinancialTwinState(input = {}) {
  const economic =
    input.economicSnapshot ||
    runEconomicIntelligence({
      ...input,
      emitEvents: input.emitEvents === true
    });

  const overlay = composeFinancialTwinOverlay(economic, {
    leakageAlerts: input.leakageAlerts || input.raw?.leakageAlerts || [],
    valuation: input.valuation,
    financial_impact: input.financial_impact
  });

  const operationalNodes = projectOperationalTwinNodes(input.industrialTwinState || null);
  const joinedNodes = joinOperationalToFinanceLinks(operationalNodes, overlay.nodes);

  /** Live qty when available on drivers (GAP-TWIN-003) */
  const liveQty = Object.freeze({
    units_produced: input.drivers?.units_produced ?? null,
    kwh_consumed: input.drivers?.kwh_consumed ?? null,
    available: input.drivers?.units_produced != null || input.drivers?.kwh_consumed != null
  });

  const state = Object.freeze({
    phase: FIN_EVOLVE_22_PHASE,
    principle: FIN_EVOLVE_22_PRINCIPLE,
    kind: 'financial_twin_state',
    parallelTwin: false,
    persistence: false,
    storage: null,
    industrialTwin: Object.freeze({
      owner: 'digital_twin',
      nodeCount: operationalNodes.length,
      perspective: 'finance_overlay'
    }),
    economic: Object.freeze({
      phase: economic.phase,
      engine: economic.engine,
      unitCost: economic.smartCosting?.unitCost?.value ?? null,
      efficiency: economic.performance?.indicators?.economicEfficiency?.value ?? null,
      losses: economic.performance?.indicators?.economicLosses?.value ?? null,
      consolidated: economic.performance?.indicators?.consolidatedOperationalCost?.value ?? null
    }),
    overlay: Object.freeze({
      ...overlay,
      nodes: Object.freeze(joinedNodes)
    }),
    liveQty,
    industrialTwinDeepLink: '/app/manutencao/manuia?tab=digital-twin&perspective=finance',
    financeViewPath: '/app/finance/twin'
  });

  if (input.emitEvents !== false) {
    trackTwinOverlayLoaded({
      nodeCount: joinedNodes.length,
      operationalJoined: joinedNodes.filter((n) => n.operational?.joined).length
    });
    trackTwinFinancialStateUpdated({
      efficiency: state.economic.efficiency,
      losses: state.economic.losses
    });
  }

  return state;
}

export function validateFinancialTwinStateProvider(state) {
  const issues = [];
  if (!state || state.kind !== 'financial_twin_state') issues.push('missing financial twin state');
  if (state?.parallelTwin) issues.push('parallel twin forbidden');
  if (state?.persistence || state?.storage) issues.push('persistence forbidden');
  const ov = validateFinancialTwinOverlay(state?.overlay);
  if (!ov.valid) issues.push(...ov.issues);
  if (!state?.industrialTwinDeepLink?.includes('digital-twin')) {
    issues.push('must deep-link to existing industrial twin');
  }
  if (!state?.financeViewPath?.includes('/app/finance/twin')) {
    issues.push('finance view path missing');
  }
  return { valid: issues.length === 0, issues };
}

export { FIN_EVOLVE_22_PHASE, FIN_EVOLVE_22_PRINCIPLE };
