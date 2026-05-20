'use strict';

const phaseY = require('./config/phaseYFeatureFlags');
const { logPhaseY } = require('./phaseYLogger');

function consolidateRuntimeGaps(ctx = {}) {
  const gaps = {
    leakage: [],
    underdelivery: [],
    overdelivery: [],
    stale: [],
    weak_summaries: [],
    weak_reasoning: [],
    hierarchy_mismatch: []
  };

  if (ctx.runtime_enrichment?.low_density) gaps.underdelivery.push({ type: 'low_operational_density' });
  if (ctx.telemetry_integrity?.gaps_detected) {
    gaps.stale.push(...(ctx.telemetry_integrity.gaps || []).map((g) => ({ ...g, source: 'telemetry' })));
  }
  if (ctx.kpi_governance?.leakage?.detected) gaps.leakage.push({ source: 'kpi', count: ctx.kpi_governance.leakage.count });
  if (ctx.summary_governance?.leakage?.detected) gaps.leakage.push({ source: 'summary' });
  if (ctx.chat_alignment?.leakage?.detected) gaps.leakage.push({ source: 'chat' });
  if (ctx.kpi_hierarchy_delivery_integrity && !ctx.kpi_hierarchy_delivery_integrity.stable) {
    gaps.hierarchy_mismatch.push({ source: 'kpi' });
  }
  if (ctx.chat_reasoning_quality && !ctx.chat_reasoning_quality.stable) {
    gaps.weak_reasoning.push({ source: 'chat' });
  }
  if (ctx.summary_relevance?.summary_usefulness < 0.55) {
    gaps.weak_summaries.push({ source: 'summary' });
  }
  if (ctx.operational_signal_quality?.issues?.length > 5) {
    gaps.overdelivery.push({ type: 'signal_noise', count: ctx.operational_signal_quality.issues.length });
  }

  const total =
    gaps.leakage.length +
    gaps.underdelivery.length +
    gaps.overdelivery.length +
    gaps.stale.length +
    gaps.weak_summaries.length +
    gaps.weak_reasoning.length +
    gaps.hierarchy_mismatch.length;

  if (total >= 3 && phaseY.isRuntimeCalibrationObservabilityEnabled()) {
    logPhaseY('RUNTIME_CALIBRATION_REQUIRED', { gap_total: total, tenant_id: ctx.tenant_id, shadow_only: true });
  }

  return {
    gap_total: total,
    gaps,
    critical: gaps.hierarchy_mismatch.length > 0 || gaps.stale.some((g) => g.severity === 'critical')
  };
}

module.exports = { consolidateRuntimeGaps };
