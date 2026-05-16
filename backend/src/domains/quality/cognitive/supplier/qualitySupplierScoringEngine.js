'use strict';

const { buildSupplierScorecard } = require('../../governance/supplier/qualitySupplierScorecard');
const { buildCognitiveExplainability } = require('../explainability/qualityCognitiveExplainability');

/**
 * Pontuação dinâmica de fornecedor — base scorecard + tendência temporal simples (sem black-box).
 */
function scoreSupplierDynamics(supplierId, rows = [], opts = {}) {
  const id = supplierId != null ? String(supplierId).slice(0, 128) : 'unknown';
  const r = Array.isArray(rows) ? rows : [];
  if (!r.length) {
    return {
      ok: false,
      error: 'no_rows',
      explainability: buildCognitiveExplainability({
        rationale: 'Sem lotes inspeccionados — não há base para scoring dinâmico.',
        evidence: [`supplier=${id}`],
        confidence: 0
      })
    };
  }

  const base = buildSupplierScorecard(id, r);
  const mid = Math.max(1, Math.floor(r.length / 2));
  const first = buildSupplierScorecard(`${id}_a`, r.slice(0, mid));
  const second = buildSupplierScorecard(`${id}_b`, r.slice(mid));

  const ppmFirst = first.ppm;
  const ppmSecond = second.ppm;
  let trend = 'flat';
  if (ppmFirst != null && ppmSecond != null) {
    if (ppmSecond > ppmFirst * 1.15) trend = 'worsening';
    else if (ppmSecond < ppmFirst * 0.85) trend = 'improving';
  }

  const stability =
    base.quality_score_0_100 != null
      ? Math.max(0, 1 - Math.abs((ppmFirst || 0) - (ppmSecond || 0)) / (5000 + (ppmSecond || 0)))
      : null;

  const scoreChange =
    first.quality_score_0_100 != null && second.quality_score_0_100 != null
      ? second.quality_score_0_100 - first.quality_score_0_100
      : null;

  const emit =
    trend === 'worsening' &&
    second.ppm != null &&
    second.ppm > (opts.ppm_emit_threshold ?? 800) &&
    (scoreChange != null ? scoreChange < -(opts.score_drop_emit ?? 5) : true);

  return {
    ok: true,
    supplier_id: id,
    base_scorecard: base,
    segment_first: { ppm: ppmFirst, score: first.quality_score_0_100 },
    segment_second: { ppm: ppmSecond, score: second.quality_score_0_100 },
    trend,
    stability_index: stability,
    score_delta_second_minus_first: scoreChange,
    emit_event: !!emit,
    explainability: buildCognitiveExplainability({
      rationale: 'Score 0–100 derivado de PPM log-comprimido; tendência por comparação de metades temporais dos lotes.',
      evidence: [
        `lots=${r.length}`,
        `ppm_total=${base.ppm ?? 'n/a'}`,
        `trend=${trend}`,
        scoreChange != null ? `score_delta=${scoreChange.toFixed(2)}` : 'score_delta=n/a'
      ],
      score: base.quality_score_0_100,
      confidence: trend === 'worsening' ? 0.72 : trend === 'flat' ? 0.55 : 0.62,
      calculation: 'buildSupplierScorecard + ppm(first_half) vs ppm(second_half)',
      contributing_factors: [
        { factor: 'ppm_first', value: ppmFirst },
        { factor: 'ppm_second', value: ppmSecond },
        { factor: 'lot_rejection_pct', value: base.lot_rejection_pct }
      ],
      context: { advisory_only: true },
      origin: 'quality_supplier_scoring_engine'
    })
  };
}

module.exports = { scoreSupplierDynamics };
