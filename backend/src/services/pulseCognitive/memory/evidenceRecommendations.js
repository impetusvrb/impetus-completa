/**
 * CERT-PULSE-05 FASE 3 — Recomendações baseadas exclusivamente em evidências históricas.
 */
'use strict';

const MIN_CONFIDENCE = 0.5;
const MIN_SIMILAR_CASES = 1;

const INSUFFICIENT_MSG =
  'Não existem evidências suficientes para recomendar ações baseadas em histórico organizacional.';

function formatHistoricalCase(caseRow) {
  const recorded = caseRow.recorded_at ? new Date(caseRow.recorded_at) : null;
  const monthYear = recorded
    ? recorded.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : 'período anterior';

  return {
    occurrence_label: monthYear.charAt(0).toUpperCase() + monthYear.slice(1),
    scope_label: caseRow.scope_label || caseRow.scope_key || 'Organização',
    scope_type: caseRow.scope_type,
    actions_executed: (caseRow.human_actions || []).map((a) =>
      typeof a === 'string' ? a : a.label || a.action || String(a)
    ),
    result_summary: caseRow.outcome?.summary || formatOutcomeDelta(caseRow.outcome_delta_percent),
    outcome_delta_percent: caseRow.outcome_delta_percent,
    similarity_score: caseRow.similarity_score,
    human_validated: caseRow.human_validated,
    disclaimer:
      'Histórico semelhante identificado — não constitui previsão. Decisão permanece humana.'
  };
}

function formatOutcomeDelta(delta) {
  if (delta == null || Number.isNaN(parseFloat(delta))) return 'Evolução registrada no histórico';
  const d = parseFloat(delta);
  const sign = d >= 0 ? 'Melhora' : 'Queda';
  return `${sign} de ${Math.abs(d).toFixed(1)}% no período subsequente`;
}

function buildEvidenceRecommendations(similarCases, currentContext = {}) {
  if (!similarCases || similarCases.length < MIN_SIMILAR_CASES) {
    return {
      ok: true,
      has_recommendations: false,
      message: INSUFFICIENT_MSG,
      similar_cases: [],
      recommendations: [],
      governance: {
        assistive_only: true,
        human_in_the_loop: true,
        not_a_prediction: true,
        ai_knows_when_it_does_not_know: true
      }
    };
  }

  const avgSimilarity =
    similarCases.reduce((s, c) => s + (c.similarity_score || 0), 0) / similarCases.length;

  if (avgSimilarity < MIN_CONFIDENCE) {
    return {
      ok: true,
      has_recommendations: false,
      message: INSUFFICIENT_MSG,
      similar_cases: similarCases.map(formatHistoricalCase),
      recommendations: [],
      confidence: Math.round(avgSimilarity * 1000) / 1000,
      governance: {
        assistive_only: true,
        human_in_the_loop: true,
        not_a_prediction: true,
        ai_knows_when_it_does_not_know: true
      }
    };
  }

  const actionFrequency = {};
  for (const c of similarCases) {
    for (const a of c.human_actions || []) {
      const key = typeof a === 'string' ? a : a.action || a.label || JSON.stringify(a);
      actionFrequency[key] = (actionFrequency[key] || 0) + 1;
    }
  }

  const recommendations = Object.entries(actionFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([action, count]) => ({
      action,
      historical_occurrences: count,
      rationale: `Ação registrada em ${count} caso(s) semelhante(s) com resultado documentado.`,
      confidence: Math.round(avgSimilarity * count * 100) / (similarCases.length * 100),
      evidence_type: 'organizational_memory'
    }));

  const validatedCount = similarCases.filter((c) => c.human_validated).length;

  return {
    ok: true,
    has_recommendations: recommendations.length > 0,
    message: 'Situação semelhante identificada no histórico organizacional.',
    similar_cases: similarCases.map(formatHistoricalCase),
    recommendations,
    confidence: Math.round(avgSimilarity * 1000) / 1000,
    validated_cases: validatedCount,
    current_context_summary: {
      pulse_index: currentContext.pulse_index,
      organizational_state: currentContext.organizational_state
    },
    governance: {
      assistive_only: true,
      human_in_the_loop: true,
      not_a_prediction: true,
      historical_only: true
    }
  };
}

module.exports = { buildEvidenceRecommendations, INSUFFICIENT_MSG, formatHistoricalCase };
