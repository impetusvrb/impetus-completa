'use strict';

const { buildCognitiveExplainability } = require('../explainability/qualityCognitiveExplainability');
const { linearRegression } = require('../../governance/spc/qualityTrendAnalysisEngine');

/**
 * Pré-anomalia operacional — proximidade a limites, declive em direcção a USL/LSL, pressão de variância.
 */
function predictAnomalyContext(signals = {}, opts = {}) {
  const values = Array.isArray(signals.process_values) ? signals.process_values.map(Number).filter(Number.isFinite) : [];
  const usl = signals.usl != null ? Number(signals.usl) : null;
  const lsl = signals.lsl != null ? Number(signals.lsl) : null;
  const subgroupMeans = Array.isArray(signals.spc_subgroup_means)
    ? signals.spc_subgroup_means.map(Number).filter(Number.isFinite)
    : [];

  const series = subgroupMeans.length >= values.length ? subgroupMeans : values;
  if (series.length < 4 && (usl == null || lsl == null)) {
    return {
      ok: false,
      error: 'insufficient_context',
      explainability: buildCognitiveExplainability({
        rationale: 'Dados insuficientes para estimar pré-anomalia sem limites explícitos.',
        confidence: 0
      })
    };
  }

  let proximityRisk = 0;
  let band = '';
  if (series.length && usl != null && lsl != null && Number.isFinite(usl) && Number.isFinite(lsl)) {
    const last = series[series.length - 1];
    const span = usl - lsl;
    const margin = span * (opts.margin_fraction ?? 0.08);
    if (last > usl - margin) {
      proximityRisk = (last - (usl - margin)) / (margin || 1);
      band = 'upper_pressure';
    } else if (last < lsl + margin) {
      proximityRisk = (lsl + margin - last) / (margin || 1);
      band = 'lower_pressure';
    }
  }

  const reg = linearRegression(
    series.map((_, i) => i),
    series
  );
  const slope = reg.error ? 0 : reg.slope;
  const directional =
    band === 'upper_pressure' && slope > (opts.slope_risk ?? 0.02)
      ? 0.35
      : band === 'lower_pressure' && slope < -(opts.slope_risk ?? 0.02)
        ? 0.35
        : Math.min(0.25, Math.abs(slope) * 5);

  const recurrenceHint = signals.recurrence_score != null ? Math.min(0.35, Number(signals.recurrence_score) * 0.4) : 0;
  const driftHint = signals.drift_confidence != null ? Math.min(0.35, Number(signals.drift_confidence) * 0.45) : 0;

  const preScore = Math.max(0, Math.min(1, proximityRisk * 0.45 + directional + recurrenceHint + driftHint));
  const severity = preScore > (opts.high ?? 0.7) ? 'high' : preScore > (opts.med ?? 0.45) ? 'medium' : 'low';

  return {
    ok: true,
    pre_anomaly_score: preScore,
    severity,
    band,
    slope_per_step: slope,
    emit_event: severity !== 'low' && preScore >= (opts.emit_min ?? 0.45),
    explainability: buildCognitiveExplainability({
      rationale: 'Combina proximidade a limites de especificação com declive da série e sinais de recorrência/drift.',
      evidence: [
        `n=${series.length}`,
        band ? `band=${band}` : 'band=none',
        `slope=${slope.toFixed(6)}`,
        `pre_score=${preScore.toFixed(3)}`
      ],
      score: preScore,
      confidence: Math.min(1, 0.35 + preScore),
      calculation: 'weighted_sum(proximity,directional,recurrence,drift)',
      limits: { usl, lsl },
      origin: 'quality_predictive_anomaly_engine'
    })
  };
}

module.exports = { predictAnomalyContext };
