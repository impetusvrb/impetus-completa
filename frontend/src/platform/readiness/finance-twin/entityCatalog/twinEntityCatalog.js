/**
 * FIN-TWIN-READY-001 — Entity catalog for Financial Digital Twin readiness.
 * READ ONLY — MODEL BEFORE SIMULATE — no Twin implementation.
 */
export const FIN_TWIN_READY_001_PHASE = 'FIN-TWIN-READY-001';
export const FIN_TWIN_READY_001_PRINCIPLE = 'MODEL BEFORE SIMULATE';

export const TWIN_ENTITY_STATUS = Object.freeze({
  READY: 'READY',
  PARTIAL: 'PARTIAL',
  BLOCKED: 'BLOCKED'
});

/**
 * Unique catalog of entities required to represent a coherent financial operational state.
 */
export const TWIN_ENTITY_CATALOG = Object.freeze([
  Object.freeze({
    id: 'asset',
    label: 'Activo industrial',
    owner: 'digital_twin / finance_asset_cost_map',
    contract: 'finance.asset_cost_map.v1 + digital_twin layout',
    availability: TWIN_ENTITY_STATUS.READY,
    note: 'Structural links READY-001; spatial twin ops exists'
  }),
  Object.freeze({
    id: 'cost_center',
    label: 'Centro de custo',
    owner: 'finance_asset_cost_map / industrial_cost_service',
    contract: 'finance.asset_cost_map.v1 · dashboard.costs',
    availability: TWIN_ENTITY_STATUS.READY,
    note: 'Linked via cost_center_id on asset map'
  }),
  Object.freeze({
    id: 'production_line',
    label: 'Linha de produção',
    owner: 'finance_asset_cost_map / production_mes',
    contract: 'finance.asset_cost_map.v1 (line_id)',
    availability: TWIN_ENTITY_STATUS.READY,
    note: 'Line dimension in asset-cost registry'
  }),
  Object.freeze({
    id: 'equipment',
    label: 'Equipamento',
    owner: 'digital_twin / manutencao-ia',
    contract: 'asset_cost_map · twin nodes',
    availability: TWIN_ENTITY_STATUS.PARTIAL,
    note: 'Equipment links exist; live twin_node_ref sparsely populated'
  }),
  Object.freeze({
    id: 'work_order',
    label: 'Ordem (produção / manutenção)',
    owner: 'production_mes / maintenance_manuia',
    contract: 'operational / manutencao-ia',
    availability: TWIN_ENTITY_STATUS.PARTIAL,
    note: 'Operational orders exist; no certified finance↔order join contract'
  }),
  Object.freeze({
    id: 'inventory_stock',
    label: 'Estoque (quantidade)',
    owner: 'wms_inventory',
    contract: 'WMS inventory module',
    availability: TWIN_ENTITY_STATUS.READY,
    note: 'Qty owner unchanged'
  }),
  Object.freeze({
    id: 'inventory_valuation',
    label: 'Valuation económico do estoque',
    owner: 'finance_wms_valuation',
    contract: 'finance.wms_valuation.v1',
    availability: TWIN_ENTITY_STATUS.READY,
    note: 'FIN-READY-001 adapter'
  }),
  Object.freeze({
    id: 'industrial_cost',
    label: 'Custo industrial / operacional',
    owner: 'industrial_cost_service',
    contract: 'dashboard.costs',
    availability: TWIN_ENTITY_STATUS.READY,
    note: 'Certified REG/FIN path'
  }),
  Object.freeze({
    id: 'cost_loss',
    label: 'Perdas de custo (top-loss / projected)',
    owner: 'industrial_cost_service',
    contract: 'dashboard.costs top-loss / projected-loss',
    availability: TWIN_ENTITY_STATUS.READY
  }),
  Object.freeze({
    id: 'energy_consumption',
    label: 'Consumo energético',
    owner: 'iot_energy',
    contract: 'finance.driver_rate.v1 (drv-energy) + edge',
    availability: TWIN_ENTITY_STATUS.PARTIAL,
    note: 'Driver structure ready; plant rates GAP-FD-005 backlog'
  }),
  Object.freeze({
    id: 'financial_leakage',
    label: 'Leakage / vazamento financeiro',
    owner: 'financial_leakage',
    contract: 'dashboard.financialLeakage',
    availability: TWIN_ENTITY_STATUS.READY
  }),
  Object.freeze({
    id: 'economic_performance',
    label: 'Performance económica',
    owner: 'EconomicIntelligenceEngine',
    contract: 'FIN-EVOLVE-2.1 performance capability',
    availability: TWIN_ENTITY_STATUS.READY,
    note: 'Compose only — no new cost service'
  }),
  Object.freeze({
    id: 'smart_costing',
    label: 'Smart Costing (unit/asset/line/cc)',
    owner: 'EconomicIntelligenceEngine',
    contract: 'FIN-EVOLVE-2.1 smart_costing capability',
    availability: TWIN_ENTITY_STATUS.READY
  }),
  Object.freeze({
    id: 'driver_rate',
    label: 'Driver → Rate mapping',
    owner: 'finance_driver_model',
    contract: 'finance.driver_rate.v1',
    availability: TWIN_ENTITY_STATUS.READY
  }),
  Object.freeze({
    id: 'billing',
    label: 'Nexus Billing',
    owner: 'nexus_billing',
    contract: 'nexusWallet.admin billing-engine',
    availability: TWIN_ENTITY_STATUS.READY,
    note: 'Platform credits — not plant P&L'
  }),
  Object.freeze({
    id: 'wallet',
    label: 'Nexus Wallet',
    owner: 'nexus_wallet',
    contract: 'nexusWallet.admin',
    availability: TWIN_ENTITY_STATUS.PARTIAL,
    note: 'Admin-gated for CFO hub (GAP-FD-009)'
  }),
  Object.freeze({
    id: 'ledger',
    label: 'Nexus Ledger',
    owner: 'nexus_ledger',
    contract: 'billing-ledger',
    availability: TWIN_ENTITY_STATUS.READY,
    note: 'Credits ledger ≠ GL'
  }),
  Object.freeze({
    id: 'operational_twin_node',
    label: 'Nó do Twin operacional',
    owner: 'digital_twin',
    contract: 'integrations.digital-twin / manutencao-ia',
    availability: TWIN_ENTITY_STATUS.PARTIAL,
    note: 'Spatial/state available; no native $ attributes yet (2.2 product)'
  }),
  Object.freeze({
    id: 'production_signal',
    label: 'Sinais de produção / MES',
    owner: 'production_mes',
    contract: 'dashboard.industrial / edge',
    availability: TWIN_ENTITY_STATUS.PARTIAL,
    note: 'Plant-dependent instrumentation'
  })
]);

export function getTwinEntity(id) {
  return TWIN_ENTITY_CATALOG.find((e) => e.id === id) ?? null;
}

export function listTwinEntitiesByStatus(status) {
  return TWIN_ENTITY_CATALOG.filter((e) => e.availability === status);
}

export function validateTwinEntityCatalog() {
  const issues = [];
  const required = [
    'asset',
    'cost_center',
    'production_line',
    'inventory_stock',
    'inventory_valuation',
    'industrial_cost',
    'financial_leakage',
    'energy_consumption',
    'billing',
    'wallet',
    'ledger',
    'work_order',
    'economic_performance',
    'smart_costing'
  ];
  const ids = new Set();
  for (const e of TWIN_ENTITY_CATALOG) {
    if (ids.has(e.id)) issues.push(`duplicate ${e.id}`);
    ids.add(e.id);
    if (!e.owner || !e.contract || !e.availability) issues.push(`${e.id} incomplete`);
  }
  for (const id of required) {
    if (!ids.has(id)) issues.push(`missing entity ${id}`);
  }
  return { valid: issues.length === 0, issues, count: TWIN_ENTITY_CATALOG.length };
}
