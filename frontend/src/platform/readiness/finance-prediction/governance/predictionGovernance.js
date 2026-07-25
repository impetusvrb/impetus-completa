/**
 * FIN-PRED-READY-001 — Prediction governance rules (documentation/contract only).
 */
import {
  FIN_PRED_READY_001_PHASE,
  FIN_PRED_READY_001_PRINCIPLE,
  PREDICTION_SEMANTIC_LANES
} from '../predReadyConstants.js';

export const PREDICTION_GOVERNANCE = Object.freeze({
  id: 'finance.prediction_governance.v0',
  phase: FIN_PRED_READY_001_PHASE,
  principle: FIN_PRED_READY_001_PRINCIPLE,
  implementsEngine: false,
  rules: Object.freeze([
    Object.freeze({
      id: 'GOV-PRED-001',
      topic: 'versionamento',
      rule: 'Every forecast instance must carry model_version + contract_version + created_at'
    }),
    Object.freeze({
      id: 'GOV-PRED-002',
      topic: 'auditoria',
      rule: 'Emit finance.prediction.* observability events; retain evidence_refs for audit window'
    }),
    Object.freeze({
      id: 'GOV-PRED-003',
      topic: 'rastreabilidade',
      rule: 'Trace must link target_indicator → history sources → confidence → explanation'
    }),
    Object.freeze({
      id: 'GOV-PRED-004',
      topic: 'descarte',
      rule: 'Expired / superseded forecasts must be discardable without mutating observed_fact stores'
    }),
    Object.freeze({
      id: 'GOV-PRED-005',
      topic: 'reprodutibilidade',
      rule: 'Same inputs + model_version must be re-runnable for audit; no silent online drift'
    }),
    Object.freeze({
      id: 'GOV-PRED-006',
      topic: 'previsto_vs_realizado',
      rule: 'Mandatory backtest lane: compare forecast_prediction vs later observed_fact; never vs simulated_scenario alone'
    }),
    Object.freeze({
      id: 'GOV-PRED-007',
      topic: 'separacao_semantica',
      rule: `UI/API must label lanes distinctly: ${Object.values(PREDICTION_SEMANTIC_LANES).join(' | ')}`
    }),
    Object.freeze({
      id: 'GOV-PRED-008',
      topic: 'predict_without_deciding',
      rule: 'Predictions must not auto-execute decisions, mutate operational state, or replace operator approval'
    })
  ]),
  forbiddenActions: Object.freeze([
    'auto_decision',
    'auto_execution',
    'mutate_operational_state',
    'overwrite_observed_fact',
    'train_on_whatif_as_fact',
    'ungoverned_continuous_learning'
  ])
});

export function listPredictionGovernanceRules() {
  return PREDICTION_GOVERNANCE.rules;
}

export function validatePredictionGovernance() {
  const issues = [];
  if (PREDICTION_GOVERNANCE.implementsEngine) issues.push('governance must not implement engine');
  if (PREDICTION_GOVERNANCE.rules.length < 8) issues.push('governance rules incomplete');
  const topics = new Set(PREDICTION_GOVERNANCE.rules.map((r) => r.topic));
  for (const t of [
    'versionamento',
    'auditoria',
    'rastreabilidade',
    'descarte',
    'reprodutibilidade',
    'previsto_vs_realizado'
  ]) {
    if (!topics.has(t)) issues.push(`missing topic ${t}`);
  }
  if (!PREDICTION_GOVERNANCE.forbiddenActions.includes('auto_decision')) {
    issues.push('must forbid auto_decision');
  }
  return {
    valid: issues.length === 0,
    issues,
    phase: FIN_PRED_READY_001_PHASE
  };
}
