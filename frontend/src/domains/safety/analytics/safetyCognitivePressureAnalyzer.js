export function analyzeSafetyCognitivePressure(input = {}) {
  const m = Math.max(0, Number(input.menu_extra_count) || 0);
  const v = Math.max(0, Number(input.view_count) || 0);
  const cognitiveRiskScore = Math.min(100, m * 6 + v * 4);
  return {
    cognitive_risk_score: cognitiveRiskScore,
    operational_overload_score: Math.min(100, m * 5),
    dashboard_density_score: Math.min(100, v * 8),
    overload_detected: cognitiveRiskScore >= 78
  };
}
