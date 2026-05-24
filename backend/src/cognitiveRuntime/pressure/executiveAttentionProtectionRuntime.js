'use strict';

function protectExecutiveAttention(payload = {}, pressure = {}, fatigue = {}) {
  const execInsights = payload.executive_cognitive_runtime ? 1 : 0;
  const narrativeRisk = payload.executive_alignment_runtime?.narrative?.narrative_risk_level ?? 'low';
  const alertCount = pressure.alert_pressure > 0.5 ? 2 : 0;

  const executive_attention_pressure = Number(
    Math.min(1, pressure.executive_overload_risk * 0.5 + (fatigue.inferential_fatigue_score ?? 0) * 0.3 + execInsights * 0.1 + alertCount * 0.1).toFixed(3)
  );

  const suppressed_low_value_insights =
    narrativeRisk === 'high' || fatigue.narrative_redundancy
      ? ['executive_narrative_trim_advisory', 'low_value_causal_repeat']
      : [];

  const executive_focus_integrity = Number(
    Math.max(0, 1 - executive_attention_pressure * 0.6 - (narrativeRisk === 'high' ? 0.2 : 0)).toFixed(3)
  );

  const strategic_signal_quality = payload.executive_alignment_runtime?.executive_runtime_integrity ? 0.85 : 0.55;

  return {
    executive_attention_pressure,
    suppressed_low_value_insights,
    executive_focus_integrity,
    strategic_signal_quality: Number(strategic_signal_quality.toFixed(3)),
    auto_suppression_applied: false,
    auto_decisions: false
  };
}

module.exports = { protectExecutiveAttention };
