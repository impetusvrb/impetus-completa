/**
 * FIN-TWIN-READY-001 — Event sources that may update the Twin in the future.
 * Catalog only — no subscriptions, no handlers.
 */
import { TWIN_ENTITY_STATUS } from '../entityCatalog/twinEntityCatalog.js';

export const TWIN_EVENT_SOURCES = Object.freeze([
  Object.freeze({
    id: 'evt-wms-movement',
    label: 'Movimentação WMS',
    eventHint: 'stock_movement',
    affects: Object.freeze(['inventory_stock', 'inventory_valuation', 'valuation']),
    owner: 'wms_inventory',
    status: TWIN_ENTITY_STATUS.READY
  }),
  Object.freeze({
    id: 'evt-cost-upsert',
    label: 'Novo / actualizado custo industrial',
    eventHint: 'cost_item_upsert / executive_summary_read',
    affects: Object.freeze(['industrial_cost', 'current_cost', 'accumulated_cost']),
    owner: 'industrial_cost_service',
    status: TWIN_ENTITY_STATUS.READY
  }),
  Object.freeze({
    id: 'evt-leakage',
    label: 'Leakage detectado / alerta',
    eventHint: 'leak_detected / leak_alert',
    affects: Object.freeze(['financial_leakage', 'losses', 'operational_risk']),
    owner: 'financial_leakage',
    status: TWIN_ENTITY_STATUS.READY
  }),
  Object.freeze({
    id: 'evt-energy',
    label: 'Consumo energético / telemetria',
    eventHint: 'telemetry_sample',
    affects: Object.freeze(['energy_consumption', 'consumption', 'driver_rate']),
    owner: 'iot_energy',
    status: TWIN_ENTITY_STATUS.PARTIAL
  }),
  Object.freeze({
    id: 'evt-driver-change',
    label: 'Alteração de driver / rate',
    eventHint: 'driver_mapping_declared / plant rate config',
    affects: Object.freeze(['driver_rate', 'smart_costing']),
    owner: 'finance_driver_model',
    status: TWIN_ENTITY_STATUS.READY,
    note: 'Config/contract — not live bus yet'
  }),
  Object.freeze({
    id: 'evt-asset-update',
    label: 'Actualização de activo / link cost↔asset',
    eventHint: 'asset_cost_link_declared / twin_state_sync',
    affects: Object.freeze(['asset', 'cost_by_asset', 'spatial_ref']),
    owner: 'finance_asset_cost_map / digital_twin',
    status: TWIN_ENTITY_STATUS.PARTIAL
  }),
  Object.freeze({
    id: 'evt-industrial',
    label: 'Eventos industriais (parada, produção)',
    eventHint: 'machine_state / production_event / operational_event_impact',
    affects: Object.freeze(['production_signal', 'financial_impact', 'current_cost']),
    owner: 'production_mes / industrial_cost_impact',
    status: TWIN_ENTITY_STATUS.PARTIAL
  }),
  Object.freeze({
    id: 'evt-economic-engine',
    label: 'Recálculo Economic Intelligence',
    eventHint: 'finance.smart_costing.calculated / finance.performance.updated',
    affects: Object.freeze(['smart_costing', 'economic_performance', 'efficiency']),
    owner: 'EconomicIntelligenceEngine',
    status: TWIN_ENTITY_STATUS.READY
  }),
  Object.freeze({
    id: 'evt-billing',
    label: 'Billing / wallet / ledger',
    eventHint: 'consumption_charged / wallet_debit / ledger_entry',
    affects: Object.freeze(['billing', 'wallet', 'ledger']),
    owner: 'nexus_ia',
    status: TWIN_ENTITY_STATUS.READY,
    note: 'Peripheral to plant twin'
  }),
  Object.freeze({
    id: 'evt-maintenance',
    label: 'Diagnóstico / falha ManuIA',
    eventHint: 'diagnostic / failure_prediction',
    affects: Object.freeze(['equipment', 'operational_risk', 'work_order']),
    owner: 'maintenance_manuia',
    status: TWIN_ENTITY_STATUS.PARTIAL,
    note: 'PdM→$ still HIGH backlog (GAP-FD-010)'
  })
]);

export function listEventsAffecting(attributeOrEntityId) {
  return TWIN_EVENT_SOURCES.filter((e) => e.affects.includes(attributeOrEntityId));
}

export function validateTwinEventSources() {
  const issues = [];
  const ids = new Set();
  for (const e of TWIN_EVENT_SOURCES) {
    if (ids.has(e.id)) issues.push(`duplicate ${e.id}`);
    ids.add(e.id);
    if (!e.affects?.length) issues.push(`${e.id} no affects`);
    if (!e.owner || !e.status) issues.push(`${e.id} incomplete`);
  }
  for (const required of [
    'evt-wms-movement',
    'evt-cost-upsert',
    'evt-leakage',
    'evt-energy',
    'evt-driver-change',
    'evt-asset-update',
    'evt-industrial'
  ]) {
    if (!ids.has(required)) issues.push(`missing ${required}`);
  }
  return { valid: issues.length === 0, issues, count: TWIN_EVENT_SOURCES.length };
}
