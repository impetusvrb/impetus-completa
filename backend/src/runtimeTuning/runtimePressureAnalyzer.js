'use strict';

const flags = require('./config/runtimeTuningFeatureFlags');
const { logRuntimeTuning } = require('./runtimeTuningLogger');

function analyzeRuntimePressure(ctx = {}) {
  const signals = [];
  let pressure_score = 0.2;

  const gapTotal = ctx.runtime_calibration?.gap_total ?? ctx.gaps?.gap_total ?? 0;
  if (gapTotal >= 3) {
    signals.push({ type: 'runtime_pressure', gap_total: gapTotal });
    pressure_score += 0.15;
  }

  const channels = ctx.tenant_rollout?.active_channels?.length ?? ctx.controlled_activation?.channels?.length ?? 0;
  const shadowLayers = [
    ctx.runtime_enrichment,
    ctx.precision_delivery,
    ctx.contextual_delivery,
    ctx.runtime_consistency,
    ctx.runtime_calibration
  ].filter(Boolean).length;

  if (shadowLayers >= 4 && !flags.isOperationalRuntimeTuningEnabled()) {
    signals.push({ type: 'shadow_overload', layers: shadowLayers });
    pressure_score += 0.12;
    if (flags.isRuntimeTuningObservabilityEnabled()) {
      logRuntimeTuning('RUNTIME_OVERLOAD_DETECTED', { layers: shadowLayers, shadow_only: true });
    }
  }

  if (channels >= 2 && ctx.tenant_stabilization?.stable === false) {
    signals.push({ type: 'governance_fatigue', channels });
    pressure_score += 0.18;
    if (flags.isRuntimeTuningObservabilityEnabled()) {
      logRuntimeTuning('GOVERNANCE_FATIGUE_DETECTED', { channels, tenant_id: ctx.tenant_id, shadow_only: true });
    }
  }

  if (ctx.operational_maturity?.composite_maturity < 0.65) {
    pressure_score += 0.1;
    signals.push({ type: 'maturity_pressure' });
  }

  pressure_score = Number(Math.min(1, pressure_score + gapTotal * 0.04).toFixed(4));

  if (pressure_score >= 0.55 && flags.isRuntimeTuningObservabilityEnabled()) {
    logRuntimeTuning('RUNTIME_PRESSURE_DETECTED', {
      pressure_score,
      tenant_id: ctx.tenant_id,
      signal_count: signals.length,
      shadow_only: true
    });
  }

  return {
    runtime_pressure: pressure_score >= 0.5,
    pressure_score,
    governance_fatigue: signals.some((s) => s.type === 'governance_fatigue'),
    runtime_overload: signals.some((s) => s.type === 'shadow_overload' || s.type === 'runtime_pressure'),
    shadow_overload: signals.some((s) => s.type === 'shadow_overload'),
    signals,
    auto_remediate: false
  };
}

module.exports = { analyzeRuntimePressure };
