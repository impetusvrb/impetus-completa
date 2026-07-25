/**
 * PRED-BASE-001 — Gap closure plan + overall platform readiness.
 * Gap statuses updated when PRED-BASE-002 closes GAP-PB-005; GAP-PB-003 = coverage expansion.
 */
import { PRED_BASE_001_PHASE, PRED_BASE_001_PRINCIPLE, PRED_BASE_STATUS } from '../predBaseConstants.js';
import { PLATFORM_FORECASTING_INVENTORY } from '../inventory/platformForecastingInventory.js';
import { PLATFORM_HISTORY_ASSESSMENT } from '../history/platformHistoryAssessment.js';
import { PREDICTION_CONSUMER_MATRIX } from '../consumers/predictionConsumerMatrix.js';

export const PRED_BASE_GAPS = Object.freeze([
  Object.freeze({
    id: 'GAP-PB-003',
    title: 'Certified plant energy history series',
    mapsFrom: Object.freeze(['GAP-PRED-003', 'GAP-FD-005']),
    scope: 'platform_transversal',
    blocks: Object.freeze(['energy forecasts', 'Finance energy targets', 'Environment energy-linked']),
    status: PRED_BASE_STATUS.PARTIAL,
    resolutionPlan:
      'Coverage expansion after PRED-BASE-002 — does NOT block platform certification or FIN-EVOLVE-2.4 initial wave; own energy history under platform telemetry series'
  }),
  Object.freeze({
    id: 'GAP-PB-005',
    title: 'Certify operational forecasting as enterprise prediction mount',
    mapsFrom: Object.freeze(['GAP-PRED-005', 'GAP-FD-006']),
    scope: 'platform_transversal',
    blocks: Object.freeze([
      'all domain prediction consumers',
      'FIN-EVOLVE-2.4',
      'Maintenance/Production/Logistics forecast productization'
    ]),
    status: PRED_BASE_STATUS.READY,
    closedBy: 'PRED-BASE-002',
    resolutionPlan:
      'CLOSED — dashboard.forecasting.* certified under platform.prediction.v0 + public API + registry (PRED-BASE-002)'
  }),
  Object.freeze({
    id: 'GAP-PB-001',
    title: 'Multi-period cost history export for prediction consumers',
    mapsFrom: Object.freeze(['GAP-PRED-001']),
    scope: 'shared_ops_finance',
    blocks: Object.freeze(['cost forecasts']),
    status: PRED_BASE_STATUS.PARTIAL,
    resolutionPlan: 'Declare official history series from industrial_cost_service for platform consumers'
  }),
  Object.freeze({
    id: 'GAP-PB-002',
    title: 'Leakage trend history contract',
    mapsFrom: Object.freeze(['GAP-PRED-002']),
    scope: 'shared_ops_finance',
    blocks: Object.freeze(['leakage forecasts']),
    status: PRED_BASE_STATUS.PARTIAL,
    resolutionPlan: 'Extend leakage detector with certified historical series for platform.prediction consumers'
  }),
  Object.freeze({
    id: 'GAP-PB-006',
    title: 'AIOI forecast HTTP/enterprise exposure',
    mapsFrom: Object.freeze([]),
    scope: 'platform_transversal',
    blocks: Object.freeze(['unified capacity/SLA/risk prediction consumers']),
    status: PRED_BASE_STATUS.PARTIAL,
    resolutionPlan: 'Expose AIOI forecast services behind platform.prediction.v0 adapter'
  }),
  Object.freeze({
    id: 'GAP-PB-007',
    title: 'Domain-exclusive history for Quality / Safety',
    mapsFrom: Object.freeze([]),
    scope: 'domain_exclusive',
    blocks: Object.freeze(['Quality/Safety prediction consumers']),
    status: PRED_BASE_STATUS.DISCOVERED,
    resolutionPlan:
      'Remain domain-owned after platform baseline; certify per-domain history once GAP-PB-005 closed'
  }),
  Object.freeze({
    id: 'GAP-PB-008',
    title: 'Semantic lane enforcement across Command Center / Cognitive UIs',
    mapsFrom: Object.freeze(['GAP-PRED-006']),
    scope: 'platform_transversal',
    blocks: Object.freeze(['presentation governance']),
    status: PRED_BASE_STATUS.PARTIAL,
    resolutionPlan: 'Apply PLATFORM_SEMANTIC_LANES_CERTIFICATION to Centro Previsão and future prediction widgets'
  })
]);

function countStatus(rows, key = 'readiness') {
  const out = {
    READY: 0,
    PARTIAL: 0,
    DISCOVERED: 0,
    NOT_AVAILABLE: 0,
    BLOCKED: 0,
    NOT_READY: 0
  };
  for (const r of rows) {
    const s = r[key] || r.status;
    if (out[s] != null) out[s] += 1;
  }
  return out;
}

export function assessPlatformPredictionReadiness() {
  const inventory = countStatus(PLATFORM_FORECASTING_INVENTORY);
  const history = countStatus(PLATFORM_HISTORY_ASSESSMENT);
  const consumers = countStatus(PREDICTION_CONSUMER_MATRIX, 'consumerReadiness');
  const gaps = countStatus(PRED_BASE_GAPS, 'status');

  const blocked = PRED_BASE_GAPS.filter((g) => g.status === PRED_BASE_STATUS.BLOCKED);
  const domainExclusive = PRED_BASE_GAPS.filter((g) => g.scope === 'domain_exclusive');
  const transversal = PRED_BASE_GAPS.filter((g) => g.scope === 'platform_transversal');
  const gapPb005 = PRED_BASE_GAPS.find((g) => g.id === 'GAP-PB-005');
  const gapPb003 = PRED_BASE_GAPS.find((g) => g.id === 'GAP-PB-003');

  return Object.freeze({
    phase: PRED_BASE_001_PHASE,
    principle: PRED_BASE_001_PRINCIPLE,
    overall: PRED_BASE_STATUS.PARTIAL,
    overallLabel:
      'PARTIAL baseline (PRED-BASE-001) — GAP-PB-005 closed by PRED-BASE-002; GAP-PB-003 remains PARTIAL coverage expansion (not absolute platform blocker)',
    counts: Object.freeze({ inventory, history, consumers, gaps }),
    gaps: PRED_BASE_GAPS,
    blockedGaps: Object.freeze(blocked.map((g) => g.id)),
    transversalGaps: Object.freeze(transversal.map((g) => g.id)),
    domainExclusiveGaps: Object.freeze(domainExclusive.map((g) => g.id)),
    gapPb005Status: gapPb005?.status || null,
    gapPb005ClosedBy: gapPb005?.closedBy || null,
    gapPb003Status: gapPb003?.status || null,
    whatMustBeResolvedBeforeAnyDomainConsumes: Object.freeze([
      'PRED-BASE-002 platform certification (CERTIFY BEFORE CONSUME)',
      'GAP-PB-003 only for energy-linked forecasts (optional first-wave exclusion)'
    ]),
    domainExclusiveRemaining: Object.freeze([
      'GAP-PB-007 — Quality/Safety history after platform baseline'
    ]),
    gate: Object.freeze({
      openEnterprisePredictionConsumers: false,
      openFinEvolve24: false,
      openDomainPredictionProducts: false,
      deferGateTo: 'PRED-BASE-002',
      contractsFormalized: true,
      semanticLanesCertified: true,
      consumerMatrixReady: true,
      reason:
        'PRED-BASE-001 is the baseline inventory. Official consumer gate opens only after PRED-BASE-002 certification.'
    }),
    architectureDecision: Object.freeze({
      rejectFinanceOnlyMvp: true,
      rationale:
        'FIN-PRED blockers are platform-transversal; a Finance-only predictive MVP would fork patterns across domains'
    }),
    forbidden: Object.freeze([
      'implement_models',
      'train_ml',
      'domain_prediction_product',
      'alter_finance_2_1_2_2_2_3'
    ])
  });
}

export function validatePredBaseGaps() {
  const issues = [];
  if (PRED_BASE_GAPS.length < 5) issues.push('gaps incomplete');
  const a = assessPlatformPredictionReadiness();
  if (a.gate.openFinEvolve24) {
    issues.push('FIN-EVOLVE-2.4 must stay closed at PRED-BASE-001 layer (opens in PRED-BASE-002)');
  }
  if (a.gate.openDomainPredictionProducts) issues.push('domain prediction products must stay closed');
  if (!a.architectureDecision.rejectFinanceOnlyMvp) {
    issues.push('must reject Finance-only predictive MVP');
  }
  if (a.gapPb005Status !== PRED_BASE_STATUS.READY || a.gapPb005ClosedBy !== 'PRED-BASE-002') {
    issues.push('GAP-PB-005 must be READY closed by PRED-BASE-002');
  }
  if (a.gapPb003Status !== PRED_BASE_STATUS.PARTIAL) {
    issues.push('GAP-PB-003 must be PARTIAL coverage (not absolute BLOCKED)');
  }
  if (a.blockedGaps.includes('GAP-PB-005') || a.blockedGaps.includes('GAP-PB-003')) {
    issues.push('GAP-PB-003/005 must not remain BLOCKED');
  }
  if (!a.gate.contractsFormalized || !a.gate.semanticLanesCertified) {
    issues.push('contracts/lanes must be ready as specs');
  }
  return { valid: issues.length === 0, issues, assessment: a };
}
