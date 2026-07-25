/**
 * FIN-DATA-001 — Gap analysis for Finance data plane (READ ONLY).
 */
import { DATA_STATUS, FINANCE_DATA_SOURCES, listDataSourcesByStatus } from './financeDataInventory.js';
import { FINANCE_KPI_MATRIX } from './financeKpiMatrix.js';
import {
  DIGITAL_TWIN_READINESS,
  SMART_COSTING_READINESS,
  PREDICTIVE_READINESS,
  READINESS_LEVEL
} from './financeReadinessMatrix.js';

export const GAP_SEVERITY = Object.freeze({
  BLOCKER: 'blocker',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
});

export const FINANCE_DATA_GAPS = Object.freeze([
  Object.freeze({
    id: 'GAP-FD-001',
    title: 'Cost impact service not public-API certified',
    severity: GAP_SEVERITY.HIGH,
    blocks: Object.freeze(['2.1 Smart Costing']),
    sources: Object.freeze(['industrial_cost_impact_service']),
    remediation: 'Certify impact wiring via existing executive-summary; avoid new engine until contract published'
  }),
  Object.freeze({
    id: 'GAP-FD-002',
    title: 'Hub KPI field path mismatches (compose vs API)',
    severity: GAP_SEVERITY.HIGH,
    blocks: Object.freeze(['2.0 data quality', '2.1']),
    sources: Object.freeze(['industrial_cost_service']),
    remediation: 'Normalize in compose adapter only — do not change certified backend contract without FIN-EVOLVE scope'
  }),
  Object.freeze({
    id: 'GAP-FD-003',
    title: 'WMS inventory without monetary valuation',
    severity: GAP_SEVERITY.BLOCKER,
    blocks: Object.freeze(['2.3 inventory financial optimization', '2.1 material carrying']),
    sources: Object.freeze(['wms_inventory']),
    remediation: 'Define valuation adapter owned by Finance consuming WMS qty — no duplicate stock master',
    resolutionStatus: 'closed',
    closedBy: 'FIN-READY-001',
    closedEvidence: 'finance.wms_valuation.v1'
  }),
  Object.freeze({
    id: 'GAP-FD-004',
    title: 'No cost↔asset mapping for Financial Twin',
    severity: GAP_SEVERITY.BLOCKER,
    blocks: Object.freeze(['2.2 Financial Digital Twin']),
    sources: Object.freeze(['digital_twin', 'industrial_cost_service']),
    remediation: 'Incremental overlay table / join contract before twin UI',
    resolutionStatus: 'closed',
    closedBy: 'FIN-READY-001',
    closedEvidence: 'finance.asset_cost_map.v1'
  }),
  Object.freeze({
    id: 'GAP-FD-005',
    title: 'Energy costing not standardized',
    severity: GAP_SEVERITY.HIGH,
    blocks: Object.freeze(['2.1 Smart Costing energy driver']),
    sources: Object.freeze(['iot_energy']),
    remediation: 'Plant-scoped energy rate contract; reuse edge telemetry owner'
  }),
  Object.freeze({
    id: 'GAP-FD-006',
    title: 'Forecasting API incomplete vs client',
    severity: GAP_SEVERITY.HIGH,
    blocks: Object.freeze(['2.2 predictive']),
    sources: Object.freeze(['forecasting']),
    remediation: 'Align live mounts (projections/alerts/health) before new forecast engines'
  }),
  Object.freeze({
    id: 'GAP-FD-007',
    title: 'Scenario engine logistics-only',
    severity: GAP_SEVERITY.MEDIUM,
    blocks: Object.freeze(['2.2 what-if financeiro']),
    sources: Object.freeze(['scenario_engine']),
    remediation: 'Financial overlay on CPL scenario shell — do not fork scenario engine'
  }),
  Object.freeze({
    id: 'GAP-FD-008',
    title: 'CAPEX / budget vestigial in Supply',
    severity: GAP_SEVERITY.MEDIUM,
    blocks: Object.freeze(['backlog CAPEX']),
    sources: Object.freeze(['supply_budget']),
    remediation: 'Keep backlog; no greenfield CAPEX until ownership certified'
  }),
  Object.freeze({
    id: 'GAP-FD-009',
    title: 'Nexus wallet admin-gated for CFO hub',
    severity: GAP_SEVERITY.MEDIUM,
    blocks: Object.freeze(['2.0 billing KPI completeness']),
    sources: Object.freeze(['nexus_wallet']),
    remediation: 'Soft-fail acceptable; optional finance-scoped read for CFO profile in later evolve'
  }),
  Object.freeze({
    id: 'GAP-FD-010',
    title: 'PdM → financial ROI absent',
    severity: GAP_SEVERITY.HIGH,
    blocks: Object.freeze(['2.3 PdM financeira', 'predictive']),
    sources: Object.freeze(['maintenance_manuia']),
    remediation: 'Map failure cost using industrial_cost_service — reuse ManuIA owner'
  }),
  Object.freeze({
    id: 'GAP-FD-011',
    title: 'No driver→rate model for Smart Costing',
    severity: GAP_SEVERITY.BLOCKER,
    blocks: Object.freeze(['2.1 Smart Costing']),
    sources: Object.freeze(['industrial_cost_service', 'production_mes', 'iot_energy']),
    remediation: 'Publish driver contract before any Smart Costing UI',
    resolutionStatus: 'closed',
    closedBy: 'FIN-READY-001',
    closedEvidence: 'finance.driver_rate.v1'
  }),
  Object.freeze({
    id: 'GAP-FD-012',
    title: 'Economic engines are proxy (erp_integrated false)',
    severity: GAP_SEVERITY.MEDIUM,
    blocks: Object.freeze(['2.1 performance económica']),
    sources: Object.freeze(['economic_engines']),
    remediation: 'Document as proxy; do not present as ERP P&L'
  })
]);

export function buildGapSummary() {
  const bySeverity = {
    [GAP_SEVERITY.BLOCKER]: FINANCE_DATA_GAPS.filter((g) => g.severity === GAP_SEVERITY.BLOCKER),
    [GAP_SEVERITY.HIGH]: FINANCE_DATA_GAPS.filter((g) => g.severity === GAP_SEVERITY.HIGH),
    [GAP_SEVERITY.MEDIUM]: FINANCE_DATA_GAPS.filter((g) => g.severity === GAP_SEVERITY.MEDIUM),
    [GAP_SEVERITY.LOW]: FINANCE_DATA_GAPS.filter((g) => g.severity === GAP_SEVERITY.LOW)
  };
  const closedBlockers = bySeverity[GAP_SEVERITY.BLOCKER].filter((g) => g.resolutionStatus === 'closed');
  const openBlockers = bySeverity[GAP_SEVERITY.BLOCKER].filter((g) => g.resolutionStatus !== 'closed');
  return {
    total: FINANCE_DATA_GAPS.length,
    blockers: bySeverity[GAP_SEVERITY.BLOCKER].length,
    blockersClosed: closedBlockers.length,
    blockersOpen: openBlockers.length,
    high: bySeverity[GAP_SEVERITY.HIGH].length,
    medium: bySeverity[GAP_SEVERITY.MEDIUM].length,
    bySeverity,
    closedBlockerIds: closedBlockers.map((g) => g.id),
    sourceStatus: {
      available: listDataSourcesByStatus(DATA_STATUS.AVAILABLE).length,
      partial: listDataSourcesByStatus(DATA_STATUS.PARTIAL).length,
      absent: listDataSourcesByStatus(DATA_STATUS.ABSENT).length,
      total: FINANCE_DATA_SOURCES.length
    },
    kpiPartial: FINANCE_KPI_MATRIX.filter((k) => k.status === DATA_STATUS.PARTIAL).length,
    readiness: {
      twin: DIGITAL_TWIN_READINESS.readiness,
      smartCosting: SMART_COSTING_READINESS.readiness,
      predictive: PREDICTIVE_READINESS.readiness
    },
    gate: {
      openSmartCosting: false,
      openFinancialTwin: false,
      openPredictive: false,
      blockersCleared: openBlockers.length === 0,
      reevaluationEligible: Object.freeze({ '2.1': true, '2.2': true }),
      reason:
        openBlockers.length === 0
          ? 'FIN-READY-001 closed GAP-FD-003/004/011 — product gates still closed until FIN-EVOLVE (remaining HIGH gaps apply)'
          : 'DATA BEFORE INTELLIGENCE — close blockers GAP-FD-003/004/011 and certify contracts first'
    }
  };
}

export function validateFinanceGapAnalysis() {
  const issues = [];
  if (FINANCE_DATA_GAPS.length < 10) issues.push('gap list too short');
  const ids = new Set();
  for (const g of FINANCE_DATA_GAPS) {
    if (ids.has(g.id)) issues.push(`duplicate ${g.id}`);
    ids.add(g.id);
    if (!g.remediation) issues.push(`${g.id} missing remediation`);
  }
  const summary = buildGapSummary();
  if (summary.gate.openSmartCosting) issues.push('gate must keep Smart Costing closed');
  if (SMART_COSTING_READINESS.readiness === READINESS_LEVEL.READY) {
    issues.push('Smart Costing must not be READY (product still FIN-EVOLVE)');
  }
  for (const id of ['GAP-FD-003', 'GAP-FD-004', 'GAP-FD-011']) {
    const g = FINANCE_DATA_GAPS.find((x) => x.id === id);
    if (!g || g.resolutionStatus !== 'closed' || g.closedBy !== 'FIN-READY-001') {
      issues.push(`${id} must be closed by FIN-READY-001`);
    }
  }
  return { valid: issues.length === 0, issues, summary };
}
