/**
 * FIN-READY-001 — Cost ↔ Asset structural mapping (GAP-FD-004).
 * Link only — NO Digital Twin UI, NO financial overlay rendering.
 */
import { FIN_READY_001_PHASE } from '../driver-model/driverRateModel.js';

export const ASSET_TYPES = Object.freeze({
  EQUIPMENT: 'equipment',
  LINE: 'production_line',
  CELL: 'cell',
  COST_CENTER: 'cost_center',
  PLANT_NODE: 'plant_node'
});

export const ASSET_COST_MAP_CONTRACT = Object.freeze({
  id: 'finance.asset_cost_map.v1',
  version: '1.0.0',
  phase: FIN_READY_001_PHASE,
  closesGap: 'GAP-FD-004',
  implementsDigitalTwin: false,
  fields: Object.freeze([
    Object.freeze({ name: 'link_id', type: 'string', required: true }),
    Object.freeze({ name: 'asset_id', type: 'string', required: true }),
    Object.freeze({ name: 'asset_type', type: 'enum:ASSET_TYPES', required: true }),
    Object.freeze({ name: 'asset_label', type: 'string', required: false }),
    Object.freeze({ name: 'twin_node_ref', type: 'string', required: false, note: 'optional ref into digital_twin layout' }),
    Object.freeze({ name: 'cost_center_id', type: 'string', required: false }),
    Object.freeze({ name: 'cost_origin_ref', type: 'string', required: false }),
    Object.freeze({ name: 'cost_item_ref', type: 'string', required: false }),
    Object.freeze({ name: 'driver_mapping_ids', type: 'string[]', required: false }),
    Object.freeze({ name: 'line_id', type: 'string', required: false }),
    Object.freeze({ name: 'equipment_id', type: 'string', required: false }),
    Object.freeze({ name: 'owner', type: 'string', required: true, default: 'finance_asset_cost_map' })
  ]),
  forbidden: Object.freeze([
    'financial_digital_twin_ui',
    'what_if_engine',
    'twin_dollar_attributes_mutation',
    'scenario_fork'
  ])
});

/** Structural registry — relationships only. */
export const ASSET_COST_REGISTRY = Object.freeze([
  Object.freeze({
    link_id: 'acm-line-a',
    asset_id: 'line:A',
    asset_type: ASSET_TYPES.LINE,
    asset_label: 'Linha A',
    twin_node_ref: null,
    cost_center_id: 'cc-linha-a',
    cost_origin_ref: 'linha-A',
    cost_item_ref: null,
    driver_mapping_ids: Object.freeze(['drv-volume-ops', 'drv-util-ops', 'drv-time-downtime']),
    line_id: 'line:A',
    equipment_id: null,
    owner: 'finance_asset_cost_map',
    status: 'contract_ready'
  }),
  Object.freeze({
    link_id: 'acm-eq-press-01',
    asset_id: 'eq:press-01',
    asset_type: ASSET_TYPES.EQUIPMENT,
    asset_label: 'Prensa 01',
    twin_node_ref: null,
    cost_center_id: 'cc-linha-a',
    cost_origin_ref: 'parada',
    cost_item_ref: null,
    driver_mapping_ids: Object.freeze(['drv-time-downtime', 'drv-energy']),
    line_id: 'line:A',
    equipment_id: 'eq:press-01',
    owner: 'finance_asset_cost_map',
    status: 'contract_ready'
  }),
  Object.freeze({
    link_id: 'acm-cc-ops',
    asset_id: 'cc:ops-plant',
    asset_type: ASSET_TYPES.COST_CENTER,
    asset_label: 'Centro Operacional Planta',
    twin_node_ref: null,
    cost_center_id: 'cc:ops-plant',
    cost_origin_ref: 'operacional',
    cost_item_ref: null,
    driver_mapping_ids: Object.freeze(['drv-volume-ops', 'drv-material']),
    line_id: null,
    equipment_id: null,
    owner: 'finance_asset_cost_map',
    status: 'contract_ready'
  }),
  Object.freeze({
    link_id: 'acm-cell-pack',
    asset_id: 'cell:pack',
    asset_type: ASSET_TYPES.CELL,
    asset_label: 'Célula Embalagem',
    twin_node_ref: null,
    cost_center_id: 'cc-pack',
    cost_origin_ref: 'embalagem',
    cost_item_ref: null,
    driver_mapping_ids: Object.freeze(['drv-volume-ops', 'drv-loss-leakage']),
    line_id: 'line:pack',
    equipment_id: null,
    owner: 'finance_asset_cost_map',
    status: 'contract_ready'
  }),
  Object.freeze({
    link_id: 'acm-plant-node',
    asset_id: 'plant:root',
    asset_type: ASSET_TYPES.PLANT_NODE,
    asset_label: 'Planta (nó raiz)',
    twin_node_ref: 'twin:layout:root',
    cost_center_id: 'cc:ops-plant',
    cost_origin_ref: null,
    cost_item_ref: null,
    driver_mapping_ids: Object.freeze(['drv-energy']),
    line_id: null,
    equipment_id: null,
    owner: 'finance_asset_cost_map',
    status: 'contract_ready'
  })
]);

export function listAssetCostLinks(filter = {}) {
  let rows = [...ASSET_COST_REGISTRY];
  if (filter.asset_type) rows = rows.filter((r) => r.asset_type === filter.asset_type);
  if (filter.cost_center_id) rows = rows.filter((r) => r.cost_center_id === filter.cost_center_id);
  if (filter.asset_id) rows = rows.filter((r) => r.asset_id === filter.asset_id);
  return rows;
}

export function getAssetCostLink(linkId) {
  return ASSET_COST_REGISTRY.find((r) => r.link_id === linkId) ?? null;
}

export function getLinksForAsset(assetId) {
  return ASSET_COST_REGISTRY.filter((r) => r.asset_id === assetId);
}

export function validateAssetCostMap() {
  const issues = [];
  if (ASSET_COST_MAP_CONTRACT.implementsDigitalTwin !== false) {
    issues.push('must not implement Digital Twin');
  }
  if (ASSET_COST_MAP_CONTRACT.closesGap !== 'GAP-FD-004') {
    issues.push('must close GAP-FD-004');
  }
  const ids = new Set();
  for (const row of ASSET_COST_REGISTRY) {
    if (ids.has(row.link_id)) issues.push(`duplicate ${row.link_id}`);
    ids.add(row.link_id);
    if (!row.asset_id || !row.asset_type) issues.push(`${row.link_id}: incomplete asset`);
    if (!Object.values(ASSET_TYPES).includes(row.asset_type)) {
      issues.push(`${row.link_id}: invalid asset_type`);
    }
    const hasCostRef = row.cost_center_id || row.cost_origin_ref || row.cost_item_ref;
    if (!hasCostRef) issues.push(`${row.link_id}: missing cost relationship`);
  }
  if (ASSET_COST_REGISTRY.length < 4) issues.push('registry incomplete');
  return {
    valid: issues.length === 0,
    issues,
    gapClosed: issues.length === 0,
    gapId: 'GAP-FD-004',
    count: ASSET_COST_REGISTRY.length
  };
}
