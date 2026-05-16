'use strict';

const { buildRolloutExplainability } = require('../explainability/qualityRolloutExplainability');

const LEVELS = ['INITIAL', 'BASIC', 'STRUCTURED', 'CONTROLLED', 'OPTIMIZED', 'COGNITIVE_READY'];

function scoreOperationalMaturity(metrics = {}) {
  let score = 0;
  const weights = [
    ['workflow_completion_rate', 0.2],
    ['data_collection_completeness', 0.18],
    ['operational_consistency', 0.15],
    ['spc_usage_rate', 0.12],
    ['telemetry_coverage', 0.12],
    ['capa_closure_rate', 0.1],
    ['training_compliance', 0.08],
    ['cognitive_interaction_health', 0.05]
  ];
  for (const [k, wgt] of weights) {
    const v = metrics[k] != null ? Math.max(0, Math.min(1, Number(metrics[k]))) : 0;
    score += v * wgt;
  }
  score = Math.max(0, Math.min(1, score));

  let level = 'INITIAL';
  if (score >= 0.88) level = 'COGNITIVE_READY';
  else if (score >= 0.72) level = 'OPTIMIZED';
  else if (score >= 0.56) level = 'CONTROLLED';
  else if (score >= 0.4) level = 'STRUCTURED';
  else if (score >= 0.22) level = 'BASIC';

  const weak = [];
  if ((metrics.workflow_completion_rate ?? 0) < 0.5) weak.push('workflow_completion_rate');
  if ((metrics.telemetry_coverage ?? 0) < 0.35) weak.push('telemetry_coverage');
  if ((metrics.data_collection_completeness ?? 0) < 0.45) weak.push('data_collection_completeness');
  if ((metrics.spc_usage_rate ?? 0) < 0.3) weak.push('spc_usage_rate');

  const blockers = [];
  if (level === 'INITIAL' && score < 0.15) blockers.push('insufficient_operational_baseline');

  return {
    ok: true,
    maturity_score: score,
    maturity_level: level,
    maturity_confidence: Math.min(1, 0.35 + score * 0.65),
    weak_points: weak.slice(0, 12),
    readiness_blockers: blockers,
    levels_reference: LEVELS,
    emit_event: true,
    explainability: buildRolloutExplainability({
      rationale: 'Score ponderado de métricas operacionais declaradas pelo tenant (0–1).',
      adoption_evidence: Object.keys(metrics).slice(0, 20),
      operational_confidence: score
    })
  };
}

module.exports = { scoreOperationalMaturity, LEVELS };
