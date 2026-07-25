/**
 * FIN-READY-001 — Driver → Rate model contract (GAP-FD-011).
 * Infrastructure only: NO cost calculation, NO Smart Costing algorithms.
 * Principle: REMOVE BLOCKERS BEFORE CAPABILITIES
 */
export const FIN_READY_001_PHASE = 'FIN-READY-001';
export const FIN_READY_001_PRINCIPLE = 'REMOVE BLOCKERS BEFORE CAPABILITIES';

export const DRIVER_KINDS = Object.freeze({
  VOLUME: 'volume',
  UTILIZATION: 'utilization',
  ENERGY: 'energy',
  TIME: 'time',
  MATERIAL: 'material',
  LABOR: 'labor',
  LOSS: 'loss'
});

export const RATE_UNITS = Object.freeze({
  PER_UNIT: 'per_unit',
  PER_HOUR: 'per_hour',
  PER_KWH: 'per_kwh',
  PER_KG: 'per_kg',
  PER_EVENT: 'per_event',
  FIXED_PERIOD: 'fixed_period'
});

export const COST_CATEGORIES = Object.freeze({
  OPERATIONAL: 'operational',
  ENERGY: 'energy',
  MATERIAL: 'material',
  LABOR: 'labor',
  MAINTENANCE: 'maintenance',
  LOSS_LEAKAGE: 'loss_leakage',
  OVERHEAD: 'overhead'
});

/**
 * Canonical driver→rate mapping schema (data contract, not an engine).
 */
export const DRIVER_RATE_CONTRACT = Object.freeze({
  id: 'finance.driver_rate.v1',
  version: '1.0.0',
  phase: FIN_READY_001_PHASE,
  closesGap: 'GAP-FD-011',
  computesCosts: false,
  fields: Object.freeze([
    Object.freeze({ name: 'mapping_id', type: 'string', required: true }),
    Object.freeze({ name: 'driver_kind', type: 'enum:DRIVER_KINDS', required: true }),
    Object.freeze({ name: 'driver_source_id', type: 'string', required: true, note: 'inventory source id e.g. production_mes' }),
    Object.freeze({ name: 'driver_metric', type: 'string', required: true, note: 'e.g. units_produced, kwh, downtime_hours' }),
    Object.freeze({ name: 'rate_value', type: 'number', required: true, note: 'declared rate — not computed here' }),
    Object.freeze({ name: 'rate_unit', type: 'enum:RATE_UNITS', required: true }),
    Object.freeze({ name: 'currency', type: 'string', required: true, default: 'BRL' }),
    Object.freeze({ name: 'cost_category', type: 'enum:COST_CATEGORIES', required: true }),
    Object.freeze({ name: 'cost_origin_ref', type: 'string', required: false, note: 'links to industrial_cost by-origin label/id' }),
    Object.freeze({ name: 'plant_id', type: 'string', required: false }),
    Object.freeze({ name: 'valid_from', type: 'iso_date', required: false }),
    Object.freeze({ name: 'valid_to', type: 'iso_date', required: false }),
    Object.freeze({ name: 'owner', type: 'string', required: true, default: 'finance_driver_model' })
  ]),
  forbidden: Object.freeze([
    'unit_cost_calculation',
    'smart_costing_algorithm',
    'runtime_cost_engine',
    'dashboard_widgets'
  ])
});

/** Seed registry — declarative mappings for contract consumers (no calculation). */
export const DRIVER_RATE_REGISTRY = Object.freeze([
  Object.freeze({
    mapping_id: 'drv-volume-ops',
    driver_kind: DRIVER_KINDS.VOLUME,
    driver_source_id: 'production_mes',
    driver_metric: 'units_produced',
    rate_value: null,
    rate_unit: RATE_UNITS.PER_UNIT,
    currency: 'BRL',
    cost_category: COST_CATEGORIES.OPERATIONAL,
    cost_origin_ref: 'producao',
    plant_id: null,
    owner: 'finance_driver_model',
    status: 'contract_ready',
    note: 'rate_value filled by plant config at FIN-EVOLVE-2.1 — structure only'
  }),
  Object.freeze({
    mapping_id: 'drv-util-ops',
    driver_kind: DRIVER_KINDS.UTILIZATION,
    driver_source_id: 'production_mes',
    driver_metric: 'utilization_ratio',
    rate_value: null,
    rate_unit: RATE_UNITS.PER_HOUR,
    currency: 'BRL',
    cost_category: COST_CATEGORIES.OPERATIONAL,
    cost_origin_ref: 'utilizacao',
    owner: 'finance_driver_model',
    status: 'contract_ready'
  }),
  Object.freeze({
    mapping_id: 'drv-energy',
    driver_kind: DRIVER_KINDS.ENERGY,
    driver_source_id: 'iot_energy',
    driver_metric: 'kwh_consumed',
    rate_value: null,
    rate_unit: RATE_UNITS.PER_KWH,
    currency: 'BRL',
    cost_category: COST_CATEGORIES.ENERGY,
    cost_origin_ref: 'energia',
    owner: 'finance_driver_model',
    status: 'contract_ready'
  }),
  Object.freeze({
    mapping_id: 'drv-time-downtime',
    driver_kind: DRIVER_KINDS.TIME,
    driver_source_id: 'production_mes',
    driver_metric: 'downtime_hours',
    rate_value: null,
    rate_unit: RATE_UNITS.PER_HOUR,
    currency: 'BRL',
    cost_category: COST_CATEGORIES.LOSS_LEAKAGE,
    cost_origin_ref: 'parada',
    owner: 'finance_driver_model',
    status: 'contract_ready'
  }),
  Object.freeze({
    mapping_id: 'drv-material',
    driver_kind: DRIVER_KINDS.MATERIAL,
    driver_source_id: 'wms_inventory',
    driver_metric: 'material_qty_consumed',
    rate_value: null,
    rate_unit: RATE_UNITS.PER_UNIT,
    currency: 'BRL',
    cost_category: COST_CATEGORIES.MATERIAL,
    cost_origin_ref: 'material',
    owner: 'finance_driver_model',
    status: 'contract_ready',
    note: 'rate from valuation adapter (average cost) — not computed in READY-001'
  }),
  Object.freeze({
    mapping_id: 'drv-loss-leakage',
    driver_kind: DRIVER_KINDS.LOSS,
    driver_source_id: 'financial_leakage',
    driver_metric: 'leak_impact',
    rate_value: null,
    rate_unit: RATE_UNITS.PER_EVENT,
    currency: 'BRL',
    cost_category: COST_CATEGORIES.LOSS_LEAKAGE,
    cost_origin_ref: 'vazamento',
    owner: 'finance_driver_model',
    status: 'contract_ready'
  })
]);

export function listDriverMappings(filter = {}) {
  let rows = [...DRIVER_RATE_REGISTRY];
  if (filter.driver_kind) rows = rows.filter((r) => r.driver_kind === filter.driver_kind);
  if (filter.cost_category) rows = rows.filter((r) => r.cost_category === filter.cost_category);
  return rows;
}

export function getDriverMapping(mappingId) {
  return DRIVER_RATE_REGISTRY.find((r) => r.mapping_id === mappingId) ?? null;
}

export function validateDriverModel() {
  const issues = [];
  if (DRIVER_RATE_CONTRACT.computesCosts !== false) {
    issues.push('contract must not compute costs');
  }
  if (DRIVER_RATE_CONTRACT.closesGap !== 'GAP-FD-011') {
    issues.push('must close GAP-FD-011');
  }
  const ids = new Set();
  for (const row of DRIVER_RATE_REGISTRY) {
    if (ids.has(row.mapping_id)) issues.push(`duplicate ${row.mapping_id}`);
    ids.add(row.mapping_id);
    if (!Object.values(DRIVER_KINDS).includes(row.driver_kind)) {
      issues.push(`${row.mapping_id}: invalid driver_kind`);
    }
    if (!Object.values(COST_CATEGORIES).includes(row.cost_category)) {
      issues.push(`${row.mapping_id}: invalid cost_category`);
    }
    if (!row.driver_source_id || !row.driver_metric) {
      issues.push(`${row.mapping_id}: incomplete driver link`);
    }
  }
  if (DRIVER_RATE_REGISTRY.length < 5) issues.push('registry incomplete');
  return {
    valid: issues.length === 0,
    issues,
    gapClosed: issues.length === 0,
    gapId: 'GAP-FD-011',
    count: DRIVER_RATE_REGISTRY.length
  };
}
