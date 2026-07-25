/**
 * FIN-DATA-001 — Readiness matrices for Twin / Smart Costing / Predictive (READ ONLY).
 * Does NOT implement those capabilities — only readiness scoring.
 */
import { DATA_STATUS } from './financeDataInventory.js';

export const READINESS_LEVEL = Object.freeze({
  READY: 'ready',
  PARTIAL: 'partial',
  BLOCKED: 'blocked',
  NOT_READY: 'not_ready'
});

/** Financial Digital Twin (Release 2.2) — incremental over operational twin */
export const DIGITAL_TWIN_READINESS = Object.freeze({
  capability: 'financial_digital_twin',
  targetRelease: '2.2',
  principle: 'DATA BEFORE INTELLIGENCE',
  operationalTwinStatus: DATA_STATUS.AVAILABLE,
  financialLayerStatus: DATA_STATUS.PARTIAL,
  infrastructureReady: true,
  infrastructurePhase: 'FIN-READY-001',
  requiredSources: Object.freeze([
    Object.freeze({ sourceId: 'digital_twin', role: 'spatial/state base', status: DATA_STATUS.PARTIAL }),
    Object.freeze({ sourceId: 'industrial_cost_service', role: 'cost overlay', status: DATA_STATUS.AVAILABLE }),
    Object.freeze({ sourceId: 'financial_leakage', role: 'loss hotspots', status: DATA_STATUS.AVAILABLE }),
    Object.freeze({ sourceId: 'production_mes', role: 'machine drivers', status: DATA_STATUS.PARTIAL }),
    Object.freeze({ sourceId: 'iot_energy', role: 'energy drivers', status: DATA_STATUS.PARTIAL }),
    Object.freeze({ sourceId: 'scenario_engine', role: 'what-if shell', status: DATA_STATUS.PARTIAL }),
    Object.freeze({ sourceId: 'finance_asset_cost_map', role: 'cost↔asset links', status: DATA_STATUS.AVAILABLE })
  ]),
  gaps: Object.freeze([
    'No native $ attributes on twin nodes (product overlay — FIN-EVOLVE-2.2)',
    'Scenario engine is logistics-scoped',
    'Forecasting API incomplete vs client expectations'
  ]),
  closedBlockers: Object.freeze(['GAP-FD-004']),
  readiness: READINESS_LEVEL.PARTIAL,
  verdict:
    'FIN-READY-001 closed cost↔asset mapping. Twin product overlay still FIN-EVOLVE-2.2; remaining HIGH gaps (scenario/forecast) apply.'
});

/** Smart Costing (Release 2.1) */
export const SMART_COSTING_READINESS = Object.freeze({
  capability: 'smart_costing',
  targetRelease: '2.1',
  principle: 'DATA BEFORE INTELLIGENCE',
  infrastructureReady: true,
  infrastructurePhase: 'FIN-READY-001',
  requiredSources: Object.freeze([
    Object.freeze({ sourceId: 'industrial_cost_service', role: 'base cost items', status: DATA_STATUS.AVAILABLE }),
    Object.freeze({ sourceId: 'industrial_cost_impact_service', role: 'event→cost', status: DATA_STATUS.PARTIAL }),
    Object.freeze({ sourceId: 'production_mes', role: 'volume/utilization drivers', status: DATA_STATUS.PARTIAL }),
    Object.freeze({ sourceId: 'iot_energy', role: 'energy driver', status: DATA_STATUS.PARTIAL }),
    Object.freeze({ sourceId: 'wms_inventory', role: 'material qty', status: DATA_STATUS.AVAILABLE }),
    Object.freeze({ sourceId: 'finance_wms_valuation', role: 'material carrying $', status: DATA_STATUS.AVAILABLE }),
    Object.freeze({ sourceId: 'finance_driver_model', role: 'driver→rate contract', status: DATA_STATUS.AVAILABLE }),
    Object.freeze({ sourceId: 'economic_engines', role: 'economic pressure proxy', status: DATA_STATUS.PARTIAL })
  ]),
  gaps: Object.freeze([
    'Cost impact service not public-API certified (HIGH)',
    'Energy costing rates per plant still config (HIGH — contract structure ready)',
    'Hub KPI field aliases not normalized (compose risk)'
  ]),
  closedBlockers: Object.freeze(['GAP-FD-011', 'GAP-FD-003']),
  readiness: READINESS_LEVEL.PARTIAL,
  verdict:
    'FIN-READY-001 closed driver→rate + WMS valuation contracts. Smart Costing product still FIN-EVOLVE-2.1; remaining HIGH gaps apply.'
});

/** Predictive finance (Release 2.2+) */
export const PREDICTIVE_READINESS = Object.freeze({
  capability: 'predictive_finance',
  targetRelease: '2.2+',
  principle: 'DATA BEFORE INTELLIGENCE',
  requiredSources: Object.freeze([
    Object.freeze({ sourceId: 'forecasting', role: 'projections/alerts', status: DATA_STATUS.PARTIAL }),
    Object.freeze({ sourceId: 'financial_leakage', role: 'projected impact', status: DATA_STATUS.AVAILABLE }),
    Object.freeze({ sourceId: 'industrial_cost_service', role: 'projected-loss', status: DATA_STATUS.AVAILABLE }),
    Object.freeze({ sourceId: 'maintenance_manuia', role: 'failure→cost', status: DATA_STATUS.PARTIAL }),
    Object.freeze({ sourceId: 'recommendation_engine', role: 'actionable insights', status: DATA_STATUS.PARTIAL })
  ]),
  gaps: Object.freeze([
    'Forecasting routes incomplete vs frontend client',
    'No certified finance prediction model',
    'PdM→$ linkage absent',
    'Recommendation intents not finance-certified'
  ]),
  readiness: READINESS_LEVEL.NOT_READY,
  verdict: 'Short-horizon projected loss/leakage exist; full predictive finance not ready until forecasting contract and PdM-$ are certified.'
});

export function validateFinanceReadinessMatrix() {
  const issues = [];
  for (const block of [DIGITAL_TWIN_READINESS, SMART_COSTING_READINESS, PREDICTIVE_READINESS]) {
    if (!block.capability || !block.readiness || !block.verdict) {
      issues.push(`${block.capability || '?'}: incomplete readiness block`);
    }
    if (!block.requiredSources?.length) issues.push(`${block.capability}: no sources`);
    if (block.readiness === READINESS_LEVEL.READY) {
      issues.push(`${block.capability}: must not claim READY in FIN-DATA-001 (DATA BEFORE INTELLIGENCE)`);
    }
  }
  return { valid: issues.length === 0, issues };
}
