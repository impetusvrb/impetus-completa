'use strict';

function buildQualityTelemetryCenter(bindings = []) {
  const spc = bindings.find((b) => b.block_id === 'quality.spc_monitor');
  const stab = bindings.find((b) => b.block_id === 'quality.process_stability');
  const det = bindings.find((b) => b.block_id === 'quality.process_stability') || bindings.find((b) => b.block_id === 'quality.spc_monitor');

  const drift = spc?.metrics?.drift_severity || 'stable';
  const conf = spc?.metrics?.drift_confidence ?? 0;

  return {
    center_id: 'quality_telemetry_spc',
    label: 'Telemetria SPC',
    layer: 'operational',
    weight: 0.2,
    render_slot: 'grafico_tendencia',
    metrics: {
      drift_severity: drift,
      drift_confidence: conf,
      cp_proxy: conf > 0.7 ? 1.45 : 1.1,
      cpk_proxy: conf > 0.7 ? 1.32 : 0.95,
      lot_stability: drift === 'stable' ? 'stable' : 'watch',
      dimensional_trend: spc?.metrics?.slope_per_step != null ? spc.metrics.slope_per_step : 0,
      deterioration_flag: drift === 'high' || drift === 'critical',
      spc_alarms: drift === 'stable' ? 0 : Math.max(1, Math.round(conf * 3))
    },
    summary: spc?.summary || 'Monitor SPC — telemetria de processo',
    ok: spc?.ok !== false
  };
}

module.exports = { buildQualityTelemetryCenter };
