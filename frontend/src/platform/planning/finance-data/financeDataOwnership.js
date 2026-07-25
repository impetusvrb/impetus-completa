/**
 * FIN-DATA-001 — Data ownership matrix (READ ONLY).
 * One owner per information class — duplication forbidden.
 */
import { FINANCE_DATA_SOURCES, DATA_STATUS } from './financeDataInventory.js';

export const FINANCE_DATA_OWNERSHIP = Object.freeze([
  Object.freeze({
    information: 'Custo Industrial / operacional',
    owner: 'industrial_cost_service',
    ownerDomain: 'finance_operational',
    consumers: Object.freeze(['Finance hub KPIs', 'CentroCustosExecutivo', 'CC widgets']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Impacto de eventos em custo',
    owner: 'industrial_cost_service',
    ownerDomain: 'finance_operational',
    note: 'impact service exists but primary public surface is executive-summary nesting',
    consumers: Object.freeze(['executive-summary.impact_from_events']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Leakage / perdas financeiras operacionais',
    owner: 'financial_leakage',
    ownerDomain: 'finance_operational',
    consumers: Object.freeze(['Finance alerts', 'MapaVazamentoFinanceiro', 'CC mapa']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Billing / créditos plataforma',
    owner: 'nexus_billing',
    ownerDomain: 'nexus_ia',
    consumers: Object.freeze(['Finance billing module', 'NexusIACustos']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Wallet',
    owner: 'nexus_wallet',
    ownerDomain: 'nexus_ia',
    consumers: Object.freeze(['admin nexus-wallet', 'hub billing_status']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Ledger (créditos)',
    owner: 'nexus_ledger',
    ownerDomain: 'nexus_ia',
    consumers: Object.freeze(['billing-ledger UI']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Estoque (quantidade)',
    owner: 'wms_inventory',
    ownerDomain: 'logistics_wms',
    consumers: Object.freeze(['WMS inventory module', 'future inventory $ adapter']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Produção / máquina',
    owner: 'production_mes',
    ownerDomain: 'operational',
    consumers: Object.freeze(['industrial map', 'twin', 'cost drivers']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Energia / telemetria',
    owner: 'iot_energy',
    ownerDomain: 'industrial_edge',
    consumers: Object.freeze(['Smart Costing readiness']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Manutenção / diagnóstico',
    owner: 'maintenance_manuia',
    ownerDomain: 'maintenance',
    consumers: Object.freeze(['PdM financeira readiness']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Digital Twin state',
    owner: 'digital_twin',
    ownerDomain: 'integrations_manuia_cognitive',
    consumers: Object.freeze(['Financial Digital Twin readiness']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Forecast / health operacional',
    owner: 'forecasting',
    ownerDomain: 'dashboard_previsao',
    consumers: Object.freeze(['CentroPrevisao', 'Release 2.2']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Cenários what-if logísticos',
    owner: 'scenario_engine',
    ownerDomain: 'logistics_cognitive',
    consumers: Object.freeze(['Release 2.2 financial overlay']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Pressão / impacto económico proxy',
    owner: 'economic_engines',
    ownerDomain: 'cognitive_runtime_c3',
    consumers: Object.freeze(['Release 2.1 performance económica']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Budget / CAPEX vestigial',
    owner: 'supply_budget',
    ownerDomain: 'supply',
    consumers: Object.freeze(['backlog CAPEX only']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Driver → Rate mapping (estrutura)',
    owner: 'finance_driver_model',
    ownerDomain: 'finance_readiness',
    consumers: Object.freeze(['FIN-EVOLVE-2.1', 'asset-cost-map']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Cost ↔ Asset structural link',
    owner: 'finance_asset_cost_map',
    ownerDomain: 'finance_readiness',
    consumers: Object.freeze(['FIN-EVOLVE-2.2 Twin overlay']),
    duplicationForbidden: true
  }),
  Object.freeze({
    information: 'Inventory economic valuation (adapter)',
    owner: 'finance_wms_valuation',
    ownerDomain: 'finance_readiness',
    consumers: Object.freeze(['FIN-EVOLVE-2.1/2.3']),
    duplicationForbidden: true,
    note: 'qty owner remains wms_inventory'
  })
]);

export function getOwnershipForInformation(informationSubstring) {
  const q = String(informationSubstring || '').toLowerCase();
  return FINANCE_DATA_OWNERSHIP.filter((r) => r.information.toLowerCase().includes(q));
}

export function validateFinanceDataOwnership() {
  const issues = [];
  for (const row of FINANCE_DATA_OWNERSHIP) {
    if (!row.duplicationForbidden) issues.push(`${row.information}: must forbid duplication`);
    if (!FINANCE_DATA_SOURCES.some((s) => s.id === row.owner)) {
      issues.push(`owner ${row.owner} not in inventory`);
    }
  }
  const ownersByInfo = {};
  for (const row of FINANCE_DATA_OWNERSHIP) {
    if (ownersByInfo[row.information]) {
      issues.push(`duplicated ownership row for ${row.information}`);
    }
    ownersByInfo[row.information] = row.owner;
  }
  return { valid: issues.length === 0, issues, rows: FINANCE_DATA_OWNERSHIP.length };
}
