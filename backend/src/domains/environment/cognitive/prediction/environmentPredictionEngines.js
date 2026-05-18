'use strict';

const { buildCognitiveExplainability } = require('../explainability/environmentCognitiveExplainability');
const { linearRegression, clamp01 } = require('../shared/environmentCognitiveStats');
const COG = require('../events/cognitiveEventHints');

function _seriesPredict(series, label, opts = {}) {
  const raw = Array.isArray(series) ? series.map(Number).filter(Number.isFinite) : [];
  if (raw.length < 6) {
    return {
      ok: false,
      error: 'insufficient_points',
      explainability: buildCognitiveExplainability({
        rationale: `${label}: série insuficiente.`,
        evidence: [`n=${raw.length}`],
        confidence: 0
      })
    };
  }
  const reg = linearRegression(
    raw.map((_, i) => i),
    raw
  );
  const slope = reg.slope || 0;
  const last = raw[raw.length - 1];
  const projected = last + slope * (opts.horizon_steps || 3);
  const severity = Math.abs(slope) > (opts.slope_high || 0.15) ? 'high' : Math.abs(slope) > (opts.slope_medium || 0.05) ? 'medium' : 'low';
  const probability = clamp01(0.35 + Math.abs(slope) * 2 + (severity === 'high' ? 0.25 : 0));
  return {
    ok: true,
    label,
    slope_per_step: slope,
    projected_value: projected,
    severity,
    probability,
    emit_event: severity !== 'low',
    explainability: buildCognitiveExplainability({
      rationale: `Tendência ${label} via regressão linear assistiva.`,
      evidence: [`last=${last}`, `projected=${projected.toFixed(3)}`, `slope=${slope.toFixed(4)}`],
      confidence: probability,
      calculation: 'linear_regression_shadow',
      related_event_hints: [COG.TREND_DETECTED]
    })
  };
}

function environmentRiskPredictionEngine(signals) {
  let score = 0;
  const factors = [];
  if ((signals.telemetry_anomaly_score || 0) > 0.5) {
    score += 0.3;
    factors.push('telemetry_anomaly');
  }
  if (signals.safety_chemical_exposure > 0.6) {
    score += 0.25;
    factors.push('safety_chemical');
  }
  const drift = environmentDriftPredictionEngine(signals.water_flow.length ? signals.water_flow : signals.effluent_ph);
  if (drift.ok && drift.severity === 'high') {
    score += 0.25;
    factors.push('environmental_drift');
  }
  score = clamp01(score);
  return {
    ok: true,
    environmental_risk_score: score,
    severity: score > 0.65 ? 'high' : score > 0.35 ? 'medium' : 'low',
    probability: score,
    emit_event: score > 0.55,
    factors,
    explainability: buildCognitiveExplainability({
      rationale: 'Score composto de risco ambiental (assistivo).',
      contributing_factors: factors,
      confidence: score,
      related_event_hints: [COG.RISK_PREDICTED]
    })
  };
}

function environmentDriftPredictionEngine(series, opts = {}) {
  const r = _seriesPredict(series, 'environmental_drift', opts);
  if (!r.ok) return r;
  return {
    ...r,
    drift_detected: r.severity !== 'low',
    related_event_hints: [COG.DRIFT_DETECTED]
  };
}

function environmentTrendPredictionEngine(series, opts = {}) {
  return _seriesPredict(series, 'operational_trend', opts);
}

function environmentOverflowPredictionEngine(levelSeries, capacity = 100) {
  const raw = Array.isArray(levelSeries) ? levelSeries.map(Number).filter(Number.isFinite) : [];
  if (!raw.length) return { ok: false, error: 'no_levels' };
  const last = raw[raw.length - 1];
  const cap = Number(capacity) || 100;
  const ratio = last / cap;
  const risk = clamp01(ratio > 0.85 ? 0.5 + (ratio - 0.85) * 3 : ratio * 0.3);
  return {
    ok: true,
    overflow_risk_score: risk,
    level_ratio: ratio,
    severity: ratio > 0.92 ? 'high' : ratio > 0.8 ? 'medium' : 'low',
    probability: risk,
    emit_event: ratio > 0.8,
    explainability: buildCognitiveExplainability({
      rationale: 'Risco de transbordo por nível vs capacidade declarada.',
      evidence: [`level=${last}`, `capacity=${cap}`, `ratio=${ratio.toFixed(3)}`],
      confidence: risk,
      related_event_hints: [COG.OVERFLOW_RISK]
    })
  };
}

function environmentEmissionPredictionEngine(series, limit) {
  const trend = _seriesPredict(series, 'emissions', { slope_high: 0.2 });
  if (!trend.ok) return trend;
  const lim = Number(limit);
  const excess =
    Number.isFinite(lim) && trend.projected_value > lim
      ? clamp01(0.4 + (trend.projected_value - lim) / Math.max(lim, 1))
      : trend.probability * 0.5;
  return {
    ...trend,
    excess_emission_risk: excess,
    limit: lim,
    emit_event: excess > 0.45,
    explainability: buildCognitiveExplainability({
      ...trend.explainability,
      rationale: 'Risco de excesso de emissões (projeção assistiva).',
      related_event_hints: [COG.EXCESS_EMISSION_RISK]
    })
  };
}

function environmentDeteriorationPredictionEngine(series) {
  const raw = Array.isArray(series) ? series.map(Number).filter(Number.isFinite) : [];
  if (raw.length < 8) return { ok: false, error: 'insufficient_points' };
  const mid = Math.floor(raw.length / 2);
  const first = raw.slice(0, mid);
  const second = raw.slice(mid);
  const m1 = first.reduce((s, v) => s + v, 0) / first.length;
  const m2 = second.reduce((s, v) => s + v, 0) / second.length;
  const v1 = first.reduce((s, x) => s + (x - m1) ** 2, 0) / first.length;
  const v2 = second.reduce((s, x) => s + (x - m2) ** 2, 0) / second.length;
  const ratio = v1 > 0 ? v2 / v1 : v2 > 0 ? 2 : 1;
  const score = clamp01((ratio - 1) * 0.4 + Math.abs(m2 - m1) * 0.1);
  return {
    ok: true,
    deterioration_score: score,
    variance_expansion_ratio: ratio,
    severity: score > 0.55 ? 'high' : score > 0.3 ? 'medium' : 'low',
    probability: score,
    emit_event: score > 0.35,
    explainability: buildCognitiveExplainability({
      rationale: 'Deterioração por expansão de variância entre janelas temporais.',
      evidence: [`var_ratio=${ratio.toFixed(3)}`, `delta_mean=${(m2 - m1).toFixed(3)}`],
      confidence: score
    })
  };
}

function environmentEnergyPredictionEngine(series) {
  return _seriesPredict(series, 'energy_demand', { slope_high: 0.12, slope_medium: 0.04 });
}

function environmentWastePredictionEngine(series) {
  return _seriesPredict(series, 'waste_generation', { slope_high: 0.1 });
}

module.exports = {
  environmentRiskPredictionEngine,
  environmentDriftPredictionEngine,
  environmentTrendPredictionEngine,
  environmentOverflowPredictionEngine,
  environmentEmissionPredictionEngine,
  environmentDeteriorationPredictionEngine,
  environmentEnergyPredictionEngine,
  environmentWastePredictionEngine
};
