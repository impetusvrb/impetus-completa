'use strict';

function buildQualityOperationalMetrics(bindings = [], signalBundle = {}) {
  const metrics = {
    open_nc: signalBundle.operational?.open_nc ?? null,
    sectors_monitored: (signalBundle.operational?.sector_breakdown || []).length,
    binding_count: bindings.filter((b) => b.bridge_status === 'bound_z20').length
  };

  for (const b of bindings) {
    if (!b.metrics) continue;
    if (b.block_id === 'quality.spc_monitor') {
      metrics.drift_severity = b.metrics.drift_severity;
      metrics.drift_confidence = b.metrics.drift_confidence;
    }
    if (b.block_id === 'quality.recurrence_analysis') {
      metrics.recurrence_severity = b.metrics.recurrence_severity;
      metrics.dominant_recurrence_key = b.metrics.dominant_key;
    }
    if (b.block_id === 'quality.process_stability') {
      metrics.deterioration_score = b.metrics.deterioration_score;
    }
    if (b.block_id === 'quality.audit_governance') {
      metrics.compliance_proxy_score = b.metrics.compliance_proxy_score;
    }
  }

  return {
    domain: 'quality',
    metrics,
    assistive_only: true,
    source: 'z21_quality_operational_metrics'
  };
}

module.exports = { buildQualityOperationalMetrics };
