'use strict';

function buildSafetyTelemetryCenter(bindings = []) {
  const tel = bindings.find((b) => b.block_id === 'sst.safety_telemetry');
  return {
    center_id: 'safety_telemetry',
    label: 'Telemetria SST',
    layer: 'operational',
    weight: 0.16,
    render_slot: 'grafico_tendencia',
    metrics: {
      incident_escalation: tel?.metrics?.incident_escalation === true,
      permit_violations: tel?.metrics?.permit_violations ?? 0,
      recurrence_trend: tel?.metrics?.recurrence_trend || 'stable',
      compliance_drift: tel?.metrics?.compliance_drift === true,
      unsafe_patterns: tel?.metrics?.unsafe_patterns ?? 0,
      risk_deterioration: tel?.metrics?.recurrence_trend === 'rising'
    },
    summary: tel?.summary || 'Telemetria operacional SST',
    ok: true
  };
}

module.exports = { buildSafetyTelemetryCenter };
