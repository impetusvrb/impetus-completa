/**
 * FIN-PRED-READY-001 — Gap assessment for opening FIN-EVOLVE-2.4.
 */
import { FIN_PRED_READY_001_PHASE, PRED_READY_STATUS } from '../predReadyConstants.js';
import { PREDICTABLE_CAPABILITY_INVENTORY } from '../inventory/financePredictionInventory.js';
import { FINANCE_HISTORY_ASSESSMENT } from '../history/financeHistoryAssessment.js';
import { FORECAST_TARGET_MATRIX } from '../forecast-targets/forecastTargetMatrix.js';

export const PRED_READY_GAPS = Object.freeze([
  Object.freeze({
    id: 'GAP-PRED-001',
    title: 'Certified multi-period Finance cost history series',
    blocks: Object.freeze(['previsão financeira', 'previsão de custos']),
    status: PRED_READY_STATUS.PARTIAL,
    resolution: 'Declare official history export from industrial_cost_service scoped by company_id'
  }),
  Object.freeze({
    id: 'GAP-PRED-002',
    title: 'Leakage trend series contract',
    blocks: Object.freeze(['previsão de leakage']),
    status: PRED_READY_STATUS.PARTIAL,
    resolution: 'Extend financialLeakage with certified historical ranking/impact series'
  }),
  Object.freeze({
    id: 'GAP-PRED-003',
    title: 'Plant energy history + rates (GAP-FD-005)',
    blocks: Object.freeze(['previsão energética']),
    status: PRED_READY_STATUS.BLOCKED,
    resolution: 'Close plantRateProvider history before energy forecast composition'
  }),
  Object.freeze({
    id: 'GAP-PRED-004',
    title: 'MES production history export for Finance',
    blocks: Object.freeze(['previsão de custos', 'previsão de eficiência']),
    status: PRED_READY_STATUS.PARTIAL,
    resolution: 'Consume MES history via contract — do not duplicate qty in Finance'
  }),
  Object.freeze({
    id: 'GAP-PRED-005',
    title: 'Platform forecasting mount certification (GAP-FD-006)',
    blocks: Object.freeze(['previsão financeira']),
    status: PRED_READY_STATUS.BLOCKED,
    resolution: 'Either certify platform forecasting for Finance or compose a Finance-only consumer later'
  }),
  Object.freeze({
    id: 'GAP-PRED-006',
    title: 'Observed vs simulated vs forecast UI labelling',
    blocks: Object.freeze(['governança de apresentação']),
    status: PRED_READY_STATUS.READY,
    resolution: 'Contract defined in PREDICTION_LANE_CONTRACT — enforce in FIN-EVOLVE-2.4 UI'
  }),
  Object.freeze({
    id: 'GAP-PRED-007',
    title: 'Previsto × realizado backtest store',
    blocks: Object.freeze(['retroalimentação do modelo']),
    status: PRED_READY_STATUS.NOT_READY,
    resolution: 'Add audit-friendly comparison lane in 2.4 without mutating observed facts'
  })
]);

function countStatus(rows, key = 'readiness') {
  const out = { READY: 0, PARTIAL: 0, NOT_READY: 0, BLOCKED: 0 };
  for (const r of rows) {
    const s = r[key] || r.status;
    if (out[s] != null) out[s] += 1;
  }
  return out;
}

/**
 * Objective readiness for FIN-EVOLVE-2.4 prediction product.
 */
export function assessFinancePredictionReadiness() {
  const capabilities = countStatus(PREDICTABLE_CAPABILITY_INVENTORY);
  const history = countStatus(FINANCE_HISTORY_ASSESSMENT);
  const targets = countStatus(FORECAST_TARGET_MATRIX);
  const gaps = countStatus(PRED_READY_GAPS, 'status');

  const blockedGaps = PRED_READY_GAPS.filter((g) => g.status === PRED_READY_STATUS.BLOCKED);
  const hasBlockedHistory = history.BLOCKED > 0 || history.NOT_READY >= 3;

  /** Structural blockers for energy + platform forecasting keep product gate closed */
  const overall =
    blockedGaps.length === 0 && !hasBlockedHistory
      ? PRED_READY_STATUS.READY
      : blockedGaps.length > 0
        ? PRED_READY_STATUS.PARTIAL
        : PRED_READY_STATUS.PARTIAL;

  return Object.freeze({
    phase: FIN_PRED_READY_001_PHASE,
    principle: 'PREDICT WITHOUT DECIDING',
    overall,
    overallLabel:
      'PARTIAL — confidence/governance/contracts READY; historical series & energy/forecasting gaps keep FIN-EVOLVE-2.4 product closed',
    counts: Object.freeze({ capabilities, history, targets, gaps }),
    capabilityVerdicts: Object.freeze(
      PREDICTABLE_CAPABILITY_INVENTORY.map((c) =>
        Object.freeze({ id: c.id, readiness: c.readiness })
      )
    ),
    forecastTargetVerdicts: Object.freeze(
      FORECAST_TARGET_MATRIX.map((t) =>
        Object.freeze({ id: t.id, indicator: t.indicator, readiness: t.readiness })
      )
    ),
    gaps: PRED_READY_GAPS,
    blockedGaps: Object.freeze(blockedGaps.map((g) => g.id)),
    whatStillMissing: Object.freeze({
      previsao_financeira: PRED_READY_STATUS.PARTIAL,
      previsao_de_custos: PRED_READY_STATUS.PARTIAL,
      previsao_de_leakage: PRED_READY_STATUS.PARTIAL,
      previsao_energetica: PRED_READY_STATUS.BLOCKED,
      previsao_de_eficiencia: PRED_READY_STATUS.PARTIAL
    }),
    gate: Object.freeze({
      openFinEvolve24Prediction: false,
      openFinEvolve24: false,
      confidenceContractReady: true,
      governanceReady: true,
      explainabilityReady: true,
      semanticLanesReady: true,
      reason:
        'Close GAP-PRED-003 (energy history) and GAP-PRED-005 (forecasting certification) or accept scoped MVP excluding energy/platform forecasting before opening 2.4'
    }),
    consumersOnly: Object.freeze([
      'EconomicIntelligenceEngine',
      'FinancialTwinState',
      'WhatIfScenarioComposition',
      'READY contracts'
    ]),
    forbidden: Object.freeze([
      'implement_prediction',
      'machine_learning',
      'generative_ai',
      'auto_optimization',
      'alter_engine_2_1',
      'alter_twin_2_2',
      'alter_whatif_2_3'
    ])
  });
}

export function validatePredReadyGaps() {
  const issues = [];
  if (PRED_READY_GAPS.length < 5) issues.push('gaps incomplete');
  const assessment = assessFinancePredictionReadiness();
  if (assessment.gate.openFinEvolve24Prediction) {
    issues.push('2.4 prediction gate must stay closed in PRED-READY');
  }
  if (!assessment.gate.confidenceContractReady) issues.push('confidence must be ready as spec');
  if (!assessment.gate.governanceReady) issues.push('governance must be ready as spec');
  const missing = assessment.whatStillMissing;
  for (const k of Object.keys(missing)) {
    if (!Object.values(PRED_READY_STATUS).includes(missing[k])) {
      issues.push(`invalid missing status ${k}`);
    }
  }
  return { valid: issues.length === 0, issues, assessment };
}
