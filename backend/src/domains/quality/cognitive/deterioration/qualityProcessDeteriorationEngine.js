'use strict';

const { buildCognitiveExplainability } = require('../explainability/qualityCognitiveExplainability');

function _meanStd(values) {
  const n = values.length;
  if (!n) return { mean: null, std: null };
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const v = values.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  return { mean, std: Math.sqrt(v) };
}

/**
 * Degradação de processo — perda de estabilidade e deslocamento lento de dispersão.
 */
function detectDeterioration(series = [], defectRates = [], opts = {}) {
  const s = Array.isArray(series) ? series.map(Number).filter(Number.isFinite) : [];
  const d = Array.isArray(defectRates) ? defectRates.map(Number).filter(Number.isFinite) : [];
  if (s.length < 10 && d.length < 6) {
    return {
      ok: false,
      error: 'insufficient_series',
      explainability: buildCognitiveExplainability({
        rationale: 'Séries curtas demais para decomposição de degradação estável.',
        confidence: 0
      })
    };
  }

  const half = Math.max(3, Math.floor(s.length / 2));
  const A = _meanStd(s.slice(0, half));
  const B = _meanStd(s.slice(half));
  const stdRatio = A.std > 1e-9 ? B.std / A.std : B.std > 0 ? Infinity : 1;

  let defectSlope = 0;
  if (d.length >= 4) {
    const xs = d.map((_, i) => i);
    const my = d.reduce((a, b) => a + b, 0) / d.length;
    const mx = xs.reduce((a, b) => a + b, 0) / d.length;
    let num = 0;
    let den = 0;
    for (let i = 0; i < d.length; i++) {
      num += (xs[i] - mx) * (d[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    defectSlope = den === 0 ? 0 : num / den;
  }

  const deteriorationScore = Math.min(
    1,
    Math.max(0, (stdRatio > 1 ? Math.min(0.7, stdRatio - 1) : 0) + Math.max(0, defectSlope) * 2)
  );
  const severity =
    deteriorationScore > (opts.high ?? 0.65) ? 'high' : deteriorationScore > (opts.med ?? 0.38) ? 'medium' : 'low';

  return {
    ok: true,
    deterioration_score: deteriorationScore,
    deterioration_confidence: Math.min(1, 0.25 + deteriorationScore),
    std_ratio_second_first: stdRatio,
    defect_trend_slope: defectSlope,
    affected_dimensions: opts.dimension_labels && Array.isArray(opts.dimension_labels) ? opts.dimension_labels.slice(0, 16) : [],
    operational_impact:
      severity === 'high'
        ? 'Instabilidade potencialmente elevada — rever amostragem e setup.'
        : severity === 'medium'
          ? 'Aumento moderado de variabilidade ou defeitos — monitorização reforçada sugerida.'
          : 'Sem degradação forte detectada nos dados fornecidos.',
    emit_event: severity !== 'low' && deteriorationScore >= (opts.emit_min ?? 0.38),
    explainability: buildCognitiveExplainability({
      rationale: 'Rácio de desvio-padrão entre metades temporais da série + declive de taxa de defeitos.',
      evidence: [
        `n_process=${s.length}`,
        `std_ratio=${stdRatio.toFixed(4)}`,
        `defect_slope=${defectSlope.toFixed(6)}`
      ],
      score: deteriorationScore,
      confidence: Math.min(1, 0.3 + deteriorationScore * 0.7),
      calculation: 'std_second/std_first + positive_defect_slope',
      origin: 'quality_process_deterioration_engine'
    })
  };
}

module.exports = { detectDeterioration };
