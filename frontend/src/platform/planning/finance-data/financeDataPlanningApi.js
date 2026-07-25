/**
 * FIN-DATA-001 — Planning API (READ ONLY aggregation).
 */
import {
  FIN_DATA_001_PHASE,
  FIN_DATA_001_PRINCIPLE,
  FIN_DATA_001_SCOPE,
  FINANCE_DATA_SOURCES,
  DATA_STATUS,
  listDataSourcesByStatus,
  validateFinanceDataInventory
} from './financeDataInventory.js';
import { FINANCE_DATA_OWNERSHIP, validateFinanceDataOwnership } from './financeDataOwnership.js';
import { FINANCE_KPI_MATRIX, validateFinanceKpiMatrix } from './financeKpiMatrix.js';
import {
  DIGITAL_TWIN_READINESS,
  SMART_COSTING_READINESS,
  PREDICTIVE_READINESS,
  validateFinanceReadinessMatrix
} from './financeReadinessMatrix.js';
import { FINANCE_DATA_GAPS, buildGapSummary, validateFinanceGapAnalysis } from './financeGapAnalysis.js';
import { FINANCE_INSIGHT_MAPPING, validateFinanceInsightMapping } from './financeInsightsMapping.js';

export function getFinanceDataAudit() {
  return Object.freeze({
    phase: FIN_DATA_001_PHASE,
    principle: FIN_DATA_001_PRINCIPLE,
    scope: FIN_DATA_001_SCOPE,
    inventory: {
      sources: FINANCE_DATA_SOURCES,
      byStatus: {
        available: listDataSourcesByStatus(DATA_STATUS.AVAILABLE),
        partial: listDataSourcesByStatus(DATA_STATUS.PARTIAL),
        absent: listDataSourcesByStatus(DATA_STATUS.ABSENT)
      }
    },
    ownership: FINANCE_DATA_OWNERSHIP,
    kpiMatrix: FINANCE_KPI_MATRIX,
    insights: FINANCE_INSIGHT_MAPPING,
    readiness: {
      digitalTwin: DIGITAL_TWIN_READINESS,
      smartCosting: SMART_COSTING_READINESS,
      predictive: PREDICTIVE_READINESS
    },
    gaps: FINANCE_DATA_GAPS,
    gapSummary: buildGapSummary(),
    recommendations: Object.freeze([
      'FIN-READY-001 closed blockers GAP-FD-003/004/011 — re-evaluate FIN-EVOLVE-2.1 gate',
      'Remaining HIGH: impact API (GAP-FD-001), energy plant rates (GAP-FD-005), KPI aliases (GAP-FD-002)',
      'Do not implement Smart Costing / Twin in DATA or READY phases',
      'Preserve single ownership — valuation adapter must not duplicate WMS qty'
    ]),
    nextGate: Object.freeze({
      id: 'FIN-DATA-GATE',
      blockersClearedBy: 'FIN-READY-001',
      passCriteria: Object.freeze([
        'Inventory certified',
        'Blockers closed by FIN-READY-001',
        'No intelligence features in DATA/READY',
        'Stakeholder re-evaluation of 2.1 / 2.2'
      ]),
      blocks: Object.freeze(['FIN-EVOLVE-2.1 product', 'FIN-EVOLVE-2.2 twin product', 'predictive finance']),
      eligibleForReevaluation: Object.freeze(['FIN-EVOLVE-2.1', 'FIN-EVOLVE-2.2'])
    })
  });
}

export function validateFinanceDataPlanning() {
  const parts = [
    validateFinanceDataInventory(),
    validateFinanceDataOwnership(),
    validateFinanceKpiMatrix(),
    validateFinanceInsightMapping(),
    validateFinanceReadinessMatrix(),
    validateFinanceGapAnalysis()
  ];
  const issues = parts.flatMap((p) => p.issues || []);
  return {
    valid: parts.every((p) => p.valid) && issues.length === 0,
    issues,
    parts
  };
}
