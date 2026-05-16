'use strict';

/**
 * Score preditivo de risco operacional — agregação linear transparente.
 */
function computePredictiveRiskScore(components = {}) {
  const w = {
    drift: 0.22,
    recurrence: 0.22,
    supplier: 0.12,
    pre_anomaly: 0.22,
    deterioration: 0.22
  };
  const d = Math.max(0, Math.min(1, Number(components.drift_confidence || 0)));
  const r = Math.max(0, Math.min(1, Number(components.recurrence_score || 0)));
  const s = components.supplier_worsening ? 0.85 : 0.15;
  const a = Math.max(0, Math.min(1, Number(components.pre_anomaly_score || 0)));
  const p = Math.max(0, Math.min(1, Number(components.deterioration_score || 0)));
  const score = w.drift * d + w.recurrence * r + w.supplier * s + w.pre_anomaly * a + w.deterioration * p;
  return {
    predictive_risk_score: Math.max(0, Math.min(1, score)),
    weights: w,
    inputs: { drift: d, recurrence: r, supplier_penalty: s, pre_anomaly: a, deterioration: p },
    calculation: 'weighted_linear_mix',
    assistive_only: true
  };
}

module.exports = { computePredictiveRiskScore };
