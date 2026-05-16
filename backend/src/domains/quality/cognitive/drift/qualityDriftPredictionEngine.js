'use strict';

const { buildCognitiveExplainability } = require('../explainability/qualityCognitiveExplainability');
const { linearRegression } = require('../../governance/spc/qualityTrendAnalysisEngine');

function _ewmaSeries(values, alpha) {
  const a = Math.max(0.05, Math.min(0.95, alpha));
  const out = [];
  let e = values[0];
  for (let i = 0; i < values.length; i++) {
    e = a * values[i] + (1 - a) * e;
    out.push(e);
  }
  return out;
}

function _rollingVariance(values, window) {
  const w = Math.max(3, Math.min(window, values.length));
  if (values.length < w * 2) return { first: null, second: null };
  const variances = [];
  for (let i = 0; i <= values.length - w; i++) {
    const slice = values.slice(i, i + w);
    const m = slice.reduce((s, v) => s + v, 0) / w;
    const v = slice.reduce((s, x) => s + (x - m) ** 2, 0) / w;
    variances.push(v);
  }
  const mid = Math.floor(variances.length / 2);
  const first = variances.slice(0, mid);
  const second = variances.slice(mid);
  const vf = first.reduce((s, x) => s + x, 0) / first.length;
  const vs = second.reduce((s, x) => s + x, 0) / second.length;
  return { first: vf, second: vs, variance_ratio: vf > 0 ? vs / vf : vs > 0 ? Infinity : 1 };
}

/**
 * Predição de deriva industrial — EWMA, variância móvel, declive; sem ML pesado.
 * @param {number[]} series
 * @param {object} [opts]
 */
function predictDrift(series, opts = {}) {
  const raw = Array.isArray(series) ? series.map(Number).filter(Number.isFinite) : [];
  if (raw.length < 8) {
    return {
      ok: false,
      error: 'insufficient_points',
      explainability: buildCognitiveExplainability({
        rationale: 'Série demasiado curta para predição de drift estável.',
        evidence: [`n=${raw.length}`],
        confidence: 0
      })
    };
  }

  const alpha = opts.ewma_alpha ?? 0.25;
  const ew = _ewmaSeries(raw, alpha);
  const ewSlope = linearRegression(
    ew.map((_, i) => i),
    ew
  );
  const slope = ewSlope.error ? 0 : ewSlope.slope;

  const rv = _rollingVariance(raw, opts.variance_window ?? Math.min(7, Math.floor(raw.length / 3)));

  const meanDrift = (ew[ew.length - 1] - ew[0]) / (Math.abs(ew[0]) > 1e-9 ? Math.abs(ew[0]) : 1);

  const severity =
    Math.abs(slope) > (opts.slope_warn ?? 0.04) || (rv.variance_ratio && rv.variance_ratio > (opts.variance_ratio_warn ?? 1.35))
      ? 'high'
      : Math.abs(slope) > (opts.slope_watch ?? 0.015) || (rv.variance_ratio && rv.variance_ratio > (opts.variance_ratio_watch ?? 1.15))
        ? 'medium'
        : 'low';

  const confidence = Math.max(
    0,
    Math.min(
      1,
      Math.abs(slope) * 8 + (rv.variance_ratio ? Math.min(0.5, Math.max(0, rv.variance_ratio - 1)) : 0) + Math.min(0.35, Math.abs(meanDrift))
    )
  );

  const emit = severity !== 'low' && confidence >= (opts.emit_confidence_min ?? 0.35);

  return {
    ok: true,
    drift_severity: severity,
    drift_confidence: confidence,
    ewma_last: ew[ew.length - 1],
    ewma_first: ew[0],
    slope_per_step: slope,
    variance_expansion_ratio: rv.variance_ratio,
    rolling_var_first_segment: rv.first,
    rolling_var_second_segment: rv.second,
    emit_event: emit,
    explainability: buildCognitiveExplainability({
      rationale:
        'Combinação de declive EWMA, expansão de variância rolante e deslocamento médio para antecipar deterioração gradual.',
      evidence: [
        `n=${raw.length}`,
        `ewma_alpha=${alpha}`,
        `slope=${slope.toFixed(6)}`,
        rv.variance_ratio != null ? `variance_ratio=${rv.variance_ratio.toFixed(4)}` : 'variance_ratio=n/a'
      ],
      score: severity === 'high' ? 0.85 : severity === 'medium' ? 0.55 : 0.2,
      confidence,
      calculation: 'linear_regression_on_ewma + ratio_second_first_segment_variance',
      contributing_factors: [
        { factor: 'slope_ewma', value: slope },
        { factor: 'variance_ratio', value: rv.variance_ratio },
        { factor: 'mean_shift_relative', value: meanDrift }
      ],
      limits: { slope_warn: opts.slope_warn ?? 0.04, variance_ratio_warn: opts.variance_ratio_warn ?? 1.35 },
      origin: 'quality_drift_prediction_engine'
    })
  };
}

module.exports = { predictDrift };
