'use strict';

const phaseY = require('./config/phaseYFeatureFlags');
const { logPhaseY } = require('./phaseYLogger');

function computeOperationalMaturity(ctx = {}) {
  const usefulness = ctx.operational_usefulness?.aggregate_operational_usefulness ?? 0.75;
  const governance = ctx.controlled_activation?.readiness?.readiness_ok ? 0.88 : 0.72;
  const stabilization = ctx.runtime_stabilization ? 0.85 : 0.78;
  const enrichment = ctx.runtime_enrichment?.consolidated_signals?.density?.runtime_density_score ?? 0.75;
  const rolloutRaw = ctx.controlled_activation?.rollout_health;
  const rollout =
    typeof rolloutRaw === 'number' && Number.isFinite(rolloutRaw)
      ? rolloutRaw
      : typeof rolloutRaw === 'object' && rolloutRaw != null && Number.isFinite(Number(rolloutRaw.score))
        ? Number(rolloutRaw.score)
        : 0.8;

  const operational_maturity = Number(((usefulness + enrichment) / 2).toFixed(4));
  const governance_maturity = Number(governance.toFixed(4));
  const runtime_maturity = Number(((stabilization + rollout) / 2).toFixed(4));
  const stabilization_maturity = Number(
    (ctx.kpi_runtime_stabilization?.stable !== false ? 0.85 : 0.6).toFixed(4)
  );
  const rollout_maturity = Number(rollout.toFixed(4));

  const composite = Number(
    ((operational_maturity + governance_maturity + runtime_maturity + stabilization_maturity + rollout_maturity) / 5).toFixed(4)
  );

  if (composite < 0.65 && phaseY.isRuntimeCalibrationObservabilityEnabled()) {
    logPhaseY('WEAK_RUNTIME_MATURITY_DETECTED', { composite, shadow_only: true });
  }

  return {
    operational_maturity,
    governance_maturity,
    runtime_maturity,
    stabilization_maturity,
    rollout_maturity,
    composite_maturity: composite
  };
}

module.exports = { computeOperationalMaturity };
