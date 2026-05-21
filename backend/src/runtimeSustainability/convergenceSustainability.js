'use strict';

function assessConvergenceSustainability(ctx = {}) {
  const kpi = ctx.kpi_runtime_convergence?.convergence_score ?? ctx.kpi_governance_health?.health_score;
  const summary = ctx.summary_runtime_convergence?.convergence_score ?? ctx.summary_governance_health?.health_score;
  const scores = [kpi, summary].filter((s) => s != null);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.55;
  const preserved = avg >= 0.45;

  return {
    convergence_sustainability_score: avg,
    kpi_convergence: kpi,
    summary_convergence: summary,
    preserved,
    recommendation_only: true
  };
}

module.exports = { assessConvergenceSustainability };
